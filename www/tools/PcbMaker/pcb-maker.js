/**
 * PcbMaker — PCB design viewer and SketchUp importer.
 * Supports PSD files (raster PCB layers) and Gerber ZIP archives.
 *
 * File-specific parsing is delegated to:
 *   - parsePsd.js    (PSD via ag-psd + imagetracerjs)
 *   - parseGerber.js (Gerber ZIP via @tracespace/core + JSZip)
 *
 * SVG utilities live in svgUtils.js, STL export in exportStl.js.
 */
import { parseSvgPaths, boundingBoxArea, dedup, polygonClipping } from './svgUtils.js';
import { downloadStl, downloadBoardStl, downloadStep, downloadBoardStep } from './export3d.js';
import { handlePsdFile } from './parsePsd.js';
import { handleGerberFile, handleGerberFiles, svgToCanvas } from './parseGerber.js';
import { DropHandler } from './dropHandler.js';

// -- User-configurable layer colors (updated by color picker UI) --
const layerColors = {
  copper:      [184, 115, 51],
  soldermask:  [0, 100, 0],
  solderpaste: [180, 180, 180],
  silkscreen:  [255, 255, 255],
  drill:       [100, 100, 100],
  outline:     [210, 180, 140],
  drawing:     [128, 128, 128],
  board:       [0, 128, 0],
};

// Restore saved colors from localStorage.
const STORAGE_KEY = 'pcbmaker-layer-colors';
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved) Object.assign(layerColors, saved);
} catch {}

// -- Min hole diameter setting --
let minHoleDia = 1.1;
const HOLE_STORAGE_KEY = 'pcbmaker-min-hole-dia';
try {
  const saved = parseFloat(localStorage.getItem(HOLE_STORAGE_KEY));
  if (!isNaN(saved)) minHoleDia = saved;
} catch {}

// -- Color helpers --
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128];
}

const COLOR_LABELS = {
  copper: 'Copper', soldermask: 'Solder Mask', solderpaste: 'Solder Paste',
  silkscreen: 'Silk Screen', drill: 'Drill', outline: 'Outline',
  drawing: 'Drawing', board: 'Board',
};

// -- UI --
document.body.innerHTML = `
<div id="color-settings">
  <h3>Layer Colors</h3>
  <div id="color-grid">
    ${Object.entries(COLOR_LABELS).map(([key, label]) =>
      `<label>${label}<input type="color" data-layer="${key}" value="${rgbToHex(layerColors[key])}"></label>`
    ).join('')}
  </div>
</div>
<div id="hole-settings">
  <label>Min hole diameter (mm): <input type="number" id="min-hole-dia" value="${minHoleDia}" min="0" step="0.1"></label>
</div>
<div id="drop-container"></div>
<div id="results"></div>
`;

const results = document.getElementById('results');

// Wire up min hole diameter input.
document.getElementById('min-hole-dia').addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  if (!isNaN(val) && val >= 0) {
    minHoleDia = val;
    localStorage.setItem(HOLE_STORAGE_KEY, String(val));
  }
});

// Wire up color pickers.
for (const input of document.querySelectorAll('#color-grid input[type="color"]')) {
  input.addEventListener('input', (e) => {
    layerColors[e.target.dataset.layer] = hexToRgb(e.target.value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layerColors));
  });
}


