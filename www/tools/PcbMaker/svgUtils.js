/**
 * svgUtils.js — Shared SVG parsing and manipulation utilities for PcbMaker.
 * Extracted from pcb-maker.js to be importable by parsers and exporters.
 */
import polygonClipping from 'https://esm.sh/polygon-clipping';

// -- Curve linearization helpers --

function linearizeQuadBezier(x0, y0, cx, cy, x1, y1, segments = 10) {
  const points = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    points.push([
      mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
      mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
    ]);
  }
  return points;
}

// SVG arc endpoint-to-center parameterization → line segments.
// Follows the SVG spec: https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter
function linearizeArc(x0, y0, rx, ry, xRotDeg, largeArc, sweep, x1, y1, segments = 20) {
  // Degenerate: zero radii or same point → straight line.
  if ((rx === 0 && ry === 0) || (x0 === x1 && y0 === y1)) {
    return [[x1, y1]];
  }
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  const phi = (xRotDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1') — rotated midpoint.
  const dx = (x0 - x1) / 2;
  const dy = (y0 - y1) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Step 2: Correct radii if too small.
  let rx2 = rx * rx, ry2 = ry * ry;
  const x1p2 = x1p * x1p, y1p2 = y1p * y1p;
  const lambda = x1p2 / rx2 + y1p2 / ry2;
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s; ry *= s;
    rx2 = rx * rx; ry2 = ry * ry;
  }

  // Step 3: Compute center point (cx', cy').
  const num = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2);
  const den = rx2 * y1p2 + ry2 * x1p2;
  const sq = Math.sqrt(num / den);
  const sign = (largeArc === sweep) ? -1 : 1;
  const cxp = sign * sq * (rx * y1p / ry);
  const cyp = sign * sq * -(ry * x1p / rx);

  // Step 4: Compute center (cx, cy) in original coords.
  const ccx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2;
  const ccy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2;

  // Step 5: Compute start and sweep angles.
  const angle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };

  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = angle(
    (x1p - cxp) / rx, (y1p - cyp) / ry,
    (-x1p - cxp) / rx, (-y1p - cyp) / ry
  );

  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;

  // Step 6: Emit points along the arc.
  const points = [];
  for (let i = 1; i <= segments; i++) {
    const t = theta1 + (i / segments) * dtheta;
    const ex = Math.cos(t) * rx;
    const ey = Math.sin(t) * ry;
    points.push([
      cosPhi * ex - sinPhi * ey + ccx,
      sinPhi * ex + cosPhi * ey + ccy,
    ]);
  }
  return points;
}

// -- Geometry helpers --

export function boundingBoxArea(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return (maxX - minX) * (maxY - minY);
}

// Remove consecutive duplicate points (within tolerance).
export function dedup(pts, eps = 1e-6) {
  return pts.filter((p, i) => {
    if (i === 0) return true;
    const prev = pts[i - 1];
    return Math.abs(p[0] - prev[0]) > eps || Math.abs(p[1] - prev[1]) > eps || Math.abs(p[2] - prev[2]) > eps;
  });
}

// -- SVG path parsing --

