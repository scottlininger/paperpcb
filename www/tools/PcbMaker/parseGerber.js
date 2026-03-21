/**
 * parseGerber.js — Pure Gerber/ZIP parser for PcbMaker.
 * Takes a ZIP archive of Gerber files and returns structured layer data with SVGs
 * and pre-rendered canvas previews.
 */
import {
  read,
  plot,
  renderLayers,
  renderBoard,
  stringifySvg,
} from 'https://esm.sh/@tracespace/core@5.0.0-alpha.0';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { mergeSvgPolygons, cleanupBoardOutlineSvg } from './svgUtils.js';

// -- SVG to canvas rasterization --

const DEFAULT_DPI = 300;

export function svgToCanvas(svgHtml, widthPx, heightPx, flip) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([svgHtml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      if (flip) {
        ctx.translate(widthPx, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, 0, 0, widthPx, heightPx);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.src = url;
  });
}

// Layer type labels for display (keys match tracespace v5 output: lowercase).
const TYPE_LABELS = {
  copper: 'Copper',
  soldermask: 'Solder Mask',
  solderpaste: 'Solder Paste',
  silkscreen: 'Silk Screen',
  drill: 'Drill',
  outline: 'Board Outline',
  drawing: 'Drawing',
};

const SIDE_LABELS = {
  top: 'Top',
  bottom: 'Bottom',
  inner: 'Inner',
  all: 'All',
};

// Colors for drawing layers in SketchUp (keys match tracespace v5 output).
const LAYER_COLORS = {
  copper:      [184, 115, 51],
  soldermask:  [0, 128, 0],
  solderpaste: [180, 180, 180],
  silkscreen:  [255, 255, 255],
  drill:       [100, 100, 100],
  outline:     [210, 180, 140],
  drawing:     [128, 128, 128],
};

function getLayerColor(type, colors) {
  if (colors && colors[type]) return colors[type];
  return LAYER_COLORS[type] || [128, 128, 128];
}

function getLayerLabel(layer) {
  const type = TYPE_LABELS[layer.type] || layer.type || 'Unknown';
  const side = SIDE_LABELS[layer.side] || layer.side || '';
  return side ? `${type} (${side})` : type;
}

const MERGE_TYPES = new Set(['copper']);

const ALLOWED_EXTENSIONS = new Set([
  '.gbr', '.ger',
  '.gtl', '.gbl',
  '.gto', '.gbo',
  '.gts', '.gbs',
  '.gtp', '.gbp',
  '.gko', '.gm1', '.gml', '.gdl',
  '.drl', '.xln',
]);

function getExtension(name) {
  const lower = name.toLowerCase();
  const index = lower.lastIndexOf('.');
  return index >= 0 ? lower.slice(index) : '';
}

function isAllowedFile(name) {
  return ALLOWED_EXTENSIONS.has(getExtension(name));
}

/**
 * Parse a Gerber ZIP archive and return structured layer data.
 * @param {ArrayBuffer} arrayBuffer - The ZIP file contents
 * @param {string} filename - Original filename
 * @param {object} [colors] - Optional layer color overrides keyed by type (e.g. { copper: [r,g,b] })
 * @param {object} [options] - Optional settings
 * @param {number} [options.dpi=300] - DPI for raster canvas previews
 */
export async function handleGerberFile(arrayBuffer, filename, colors, options = {}) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const files = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (!isAllowedFile(path)) {
      console.log('[PcbMaker] Ignoring ZIP entry:', path);
      continue;
    }
    const text = await entry.async('string');
    files.push(new File([text], entry.name));
  }

  return handleGerberFiles(files, filename, colors, options);
}

/**
 * Parse an array of Gerber File objects and return structured layer data.
 * @param {File[]} files - Gerber files to parse
 * @param {string} filename - Display name (e.g. folder or ZIP name)
 * @param {object} [colors] - Optional layer color overrides
 * @param {object} [options] - Optional settings
 * @param {number} [options.dpi=300] - DPI for raster canvas previews
 */