// -- Styles --
const style = document.createElement('style');
style.textContent = `
  #color-settings {
    margin-bottom: 12px;
  }
  #color-settings h3 {
    margin: 0 0 8px;
    font-size: 13px;
    color: #555;
  }
  #color-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  #color-grid label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #444;
  }
  #color-grid input[type="color"] {
    width: 28px;
    height: 22px;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 0;
    cursor: pointer;
  }
  #results {
    margin-top: 12px;
  }
  #results ul {
    list-style: none;
    padding-left: 16px;
    margin: 4px 0;
  }
  #results > ul {
    padding-left: 0;
  }
  #results li {
    padding: 4px 0;
  }
  .layer-name {
    font-weight: 600;
  }
  .folder > .layer-name::before { content: "📁 "; }
  .layer > .layer-name::before { content: "🖼 "; }
  .layer-canvas, .composite-canvas {
    display: block;
    margin: 4px 0 4px 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-image:
      linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
      linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
      linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
    background-size: 10px 10px;
    background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
  }
  .layer-canvas { max-width: 200px; }
  .composite-canvas { max-width: 400px; }
  .composite-label, .svg-label {
    display: block;
    font-size: 11px;
    color: #666;
    margin: 6px 0 2px 20px;
  }
  .svg-output {
    max-width: 400px;
    margin: 4px 0 4px 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
    background-image:
      linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
      linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
      linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
    background-size: 10px 10px;
    background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
  }
  .svg-output svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .draw-su-btn {
    display: block;
    margin: 6px 0 4px 20px;
    padding: 4px 12px;
    background: #4284f5;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  .draw-su-btn:hover { background: #3070d4; }
  .draw-su-btn:disabled { background: #aaa; cursor: default; }
  .download-stl-btn {
    display: block;
    margin: 6px 0 4px 20px;
    padding: 4px 12px;
    background: #7c3aed;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  .download-stl-btn:hover { background: #6d28d9; }
  .download-stl-btn:disabled { background: #aaa; cursor: default; }
  .draw-all-btn {
    margin: 8px 0;
    padding: 8px 16px;
    background: #2d8a4e;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
  }
  .draw-all-btn:hover { background: #24703f; }
  .draw-all-btn:disabled { background: #aaa; cursor: default; }
`;
document.head.appendChild(style);

// -- SketchUp integration --

const BOARD_THICKNESS = 1.6; // mm

/**
 * Draw SVG paths as flat faces into SketchUp.
 * Geometry is created at Z=0, then the group is translated to the given Z.
 * @param {object} op - SketchUp operation object (from performOperation callback)
 * @param {object} parentGroup - Group ref or model to create the layer group inside
 * @param {string} svgHtml - SVG markup to draw
 * @param {string} layerName - Name for the created group
 * @param {number[]} color - [r, g, b] color for the material
 * @param {number} [z=0] - Z offset to translate the group to after creation
 */
async function drawSvgInSketchUp(op, parentGroup, svgHtml, layerName, color, z = 0) {
  const groupRef = op.groupCreate(parentGroup);
  op.groupSetName(groupRef, layerName);

  // Create and assign material with layer color.
  const matRef = op.materialsAdd('PCB-' + layerName);
  op.materialSetColor(matRef, {
    red: color[0], green: color[1], blue: color[2], alpha: 255,
  });
  const mat = await op.materialForRef(matRef);

  const paths = parseSvgPaths(svgHtml);
  for (const { subpaths } of paths) {
    const loops3d = subpaths.map(pts => dedup(pts.map(([x, y]) => [x, y, 0])))
      .filter(loop => loop.length >= 3);
    const subGroupRef = op.groupCreate(groupRef);

    try {
      if (loops3d.length === 1) {
        op.faceCreate(subGroupRef, loops3d[0]);
      } else {
        const sorted = [...loops3d].sort(
          (a, b) => boundingBoxArea(b) - boundingBoxArea(a)
        );
        const outerLoop = sorted[0];
        const holes = sorted.slice(1);
        await op.createBuilder((builder) => {
          builder.faceCreate(outerLoop, holes);
        }).build(subGroupRef);
      }
    } catch (e) {
      console.warn('faceCreate failed for path:', e.message);
    }
  }

  const group = await op.groupForRef(groupRef);
  op.drawingElementSetMaterial(group, mat);

  // Translate to Z offset if non-zero.
  if (z !== 0) {
    const translate = Sketchup.Transformation.translation([0, 0, z]);
    op.groupApplyTransformation(group, translate);
  }
}

/**
 * Draw a 3D extruded board (with drill holes subtracted) into SketchUp.
 * Uses 2D polygon-clipping for boolean subtraction, then faceCreate + pushPull.
 * @param {object} op - SketchUp operation object
 * @param {object} parentGroup - Group ref or model to create the board group inside
 * @param {string} boardSvg - Board outline SVG
 * @param {string[]} drillSvgs - Array of drill layer SVGs
 */
