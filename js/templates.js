// Custom Templates — user-defined, reusable groups of shapes + connectors.
//
// Naming: a "template" here means a SAVED DIAGRAM FRAGMENT that the user can
// drag from the Stencil into any diagram. It is NOT the same as a "diagram
// type" template (onboarding / new-diagram flow). Internally the store key is
// `sf_templates` to avoid collision.
//
// Public API:
//   getTemplates()                   → Template[]
//   saveTemplate(name, cells)        → Template   (persists)
//   deleteTemplate(id)               → void        (persists)
//   instantiateTemplate(id, point)   → void        (adds cells to active graph)
//   renderTemplateThumbnail(tpl)     → SVGElement  (small preview)
//   onTemplatesChange(fn)            → unsubscribe fn

import * as history from './history.js?v=1.15.7';

const STORE_KEY = 'sf_templates';
const _listeners = new Set();

// ── persistence ─────────────────────────────────────────────────────

export function getTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  } catch {
    return [];
  }
}

function _save(templates) {
  localStorage.setItem(STORE_KEY, JSON.stringify(templates));
  _listeners.forEach(fn => fn());
}

export function saveTemplate(name, cells) {
  if (!name?.trim()) throw new Error('Template name is required');
  if (!cells?.length) throw new Error('Select at least one element to save');

  // Serialise cells
  const serialised = cells.map(c => c.toJSON());

  // Compute the bounding box of the selection so we can store relative offsets
  // and re-instantiate at an arbitrary point without knowing the original canvas
  // coordinates.
  let minX = Infinity, minY = Infinity;
  for (const c of cells) {
    if (c.isLink()) continue;
    const p = c.position();
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
  }

  const template = {
    id: crypto.randomUUID(),
    name: name.trim(),
    diagramType: _activeDiagramType(),
    cells: serialised,
    originX: minX,
    originY: minY,
    savedAt: Date.now(),
  };

  const templates = getTemplates();
  templates.push(template);
  _save(templates);
  return template;
}

export function deleteTemplate(id) {
  const updated = getTemplates().filter(t => t.id !== id);
  _save(updated);
}

// ── instantiation ────────────────────────────────────────────────────

/** Add a template's cells to the active graph, centred on `point` ({x,y}). */
export function instantiateTemplate(id, point) {
  const template = getTemplates().find(t => t.id === id);
  if (!template) return;

  // Remap IDs so multiple instances don't collide.
  const idMap = {};
  const elements = [];
  const links = [];

  for (const json of template.cells) {
    const newId = joint.util.uuid();
    idMap[json.id] = newId;
    if (json.type?.includes('Link') || json.source || json.target) {
      links.push({ ...json, id: newId });
    } else {
      elements.push({ ...json, id: newId });
    }
  }

  // Compute offset: top-left of selection → drop point
  const ox = point.x - template.originX;
  const oy = point.y - template.originY;

  // Rebuild elements
  const newCells = [];
  for (const json of elements) {
    const pos = json.position || { x: 0, y: 0 };
    const cell = new joint.dia.Element({
      ...json,
      position: { x: pos.x + ox, y: pos.y + oy },
    });
    newCells.push(cell);
  }

  // Rebuild links with remapped source/target IDs
  for (const json of links) {
    const src = json.source?.id ? { ...json.source, id: idMap[json.source.id] || json.source.id } : json.source;
    const tgt = json.target?.id ? { ...json.target, id: idMap[json.target.id] || json.target.id } : json.target;
    const link = new joint.dia.Link({ ...json, source: src, target: tgt });
    newCells.push(link);
  }

  // Remap parent/embeds so containers still hold their children
  for (const cell of newCells) {
    const orig = cell.get('parent');
    if (orig && idMap[orig]) cell.set('parent', idMap[orig]);
    const embeds = cell.get('embeds');
    if (Array.isArray(embeds)) cell.set('embeds', embeds.map(eid => idMap[eid] || eid));
  }

  _activeGraph().addCells(newCells);
  history.captureAdd(newCells);
}

// ── thumbnail rendering ──────────────────────────────────────────────

/**
 * Render a static SVG thumbnail of the template's cells.
 * Returns a <svg> DOM element sized to fit inside a ~120×80 px stencil slot.
 */
export function renderTemplateThumbnail(template) {
  const SIZE = { w: 120, h: 80 };
  const PAD  = 6;

  // Gather bounding boxes of non-link cells
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const json of template.cells) {
    if (json.type?.includes('Link') || json.source) continue;
    const { x, y } = json.position || { x: 0, y: 0 };
    const { width, height } = json.size || { width: 80, height: 40 };
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 80; maxY = 40; }

  const naturalW = maxX - minX;
  const naturalH = maxY - minY;
  const scale = Math.min((SIZE.w - 2*PAD) / naturalW, (SIZE.h - 2*PAD) / naturalH, 1);
  const offX = PAD + ((SIZE.w - 2*PAD) - naturalW*scale) / 2 - minX*scale;
  const offY = PAD + ((SIZE.h - 2*PAD) - naturalH*scale) / 2 - minY*scale;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', SIZE.w);
  svg.setAttribute('height', SIZE.h);
  svg.setAttribute('viewBox', `0 0 ${SIZE.w} ${SIZE.h}`);
  svg.classList.add('df-template-thumb');

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(${offX},${offY}) scale(${scale})`);

  for (const json of template.cells) {
    if (json.type?.includes('Link') || json.source) continue;
    const { x, y } = json.position || { x: 0, y: 0 };
    const { width, height } = json.size || { width: 80, height: 40 };
    const label = json.attrs?.label?.text || json.attrs?.'.label'?.text || '';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('rx', 4);
    rect.setAttribute('fill', '#2A2D32');
    rect.setAttribute('stroke', '#555');
    rect.setAttribute('stroke-width', 1 / scale); // keep stroke thin after scaling
    g.appendChild(rect);

    if (label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x + width / 2);
      text.setAttribute('y', y + height / 2 + 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#CCC');
      text.setAttribute('font-size', 10 / scale);
      text.textContent = label.length > 14 ? label.slice(0, 13) + '…' : label;
      g.appendChild(text);
    }
  }

  svg.appendChild(g);
  return svg;
}

// ── subscription ─────────────────────────────────────────────────────

export function onTemplatesChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn); // returns unsubscribe
}

// ── private ──────────────────────────────────────────────────────────

function _activeGraph() {
  // graph is injected by the main module at startup
  // We reach it via the global set by app.js
  return window._sfDiagramsGraph;
}

function _activeDiagramType() {
  return window._sfDiagramsActiveType || 'architecture';
}