export async function handleGerberFiles(files, filename, colors, options = {}) {
  const dpi = options.dpi || DEFAULT_DPI;

  // Filter out non-Gerber files.
  const gerberFiles = files.filter((file) => {
    const allowed = isAllowedFile(file.name);
    if (!allowed) console.log('[PcbMaker] Ignoring dropped file:', file.name);
    return allowed;
  });

  if (gerberFiles.length === 0) {
    throw new Error('No Gerber files found.');
  }

  console.log('[PcbMaker] Reading files:', gerberFiles.map((file) => file.name));

  let readResult;
  try {
    readResult = await read(gerberFiles);
  } catch (err) {
    console.warn('[PcbMaker] Batch read failed, retrying per file:', err);
    const acceptedFiles = [];

    for (const file of gerberFiles) {
      try {
        await read([file]);
        acceptedFiles.push(file);
      } catch (fileErr) {
        console.warn('[PcbMaker] Ignoring unrecognized file:', file.name, fileErr);
      }
    }

    if (acceptedFiles.length === 0) throw err;

    console.log('[PcbMaker] Retrying with:', acceptedFiles.map((file) => file.name));
    readResult = await read(acceptedFiles);
  }
  const plotResult = plot(readResult);
  const layersResult = renderLayers(plotResult);
  const boardResult = renderBoard(layersResult);

  const [vx, vy, vw, vh] = layersResult.boardShapeRender.viewBox;

  // Collect drill layer SVGs and board outline.
  const drillSvgs = [];
  for (const layer of layersResult.layers) {
    if (layer.type === 'drill' && layersResult.rendersById[layer.id]) {
      drillSvgs.push(stringifySvg(layersResult.rendersById[layer.id]));
    }
  }
  const boardSvg = layersResult.boardShapeRender.path
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}">${stringifySvg(layersResult.boardShapeRender.path)}</svg>`
    : null;

  // Canvas pixel dimensions for raster previews.
  const canvasW = Math.round(vw / 25.4 * dpi);
  const canvasH = Math.round(vh / 25.4 * dpi);

  // Board side composites (top/bottom) — added as layers.
  const layers = [];
  const canvasPromises = [];

  for (const side of ['top', 'bottom']) {
    if (!boardResult[side]) continue;
    const svgHtml = stringifySvg(boardResult[side]);
    const color = side === 'top' ? [0, 100, 0] : [0, 0, 100];
    const sideLabel = side.charAt(0).toUpperCase() + side.slice(1);
    const layerObj = {
      name: `Board-${side}`,
      label: `Board Composite (${sideLabel})`,
      svgHtml,
      color,
      type: 'composite',
      side,
      filename: null,
      dimensions: `${vw.toFixed(1)} x ${vh.toFixed(1)} mm`,
      isComposite: true,
      canvas: null,
    };
    layers.push(layerObj);
    canvasPromises.push(
      svgToCanvas(svgHtml, canvasW, canvasH, side === 'bottom')
        .then((canvas) => { layerObj.canvas = canvas; })
    );
  }

  // Individual layer data.
  for (const layer of layersResult.layers) {
    const svgElement = layersResult.rendersById[layer.id];
    if (!svgElement) continue;
    const rawSvg = stringifySvg(svgElement);
    let svgHtml = rawSvg;
    if (MERGE_TYPES.has(layer.type)) svgHtml = mergeSvgPolygons(rawSvg);
    else if (layer.type === 'outline') svgHtml = cleanupBoardOutlineSvg(rawSvg);

    const label = getLayerLabel(layer);
    const color = getLayerColor(layer.type, colors);
    const layerName = `${layer.type || 'layer'}-${layer.side || 'unknown'}-${layer.filename}`;

    const layerObj = {
      name: layerName,
      label,
      svgHtml,
      color,
      type: layer.type,
      side: layer.side,
      filename: layer.filename,
      dimensions: `${vw.toFixed(1)} x ${vh.toFixed(1)} mm`,
      isOutline: layer.type === 'outline',
      canvas: null,
    };
    layers.push(layerObj);
    canvasPromises.push(
      svgToCanvas(svgHtml, canvasW, canvasH, layer.side === 'bottom')
        .then((canvas) => { layerObj.canvas = canvas; })
    );
  }

  await Promise.all(canvasPromises);

  return {
    filename,
    heading: `${filename} (${readResult.layers.length} layers)`,
    scale: 1.0, // Gerber coordinates are already in mm
    boardWidthMm: vw,
    boardHeightMm: vh,
    layers,
    boardSvg,
    drillSvgs,
  };
}