async function drawBoardInSketchUp(op, parentGroup, boardSvg, drillSvgs) {
  const BOARD_COLOR = layerColors.board;

  // 1. Parse board outline into polygon-clipping format (closed rings).
  const boardPaths = parseSvgPaths(boardSvg);
  const toClosedRing = (pts) => {
    const ring = [...pts];
    const f = ring[0], l = ring[ring.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);
    return ring;
  };

  let boardPolys = boardPaths.flatMap(({ subpaths }) =>
    subpaths.filter(pts => pts.length >= 3).map(pts => [toClosedRing(pts)])
  );

  if (boardPolys.length === 0) {
    console.warn('No board outline geometry found.');
    return;
  }

  // Union board outlines if multiple.
  if (boardPolys.length > 1) {
    boardPolys = boardPolys.reduce((acc, p) => {
      try { return polygonClipping.union(acc, p); }
      catch { return acc; }
    });
  } else {
    boardPolys = boardPolys[0];
  }

  // 2. Subtract drill holes in 2D.
  for (const drillSvg of drillSvgs) {
    const holePaths = parseSvgPaths(drillSvg, { minHoleDiameter: minHoleDia });
    for (const { subpaths } of holePaths) {
      for (const pts of subpaths) {
        if (pts.length < 3) continue;
        try {
          boardPolys = polygonClipping.difference(boardPolys, [[toClosedRing(pts)]]);
        } catch (e) {
          console.warn('Hole subtract failed:', e.message);
        }
      }
    }
  }

  // 3. Draw in SketchUp with pushpull extrusion.
  const groupRef = op.groupCreate(parentGroup);
  op.groupSetName(groupRef, 'Board');
  const matRef = op.materialsAdd('PCB-Board');
  const [mr, mg, mb] = BOARD_COLOR;
  op.materialSetColor(matRef, { red: mr, green: mg, blue: mb, alpha: 255 });
  const mat = await op.materialForRef(matRef);

  for (const polygon of boardPolys) {
    // polygon = [outerRing, ...holeRings] (closed rings from polygon-clipping)
    const outer = dedup(polygon[0].slice(0, -1).map(([x, y]) => [x, y, 0]));
    const holes = polygon.slice(1)
      .map(ring => dedup(ring.slice(0, -1).map(([x, y]) => [x, y, 0])))
      .filter(h => h.length >= 3);

    if (outer.length < 3) continue;
    const subGroupRef = op.groupCreate(groupRef);

    if (holes.length === 0) {
      const faceRef = op.faceCreate(subGroupRef, outer);
      op.facePushPull(faceRef, BOARD_THICKNESS, true);
    } else {
      // Builder creates a proper face-with-holes (single face, holes cut in).
      // Builder refs aren't valid for pushpull, so resolve the group to get
      // the face entity afterward.
      await op.createBuilder((builder) => {
        builder.faceCreate(outer, holes);
      }).build(subGroupRef);
      const subGroup = await op.groupForRef(subGroupRef);
      const faces = await subGroup.faces();
      if (faces.length > 0) {
        op.facePushPull(faces[0], BOARD_THICKNESS, true);
      }
    }
  }

  const group = await op.groupForRef(groupRef);
  op.drawingElementSetMaterial(group, mat);

  // Rotate 180° around X so the board faces up (as if sitting on a table).
  const rotate = Sketchup.Transformation.rotation([0, 0, 0], [1, 0, 0], Math.PI);
  op.groupApplyTransformation(group, rotate);
}

// -- Operation wrappers (single-undo entry points) --

async function drawSingleLayer(svgHtml, name, color) {
  await Sketchup.connect();
  const model = await Sketchup.getActiveModel();
  await model.performOperation(async (op) => {
    await drawSvgInSketchUp(op, model, svgHtml, name, color);
  }, 'PCB: ' + name);
}

