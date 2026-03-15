/**
 * export3d.js — 3D export logic for PcbMaker (Replicad/OpenCascade backend).
 * Supports STL and STEP export for both generic SVG layers and board-with-drill-holes.
 */
import { ensureReplicadReady, replicad } from './replicadInit.js';
import { parseSvgPaths, boundingBoxArea } from './svgUtils.js';

const BOARD_THICKNESS = 1.6; // mm (standard PCB thickness)

function signedArea(pts) {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum / 2;
}

function ensureCCW(pts) {
  return signedArea(pts) > 0 ? pts.slice().reverse() : pts;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create a 3D solid by extruding a 2D polygon.
 * @param {number[][]} points - Array of [x, y] pairs (CCW winding)
 * @param {number} height - Extrusion height in mm
 * @returns {Shape} Replicad 3D shape
 */
function polygonToSolid(points, height) {
  let drawing = replicad.draw(points[0]);
  for (let i = 1; i < points.length; i++) {
    drawing = drawing.lineTo(points[i]);
  }
  return drawing.close().sketchOnPlane("XY").extrude(height);
}

/**
 * Build a merged solid from SVG paths (generic layer extrusion).
 */
async function buildSvgSolid(svgHtml, dpi, scale) {
  await ensureReplicadReady();

  const pxToMm = scale != null ? scale : 25.4 / dpi;
  const scalePts = (pts) => pts.map(([x, y]) => [x * pxToMm, y * pxToMm]);
  const paths = parseSvgPaths(svgHtml);
  const solids = [];

  for (const { subpaths } of paths) {
    try {
      if (subpaths.length === 1) {
        solids.push(polygonToSolid(ensureCCW(scalePts(subpaths[0])), BOARD_THICKNESS));
      } else {
        const sorted = [...subpaths].sort(
          (a, b) => boundingBoxArea(b) - boundingBoxArea(a)
        );
        let solid = polygonToSolid(ensureCCW(scalePts(sorted[0])), BOARD_THICKNESS);

        for (const hole of sorted.slice(1)) {
          const holeSolid = polygonToSolid(ensureCCW(scalePts(hole)), BOARD_THICKNESS);
          solid = solid.cut(holeSolid);
        }
        solids.push(solid);
      }
    } catch (e) {
      console.warn('Extrude failed for path:', e.message);
    }
  }

  if (solids.length === 0) return null;

  let merged = solids[0];
  for (let i = 1; i < solids.length; i++) {
    try {
      merged = merged.fuse(solids[i]);
    } catch (e) {
      console.warn('Union failed, skipping solid:', e.message);
    }
  }
  return merged;
}

/**
 * Build a board solid from outline SVG with drill holes subtracted.
 */
async function buildBoardSolid(boardSvg, drillSvgs, settings = {}) {
  await ensureReplicadReady();

  const { minHoleDiameter = 1.1 } = settings;

  // 1. Build board solid from outline paths.
  const boardPaths = parseSvgPaths(boardSvg);
  console.log(`[3D] Board outline: ${boardPaths.length} paths, ${boardPaths.reduce((n, p) => n + p.subpaths.length, 0)} subpaths`);
  const boardSolids = [];

  for (const { subpaths } of boardPaths) {
    try {
      if (subpaths.length === 1) {
        boardSolids.push(polygonToSolid(ensureCCW(subpaths[0]), BOARD_THICKNESS));
      } else {
        const sorted = [...subpaths].sort(
          (a, b) => boundingBoxArea(b) - boundingBoxArea(a)
        );
        let solid = polygonToSolid(ensureCCW(sorted[0]), BOARD_THICKNESS);
        for (const hole of sorted.slice(1)) {
          const holeSolid = polygonToSolid(ensureCCW(hole), BOARD_THICKNESS);
          solid = solid.cut(holeSolid);
        }
        boardSolids.push(solid);
      }
    } catch (e) {
      console.warn('Board extrude failed:', e.message);
    }
  }

  if (boardSolids.length === 0) return null;

  let board = boardSolids[0];
  for (let i = 1; i < boardSolids.length; i++) {
    try { board = board.fuse(boardSolids[i]); }
    catch (e) { console.warn('Board union failed:', e.message); }
  }

  // 2. Subtract drill holes from all DRL layers.
  for (let di = 0; di < drillSvgs.length; di++) {
    const drillSvg = drillSvgs[di];
    const holePaths = parseSvgPaths(drillSvg, { minHoleDiameter });
    const totalHoles = holePaths.reduce((n, p) => n + p.subpaths.length, 0);
    console.log(`[3D] Drill layer ${di + 1}/${drillSvgs.length}: ${holePaths.length} paths, ${totalHoles} holes`);
    for (const { subpaths } of holePaths) {
      for (const pts of subpaths) {
        if (pts.length < 3) continue;
        try {
          let holeSolid = polygonToSolid(ensureCCW(pts), BOARD_THICKNESS + 0.2);
          holeSolid = holeSolid.translate([0, 0, -0.1]);
          board = board.cut(holeSolid);
        } catch (e) {
          console.warn('Drill subtract failed:', e.message);
        }
      }
    }
  }

  return board;
}

// -- STL exports --

const STL_OPTS = { tolerance: 0.2, angularTolerance: 0.2, binary: true };

export async function downloadStl(svgHtml, filename, dpi, scale) {
  const solid = await buildSvgSolid(svgHtml, dpi, scale);
  if (!solid) { console.warn('No geometry to export.'); return; }
  downloadBlob(solid.blobSTL(STL_OPTS), (filename || 'board') + '.stl');
}

export async function downloadBoardStl(boardSvg, drillSvgs, filename, settings = {}) {
  const board = await buildBoardSolid(boardSvg, drillSvgs, settings);
  if (!board) { console.warn('No board geometry to export.'); return; }
  downloadBlob(board.blobSTL(STL_OPTS), (filename || 'board') + '.stl');
}

// -- STEP exports --

export async function downloadStep(svgHtml, filename, dpi, scale) {
  const solid = await buildSvgSolid(svgHtml, dpi, scale);
  if (!solid) { console.warn('No geometry to export.'); return; }
  downloadBlob(solid.blobSTEP(), (filename || 'board') + '.step');
}

export async function downloadBoardStep(boardSvg, drillSvgs, filename, settings = {}) {
  const board = await buildBoardSolid(boardSvg, drillSvgs, settings);
  if (!board) { console.warn('No board geometry to export.'); return; }
  downloadBlob(board.blobSTEP(), (filename || 'board') + '.step');
}