export function parseSvgPaths(svgString, options = {}) {
  const { minHoleDiameter } = options;
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const paths = [];

  for (const pathEl of doc.querySelectorAll('path')) {
    const d = pathEl.getAttribute('d') || '';
    const opacity = pathEl.getAttribute('opacity');
    if (opacity === '0') continue;
    const fill = pathEl.getAttribute('fill') || '#000';
    const strokeWidth = parseFloat(pathEl.getAttribute('stroke-width')) || 0;

    // Stroked paths with fill="none" (e.g. routed drill slots): expand the
    // centerline into a filled rectangle using the stroke width.
    if (fill === 'none' && strokeWidth > 0) {
      const tokens = d.match(/[MLmlHhVv]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
      if (!tokens) continue;
      // Extract segments from the centerline (M starts a new segment).
      const segments = [];
      let currentSeg = [];
      let sx = 0, sy = 0;
      let ti = 0;
      while (ti < tokens.length) {
        const c = tokens[ti];
        if (c === 'M') {
          if (currentSeg.length > 0) segments.push(currentSeg);
          sx = parseFloat(tokens[ti+1]); sy = parseFloat(tokens[ti+2]);
          currentSeg = [[sx, sy]];
          ti += 3;
        } else if (c === 'm') {
          if (currentSeg.length > 0) segments.push(currentSeg);
          sx += parseFloat(tokens[ti+1]); sy += parseFloat(tokens[ti+2]);
          currentSeg = [[sx, sy]];
          ti += 3;
        } else if (c === 'L') {
          sx = parseFloat(tokens[ti+1]); sy = parseFloat(tokens[ti+2]);
          currentSeg.push([sx, sy]);
          ti += 3;
        } else if (c === 'l') {
          sx += parseFloat(tokens[ti+1]); sy += parseFloat(tokens[ti+2]);
          currentSeg.push([sx, sy]);
          ti += 3;
        } else { ti++; }
      }
      if (currentSeg.length > 0) segments.push(currentSeg);
      // Build stadiums for each segment independently (never across M jumps).
      for (const pts of segments) {
        if (pts.length < 2) continue;
        const hw = strokeWidth / 2; // half-width
        const ARC_SEGS = 12; // segments per semicircle (matches 24-seg full circles)
        for (let si = 0; si < pts.length - 1; si++) {
          const [x0, y0] = pts[si];
          const [x1, y1] = pts[si + 1];
          const dx = x1 - x0, dy = y1 - y0;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          // Perpendicular unit vector scaled by hw.
          const px = -dy / len * hw, py = dx / len * hw;
          // Angle of the perpendicular direction.
          const perpAngle = Math.atan2(py, px);
          const poly = [];
          // Side 1: from start to end along +perpendicular side.
          poly.push([x0 + px, y0 + py]);
          poly.push([x1 + px, y1 + py]);
          // Semicircle cap at end point (x1, y1): sweeps from +perp to -perp.
          for (let ai = 1; ai < ARC_SEGS; ai++) {
            const a = perpAngle - (ai / ARC_SEGS) * Math.PI;
            poly.push([x1 + hw * Math.cos(a), y1 + hw * Math.sin(a)]);
          }
          // Side 2: from end to start along -perpendicular side.
          poly.push([x1 - px, y1 - py]);
          poly.push([x0 - px, y0 - py]);
          // Semicircle cap at start point (x0, y0): sweeps from -perp to +perp.
          for (let ai = 1; ai < ARC_SEGS; ai++) {
            const a = perpAngle - Math.PI - (ai / ARC_SEGS) * Math.PI;
            poly.push([x0 + hw * Math.cos(a), y0 + hw * Math.sin(a)]);
          }
          paths.push({ subpaths: [poly], fill: 'slot' });
        }
      }
      continue;
    }

    const tokens = d.match(/[MLQZAHVCSmlqzahvcs]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
    if (!tokens) continue;

    let current = [];
    let cx = 0, cy = 0; // current point
    let startX = 0, startY = 0; // subpath start (for Z)

    let i = 0;
    while (i < tokens.length) {
      const cmd = tokens[i];
      if (cmd === 'M') {
        if (current.length >= 3) paths.push({ subpaths: [current], fill });
        cx = parseFloat(tokens[i + 1]);
        cy = parseFloat(tokens[i + 2]);
        startX = cx; startY = cy;
        current = [[cx, cy]];
        i += 3;
      } else if (cmd === 'm') {
        if (current.length >= 3) paths.push({ subpaths: [current], fill });
        cx += parseFloat(tokens[i + 1]);
        cy += parseFloat(tokens[i + 2]);
        startX = cx; startY = cy;
        current = [[cx, cy]];
        i += 3;
      } else if (cmd === 'L') {
        cx = parseFloat(tokens[i + 1]);
        cy = parseFloat(tokens[i + 2]);
        current.push([cx, cy]);
        i += 3;
      } else if (cmd === 'l') {
        cx += parseFloat(tokens[i + 1]);
        cy += parseFloat(tokens[i + 2]);
        current.push([cx, cy]);
        i += 3;
      } else if (cmd === 'H') {
        cx = parseFloat(tokens[i + 1]);
        current.push([cx, cy]);
        i += 2;
      } else if (cmd === 'h') {
        cx += parseFloat(tokens[i + 1]);
        current.push([cx, cy]);
        i += 2;
      } else if (cmd === 'V') {
        cy = parseFloat(tokens[i + 1]);
        current.push([cx, cy]);
        i += 2;
      } else if (cmd === 'v') {
        cy += parseFloat(tokens[i + 1]);
        current.push([cx, cy]);
        i += 2;
      } else if (cmd === 'Q') {
        const qcx = parseFloat(tokens[i + 1]);
        const qcy = parseFloat(tokens[i + 2]);
        const qx = parseFloat(tokens[i + 3]);
        const qy = parseFloat(tokens[i + 4]);
        const pts = linearizeQuadBezier(cx, cy, qcx, qcy, qx, qy);
        current.push(...pts);
        cx = qx; cy = qy;
        i += 5;
      } else if (cmd === 'q') {
        const qcx = cx + parseFloat(tokens[i + 1]);
        const qcy = cy + parseFloat(tokens[i + 2]);
        const qx = cx + parseFloat(tokens[i + 3]);
        const qy = cy + parseFloat(tokens[i + 4]);
        current.push(...linearizeQuadBezier(cx, cy, qcx, qcy, qx, qy));
        cx = qx; cy = qy;
        i += 5;
      } else if (cmd === 'C') {
        // Cubic bezier — approximate with two quad beziers.
        const c1x = parseFloat(tokens[i + 1]), c1y = parseFloat(tokens[i + 2]);
        const c2x = parseFloat(tokens[i + 3]), c2y = parseFloat(tokens[i + 4]);
        const ex = parseFloat(tokens[i + 5]), ey = parseFloat(tokens[i + 6]);
        const mx = (c1x + c2x) / 2, my = (c1y + c2y) / 2;
        current.push(...linearizeQuadBezier(cx, cy, c1x, c1y, mx, my, 5));
        current.push(...linearizeQuadBezier(mx, my, c2x, c2y, ex, ey, 5));
        cx = ex; cy = ey;
        i += 7;
      } else if (cmd === 'c') {
        const c1x = cx + parseFloat(tokens[i + 1]), c1y = cy + parseFloat(tokens[i + 2]);
        const c2x = cx + parseFloat(tokens[i + 3]), c2y = cy + parseFloat(tokens[i + 4]);
        const ex = cx + parseFloat(tokens[i + 5]), ey = cy + parseFloat(tokens[i + 6]);
        const mx = (c1x + c2x) / 2, my = (c1y + c2y) / 2;
        current.push(...linearizeQuadBezier(cx, cy, c1x, c1y, mx, my, 5));
        current.push(...linearizeQuadBezier(mx, my, c2x, c2y, ex, ey, 5));
        cx = ex; cy = ey;
        i += 7;
      } else if (cmd === 'S' || cmd === 's') {
        // Smooth cubic — treat like cubic with reflected control point.
        const c2x = cmd === 'S' ? parseFloat(tokens[i + 1]) : cx + parseFloat(tokens[i + 1]);
        const c2y = cmd === 'S' ? parseFloat(tokens[i + 2]) : cy + parseFloat(tokens[i + 2]);
        const ex = cmd === 'S' ? parseFloat(tokens[i + 3]) : cx + parseFloat(tokens[i + 3]);
        const ey = cmd === 'S' ? parseFloat(tokens[i + 4]) : cy + parseFloat(tokens[i + 4]);
        const mx = (cx + c2x) / 2, my = (cy + c2y) / 2;
        current.push(...linearizeQuadBezier(cx, cy, cx, cy, mx, my, 5));
        current.push(...linearizeQuadBezier(mx, my, c2x, c2y, ex, ey, 5));
        cx = ex; cy = ey;
        i += 5;
      } else if (cmd === 'A') {
        const arx = parseFloat(tokens[i + 1]);
        const ary = parseFloat(tokens[i + 2]);
        const xRot = parseFloat(tokens[i + 3]);
        const la = parseFloat(tokens[i + 4]);
        const sw = parseFloat(tokens[i + 5]);
        const ax = parseFloat(tokens[i + 6]);
        const ay = parseFloat(tokens[i + 7]);
        current.push(...linearizeArc(cx, cy, arx, ary, xRot, la, sw, ax, ay));
        cx = ax; cy = ay;
        i += 8;
      } else if (cmd === 'a') {
        const arx = parseFloat(tokens[i + 1]);
        const ary = parseFloat(tokens[i + 2]);
        const xRot = parseFloat(tokens[i + 3]);
        const la = parseFloat(tokens[i + 4]);
        const sw = parseFloat(tokens[i + 5]);
        const ax = cx + parseFloat(tokens[i + 6]);
        const ay = cy + parseFloat(tokens[i + 7]);
        current.push(...linearizeArc(cx, cy, arx, ary, xRot, la, sw, ax, ay));
        cx = ax; cy = ay;
        i += 8;
      } else if (cmd === 'Z' || cmd === 'z') {
        if (current.length >= 3) {
          const first = current[0];
          const last = current[current.length - 1];
          if (Math.abs(first[0] - last[0]) < 0.01 &&
              Math.abs(first[1] - last[1]) < 0.01) {
            current.pop();
          }
          if (current.length >= 3) paths.push({ subpaths: [current], fill });
        }
        cx = startX; cy = startY;
        current = [];
        i += 1;
      } else {
        i += 1;
      }
    }
    if (current.length >= 3) paths.push({ subpaths: [current], fill });
  }

  // Parse <circle> elements (used by tracespace for drill holes).
  for (const circleEl of doc.querySelectorAll('circle')) {
    const opacity = circleEl.getAttribute('opacity');
    if (opacity === '0') continue;
    const ccx = parseFloat(circleEl.getAttribute('cx'));
    const ccy = parseFloat(circleEl.getAttribute('cy'));
    let r = parseFloat(circleEl.getAttribute('r'));
    if (!r || r <= 0 || isNaN(ccx) || isNaN(ccy)) continue;
    if (minHoleDiameter && r * 2 < minHoleDiameter) {
      r = minHoleDiameter / 2;
    }
    const N = 24; // segments for circle approximation
    const pts = [];
    for (let j = 0; j < N; j++) {
      const a = (j / N) * 2 * Math.PI;
      pts.push([ccx + r * Math.cos(a), ccy + r * Math.sin(a)]);
    }
    paths.push({ subpaths: [pts], fill: 'circle' });
  }

  // Parse <rect> elements (used by tracespace for rectangular pads).
  for (const rectEl of doc.querySelectorAll('rect')) {
    const opacity = rectEl.getAttribute('opacity');
    if (opacity === '0') continue;
    const x = parseFloat(rectEl.getAttribute('x'));
    const y = parseFloat(rectEl.getAttribute('y'));
    const w = parseFloat(rectEl.getAttribute('width'));
    const h = parseFloat(rectEl.getAttribute('height'));
    if (!w || !h || isNaN(x) || isNaN(y)) continue;
    const rx = Math.min(parseFloat(rectEl.getAttribute('rx')) || 0, w / 2);
    const ry = Math.min(parseFloat(rectEl.getAttribute('ry')) || 0, h / 2);
    const pts = [];
    if (rx > 0 && ry > 0) {
      // Rounded rectangle: arc segments at each corner.
      const ARC_SEGS = 6;
      const corners = [
        { cx: x + w - rx, cy: y + ry,     startA: -Math.PI / 2, endA: 0 },
        { cx: x + w - rx, cy: y + h - ry, startA: 0,            endA: Math.PI / 2 },
        { cx: x + rx,     cy: y + h - ry, startA: Math.PI / 2,  endA: Math.PI },
        { cx: x + rx,     cy: y + ry,     startA: Math.PI,       endA: 3 * Math.PI / 2 },
      ];
      for (const { cx: ccx, cy: ccy, startA, endA } of corners) {
        for (let ai = 0; ai <= ARC_SEGS; ai++) {
          const a = startA + (ai / ARC_SEGS) * (endA - startA);
          pts.push([ccx + rx * Math.cos(a), ccy + ry * Math.sin(a)]);
        }
      }
    } else {
      pts.push([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
    }
    paths.push({ subpaths: [pts], fill: 'rect' });
  }

  // Parse <polygon> elements (used by tracespace for simple pads).
  for (const polyEl of doc.querySelectorAll('polygon')) {
    const opacity = polyEl.getAttribute('opacity');
    if (opacity === '0') continue;
    const pointsAttr = polyEl.getAttribute('points');
    if (!pointsAttr) continue;
    const nums = pointsAttr.trim().split(/[\s,]+/).map(Number);
    if (nums.length < 6) continue; // need at least 3 points
    const pts = [];
    for (let pi = 0; pi < nums.length - 1; pi += 2) {
      pts.push([nums[pi], nums[pi + 1]]);
    }
    paths.push({ subpaths: [pts], fill: 'polygon' });
  }

  return paths;
}

// -- Merge overlapping SVG polygons via boolean union --

export function mergeSvgPolygons(svgString) {
  const paths = parseSvgPaths(svgString);
  if (paths.length === 0) return svgString;

  // Collect all polygons in polygon-clipping format: [ring] where ring = [[x,y],...]
  // Rings must be closed (first point === last point).
  const polys = [];
  for (const { subpaths } of paths) {
    for (const pts of subpaths) {
      if (pts.length < 3) continue;
      const ring = [...pts];
      const f = ring[0], l = ring[ring.length - 1];
      if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);
      polys.push([ring]);
    }
  }
  if (polys.length === 0) return svgString;

  // Union all polygons into a single multi-polygon.
  let merged;
  try {
    merged = polys.reduce((acc, poly) => {
      try { return polygonClipping.union(acc, [poly]); }
      catch { return acc; }
    });
  } catch (e) {
    console.warn('SVG merge failed, using original:', e.message);
    return svgString;
  }

  // Extract viewBox from original SVG.
  const vbMatch = svgString.match(/viewBox="([^"]+)"/);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 100 100';

  // Build new SVG with merged paths.
  let pathD = '';
  for (const polygon of merged) {
    for (const ring of polygon) {
      const pts = ring.slice(0, -1); // remove closing duplicate
      if (pts.length < 3) continue;
      pathD += 'M' + pts.map(p => `${p[0]} ${p[1]}`).join('L') + 'Z';
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
    `<path d="${pathD}" fill="currentColor" fill-rule="evenodd"/>` +
    `</svg>`;
}

// -- Board outline cleanup: remove strokes, fill solid black --

export function cleanupBoardOutlineSvg(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  // Process all shape elements: remove strokes, set fill to black.
  for (const el of svg.querySelectorAll('path, circle, rect, polygon, polyline, line, ellipse')) {
    el.removeAttribute('stroke');
    el.removeAttribute('stroke-width');
    el.removeAttribute('stroke-linecap');
    el.removeAttribute('stroke-linejoin');
    el.removeAttribute('stroke-dasharray');
    el.removeAttribute('stroke-opacity');
    el.setAttribute('fill', '#000000');
  }

  return new XMLSerializer().serializeToString(svg);
}

export { polygonClipping };