async function drawSingleBoard(boardSvg, drillSvgs) {
  await Sketchup.connect();
  const model = await Sketchup.getActiveModel();
  await model.performOperation(async (op) => {
    await drawBoardInSketchUp(op, model, boardSvg, drillSvgs);
  }, 'PCB: Board');
}

async function drawAllLayers(compositeData) {
  await Sketchup.connect();
  const model = await Sketchup.getActiveModel();
  await model.performOperation(async (op) => {
    const rootGroupRef = op.groupCreate(model);
    op.groupSetName(rootGroupRef, 'PCB');
    for (const { svgHtml, name, color } of compositeData) {
      await drawSvgInSketchUp(op, rootGroupRef, svgHtml, name, color);
    }
  }, 'PCB: Draw All');
}

// Z offsets for PCB layer stacking (mm). Small gaps prevent Z-fighting.
// Board sits at Z=0 and extrudes up to BOARD_THICKNESS (1.6mm).
// Top layers stack above the board, bottom layers below.
const Z_OFFSET = 0.02; // mm gap between stacked layers
const PCB_STACK = {
  // Bottom side: layers below Z=0, ordered outward (furthest from board first)
  // Keys match tracespace v5 output (lowercase type + side).
  silkscreen_bottom:  -(Z_OFFSET * 3),
  soldermask_bottom:  -(Z_OFFSET * 2),
  copper_bottom:      -(Z_OFFSET * 1),
  // Top side: layers above board top, ordered outward
  copper_top:         BOARD_THICKNESS + (Z_OFFSET * 1),
  soldermask_top:     BOARD_THICKNESS + (Z_OFFSET * 2),
  silkscreen_top:     BOARD_THICKNESS + (Z_OFFSET * 3),
};

/**
 * Draw a full stacked PCB into SketchUp: board + copper + solder mask + silk screen
 * for both top and bottom, each at the correct Z offset. Single undo step.
 * @param {object} gerberData - Parsed Gerber data from handleGerberFile
 */
async function drawFullPcb(gerberData) {
  // Build a lookup of layers by type+side for quick access.
  const layerMap = {};
  for (const layer of gerberData.layers) {
    const key = `${layer.type}_${layer.side}`;
    layerMap[key] = layer;
  }

  await Sketchup.connect();
  const model = await Sketchup.getActiveModel();
  await model.performOperation(async (op) => {
    const rootGroupRef = op.groupCreate(model);
    op.groupSetName(rootGroupRef, 'PCB');

    // Draw the 3D extruded board.
    if (gerberData.boardSvg) {
      await drawBoardInSketchUp(op, rootGroupRef, gerberData.boardSvg, gerberData.drillSvgs);
    }

    // Draw stacked layers (copper, solder mask, silk screen) for both sides.
    for (const [stackKey, z] of Object.entries(PCB_STACK)) {
      const [type, side] = stackKey.split('_');
      const key = `${type}_${side}`;
      const layer = layerMap[key];
      if (!layer) continue;

      const color = layerColors[type] || layer.color;
      const name = `${type}-${side}`;
      await drawSvgInSketchUp(op, rootGroupRef, layer.svgHtml, name, color, z);
    }
  }, 'PCB: Full Board');
}

// -- UI rendering for PSD results --

function renderPsdResults(data, resultsEl) {
  resultsEl.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = data.heading;
  resultsEl.appendChild(heading);

  const compositeData = [];
  const tree = buildPsdLayerTree(data.layers, data.dpi, compositeData);
  if (tree) {
    resultsEl.appendChild(tree);
  } else {
    const p = document.createElement('p');
    p.textContent = 'No layers found.';
    resultsEl.appendChild(p);
  }

  // "Draw All Layers" button.
  if (compositeData.length > 0) {
    resultsEl.appendChild(createDrawAllButton(compositeData));
  }
}

function buildPsdLayerTree(layers, dpi, compositeData) {
  if (!layers || layers.length === 0) return null;

  const ul = document.createElement('ul');

  for (const layer of layers) {
    const li = document.createElement('li');

    if (layer.type === 'composite') {
      li.className = 'folder';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'layer-name';
      nameSpan.textContent = layer.name;
      li.appendChild(nameSpan);

      // Composite canvas preview.
      const label = document.createElement('span');
      label.className = 'composite-label';
      label.textContent = 'Composite:';
      li.appendChild(label);

      if (layer.canvas) {
        layer.canvas.className = 'composite-canvas';
        li.appendChild(layer.canvas);
      }

      // SVG preview.
      const svgLabel = document.createElement('span');
      svgLabel.className = 'svg-label';
      svgLabel.textContent = 'SVG:';
      li.appendChild(svgLabel);

      const svgWrapper = document.createElement('div');
      svgWrapper.className = 'svg-output';
      svgWrapper.innerHTML = layer.svgHtml;
      li.appendChild(svgWrapper);

      // Store for "Draw All" button.
      compositeData.push({ svgHtml: layer.svgHtml, name: layer.name, color: layer.color });

      // "Draw in SketchUp" button.
      li.appendChild(createDrawButton(layer.svgHtml, layer.name, layer.color));

      // "Download STL" button for board layers.
      if (layer.isBoard) {
        const stlBtn = document.createElement('button');
        stlBtn.textContent = 'Download STL';
        stlBtn.className = 'download-stl-btn';
        stlBtn.onclick = async () => {
          stlBtn.disabled = true;
          stlBtn.textContent = 'Generating...';
          try {
            await downloadStl(layer.svgHtml, layer.name, dpi);
            stlBtn.textContent = 'Downloaded!';
          } catch (err) {
            stlBtn.textContent = 'Error: ' + err.message;
            console.error('STL export failed:', err);
          }
        };
        li.appendChild(stlBtn);

        const stepBtn = document.createElement('button');
        stepBtn.textContent = 'Export STEP';
        stepBtn.className = 'download-stl-btn';
        stepBtn.onclick = async () => {
          stepBtn.disabled = true;
          stepBtn.textContent = 'Generating...';
          try {
            await downloadStep(layer.svgHtml, layer.name, dpi);
            stepBtn.textContent = 'Downloaded!';
          } catch (err) {
            stepBtn.textContent = 'Error: ' + err.message;
            console.error('STEP export failed:', err);
          }
        };
        li.appendChild(stepBtn);
      }

      // Nested children.
      if (layer.children) {
        const nested = buildPsdLayerTree(layer.children, dpi, compositeData);
        if (nested) li.appendChild(nested);
      }
    } else if (layer.type === 'graphics') {
      li.className = 'folder';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'layer-name';
      nameSpan.textContent = layer.name;
      li.appendChild(nameSpan);

      if (layer.canvas) {
        const label = document.createElement('span');
        label.className = 'composite-label';
        label.textContent = 'Composite:';
        li.appendChild(label);
        layer.canvas.className = 'composite-canvas';
        li.appendChild(layer.canvas);
      }

      if (layer.children) {
        const nested = buildPsdLayerTree(layer.children, dpi, compositeData);
        if (nested) li.appendChild(nested);
      }
    } else if (layer.type === 'raster') {
      li.className = 'layer';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'layer-name';
      const hidden = layer.hidden ? ' (hidden)' : '';
      nameSpan.textContent = layer.name + hidden;
      li.appendChild(nameSpan);

      if (layer.canvas) {
        layer.canvas.className = 'layer-canvas';
        li.appendChild(layer.canvas);
      }
    } else if (layer.type === 'folder') {
      li.className = 'folder';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'layer-name';
      nameSpan.textContent = layer.name;
      li.appendChild(nameSpan);

      if (layer.children) {
        const nested = buildPsdLayerTree(layer.children, dpi, compositeData);
        if (nested) li.appendChild(nested);
      }
    }

    ul.appendChild(li);
  }

  return ul;
}

// -- UI rendering for Gerber results --

function renderGerberResults(data, resultsEl) {
  resultsEl.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = data.heading;
  resultsEl.appendChild(heading);

  const compositeData = [];

  // Top-level "Draw in SketchUp" button — full stacked PCB.
  if (data.boardSvg) {
    const drawBoardBtn = document.createElement('button');
    drawBoardBtn.textContent = 'Draw Full PCB in SketchUp';
    drawBoardBtn.className = 'draw-all-btn';
    drawBoardBtn.onclick = async () => {
      drawBoardBtn.disabled = true;
      drawBoardBtn.textContent = 'Drawing PCB...';
      try {
        await drawFullPcb(data);
        drawBoardBtn.textContent = 'Done!';
      } catch (err) {
        drawBoardBtn.textContent = 'Error: ' + err.message;
        console.error('Draw PCB failed:', err);
      }
    };
    resultsEl.appendChild(drawBoardBtn);
  }

  // Layer previews (composites + individual layers).
  const layerHeading = document.createElement('h3');
  layerHeading.textContent = 'Layers';
  resultsEl.appendChild(layerHeading);

  const ul = document.createElement('ul');

  for (const layer of data.layers) {
    const li = document.createElement('li');
    li.className = 'layer';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'layer-name';
    nameSpan.textContent = layer.filename
      ? `${layer.label} — ${layer.filename} (${layer.dimensions})`
      : `${layer.label} (${layer.dimensions})`;
    li.appendChild(nameSpan);

    // SVG preview.
    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'svg-output';
    svgWrapper.innerHTML = layer.svgHtml;
    li.appendChild(svgWrapper);

    // Raster canvas preview (pre-generated by parseGerber).
    if (layer.canvas) {
      const canvasLabel = document.createElement('span');
      canvasLabel.className = 'composite-label';
      canvasLabel.textContent = 'Raster preview:';
      li.appendChild(canvasLabel);
      layer.canvas.className = layer.isComposite ? 'composite-canvas' : 'composite-canvas';
      li.appendChild(layer.canvas);
    }

    // "Draw in SketchUp" button.
    li.appendChild(createDrawButton(layer.svgHtml, layer.name, layer.color));

    // Collect composite layers for "Draw All".
    if (layer.isComposite) {
      compositeData.push({ svgHtml: layer.svgHtml, name: layer.name, color: layer.color });
    }

    // "Download SVG" button (skip for composites which have no source filename).
    if (layer.filename) {
      const dlSvgBtn = document.createElement('button');
      dlSvgBtn.textContent = '\u{1F4BE} SVG';
      dlSvgBtn.className = 'download-stl-btn';
      dlSvgBtn.onclick = () => {
        const blob = new Blob([layer.svgHtml], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = layer.filename + '.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
      li.appendChild(dlSvgBtn);
    }

    // "Download STL" button for outline layers.
    if (layer.isOutline && data.boardSvg) {
      const drillCount = data.drillSvgs.length;
      const stlBtn = document.createElement('button');
      stlBtn.textContent = drillCount > 0
        ? `Download STL (${drillCount} drill layer${drillCount > 1 ? 's' : ''} subtracted)`
        : 'Download STL';
      stlBtn.className = 'download-stl-btn';
      stlBtn.onclick = async () => {
        stlBtn.disabled = true;
        stlBtn.textContent = 'Generating STL...';
        try {
          await downloadBoardStl(data.boardSvg, data.drillSvgs, data.filename.replace(/\.zip$/i, ''), { minHoleDiameter: minHoleDia });
          stlBtn.textContent = 'Downloaded!';
        } catch (err) {
          stlBtn.textContent = 'Error: ' + err.message;
          console.error('STL export failed:', err);
        }
      };
      li.appendChild(stlBtn);

      const stepBtn = document.createElement('button');
      stepBtn.textContent = drillCount > 0
        ? `Export STEP (${drillCount} drill layer${drillCount > 1 ? 's' : ''} subtracted)`
        : 'Export STEP';
      stepBtn.className = 'download-stl-btn';
      stepBtn.onclick = async () => {
        stepBtn.disabled = true;
        stepBtn.textContent = 'Generating STEP...';
        try {
          await downloadBoardStep(data.boardSvg, data.drillSvgs, data.filename.replace(/\.zip$/i, ''), { minHoleDiameter: minHoleDia });
          stepBtn.textContent = 'Downloaded!';
        } catch (err) {
          stepBtn.textContent = 'Error: ' + err.message;
          console.error('STEP export failed:', err);
        }
      };
      li.appendChild(stepBtn);
    }

    ul.appendChild(li);
  }

  resultsEl.appendChild(ul);

  // "Draw All" button.
  if (compositeData.length > 0) {
    resultsEl.appendChild(createDrawAllButton(compositeData));
  }

  // "Download All SVGs and PNGs" button.
  const dlAllBtn = document.createElement('button');
  dlAllBtn.textContent = 'Download All SVGs and PNGs';
  dlAllBtn.className = 'draw-all-btn';
  dlAllBtn.onclick = async () => {
    dlAllBtn.disabled = true;
    dlAllBtn.textContent = 'Downloading...';
    for (const layer of data.layers) {
      const name = layer.filename || layer.name;
      if (layer.svgHtml) {
        const blob = new Blob([layer.svgHtml], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name + '.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 100));
      }
      if (layer.canvas) {
        downloadCanvasAsPng(layer.canvas, name + '.png');
        await new Promise(r => setTimeout(r, 100));
      }
    }
    dlAllBtn.textContent = 'Downloaded!';
  };
  resultsEl.appendChild(dlAllBtn);
}

// -- Shared UI helpers --

function downloadCanvasAsPng(canvas, filename) {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function createDrawButton(svgHtml, name, color) {
  const drawBtn = document.createElement('button');
  drawBtn.textContent = 'Draw in SketchUp';
  drawBtn.className = 'draw-su-btn';
  drawBtn.onclick = async () => {
    drawBtn.disabled = true;
    drawBtn.textContent = 'Drawing...';
    try {
      await drawSingleLayer(svgHtml, name, color);
      drawBtn.textContent = 'Done!';
    } catch (err) {
      drawBtn.textContent = 'Error: ' + err.message;
      console.error('Draw in SU failed:', err);
    }
  };
  return drawBtn;
}

function createDrawAllButton(compositeData) {
  const drawAllBtn = document.createElement('button');
  drawAllBtn.textContent = 'Draw All Layers in SketchUp';
  drawAllBtn.className = 'draw-all-btn';
  drawAllBtn.onclick = async () => {
    drawAllBtn.disabled = true;
    drawAllBtn.textContent = 'Drawing all layers...';
    try {
      await drawAllLayers(compositeData);
      drawAllBtn.textContent = 'Done!';
    } catch (err) {
      drawAllBtn.textContent = 'Error: ' + err.message;
      console.error('Draw All failed:', err);
    }
  };
  return drawAllBtn;
}

// -- Drag and drop (via DropHandler module) --

const dropHandler = new DropHandler(
  document.getElementById('drop-container'),
  handleFileDrop,
  'Drag &amp; drop a PSD, Gerber ZIP, or folder here'
);

function showDropError(msg) {
  results.innerHTML = `<p><strong>Error:</strong> ${msg}</p>`;
  dropHandler.resetMessage();
}

async function handleFileDrop({ files, folderName }) {
  try {
    if (folderName) {
      const data = await handleGerberFiles(files, folderName, layerColors);
      renderGerberResults(data, results);
      dropHandler.setMessage(folderName);
      return;
    }

    const file = files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (name.endsWith('.psd')) {
      const data = handlePsdFile(arrayBuffer, file.name);
      renderPsdResults(data, results);
      dropHandler.setMessage(file.name);
    } else if (name.endsWith('.zip')) {
      const data = await handleGerberFile(arrayBuffer, file.name, layerColors);
      renderGerberResults(data, results);
      dropHandler.setMessage(file.name);
    } else {
      results.innerHTML = '<p><strong>Unsupported file type. Drop a .psd, .zip, or folder.</strong></p>';
      dropHandler.resetMessage();
    }
  } catch (err) {
    showDropError(err.message);
  }
}
