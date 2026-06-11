// Custom Templates — user-defined, reusable groups of shapes + connectors.
//
// Naming: a "template" here is a user-saved snapshot of one or more selected
// cells that can be stamped onto the canvas at will.  It is NOT related to
// the HTML <template> element or any server-side templating engine.
//
// Storage: templates are persisted to localStorage under the key
// "sf_diagram_templates" as a JSON array.  Each entry:
//
//   {
//     id          : string          — UUID v4
//     name        : string          — display name chosen by the user
//     diagramType : string          — 'architecture' | 'bpmn' | etc.
//     cells       : object[]        — JointJS cell JSON snapshots
//     thumbnail   : string | null   — data-URL PNG (may be omitted on old entries)
//     createdAt   : number          — Date.now() at save time
//   }

import * as history from './history.js?v=1.15.7';

const STORAGE_KEY = 'sf_diagram_templates';
const MAX_TEMPLATES = 200;

let _graph  = null;
let _paper  = null;
let _onChangeCbs = new Set();

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function init(graph, paper) {
  _graph = graph;
  _paper = paper;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getTemplates() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveTemplates(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  notifyChange();
}

/**
 * Save a new template from the current selection.
 *
 * @param {string}   name        — display label
 * @param {object[]} cells       — array of JointJS cell JSON
 * @param {string}   diagramType
 * @returns {object} the new template entry
 */
export function saveTemplate(name, cells, diagramType) {
  const all = getTemplates();
  const entry = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled Template',
    diagramType,
    cells,
    thumbnail: null,
    createdAt: Date.now(),
  };
  all.unshift(entry);        // newest first
  if (all.length > MAX_TEMPLATES) all.splice(MAX_TEMPLATES);
  saveTemplates(all);
  return entry;
}

export function deleteTemplate(id) {
  const filtered = getTemplates().filter(t => t.id !== id);
  saveTemplates(filtered);
}

export function renameTemplate(id, newName) {
  const all = getTemplates();
  const tpl = all.find(t => t.id === id);
  if (!tpl) return;
  tpl.name = newName.trim() || tpl.name;
  saveTemplates(all);
}

// ---------------------------------------------------------------------------
// Thumbnail helpers
// ---------------------------------------------------------------------------

/**
 * Render a tiny SVG thumbnail of the template into `containerEl`.
 * Purely visual; no interactivity.
 */
export function renderTemplateThumbnail(tpl, containerEl) {
  containerEl.innerHTML = '';
  const W = 56, H = 40;

  const cells = tpl.cells || [];
  const elements = cells.filter(c => c.type && !c.type.toLowerCase().includes('link'));

  if (elements.length === 0) {
    containerEl.textContent = '∅';
    return;
  }

  // Compute bounding box of all elements
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach(el => {
    const x = el.position?.x ?? 0;
    const y = el.position?.y ?? 0;
    const w = el.size?.width  ?? 80;
    const h = el.size?.height ?? 40;
    minX = Math.min(minX, x);       minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);   maxY = Math.max(maxY, y + h);
  });

  const srcW = maxX - minX || 1;
  const srcH = maxY - minY || 1;
  const scale = Math.min((W - 6) / srcW, (H - 6) / srcH);
  const offX  = (W - srcW * scale) / 2 - minX * scale;
  const offY  = (H - srcH * scale) / 2 - minY * scale;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  elements.forEach(el => {
    const x = (el.position?.x ?? 0) * scale + offX;
    const y = (el.position?.y ?? 0) * scale + offY;
    const w = (el.size?.width  ?? 80) * scale;
    const h = (el.size?.height ?? 40) * scale;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', Math.max(w, 1));
    rect.setAttribute('height', Math.max(h, 1));
    rect.setAttribute('rx', 2);
    rect.setAttribute('fill', '#e8f0fe');
    rect.setAttribute('stroke', '#4a6fa5');
    rect.setAttribute('stroke-width', 0.8);
    svg.appendChild(rect);
  });

  containerEl.appendChild(svg);
}

// ---------------------------------------------------------------------------
// Instantiation (stamp onto canvas)
// ---------------------------------------------------------------------------

/**
 * Place a template onto the canvas at the given paper coordinates.
 *
 * @param {string} templateId
 * @param {{ x: number, y: number }} position — paper-local coordinates
 */
export function instantiateTemplate(templateId, position) {
  const tpl = getTemplates().find(t => t.id === templateId);
  if (!tpl || !_graph) return;

  const cells = tpl.cells;
  if (!cells || cells.length === 0) return;

  // Find bounding box origin of the template cells
  const elements = cells.filter(c => c.type && !c.type.toLowerCase().includes('link'));
  if (elements.length === 0) return;

  const originX = Math.min(...elements.map(el => el.position?.x ?? 0));
  const originY = Math.min(...elements.map(el => el.position?.y ?? 0));

  // Build new cells with fresh IDs, offset to the drop position
  const idMap = new Map();
  const clonedCells = cells.map(cellJson => {
    const newId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    idMap.set(cellJson.id, newId);

    const clone = JSON.parse(JSON.stringify(cellJson));
    clone.id = newId;

    if (clone.position) {
      clone.position.x = (clone.position.x - originX) + position.x;
      clone.position.y = (clone.position.y - originY) + position.y;
    }
    return clone;
  });

  // Re-wire link source/target IDs
  clonedCells.forEach(clone => {
    const type = clone.type?.toLowerCase() || '';
    if (!type.includes('link')) return;
    const src = clone.source;
    const tgt = clone.target;
    if (src?.id && idMap.has(src.id)) clone.source = { ...src, id: idMap.get(src.id) };
    if (tgt?.id && idMap.has(tgt.id)) clone.target = { ...tgt, id: idMap.get(tgt.id) };
  });

  history.beginGroup();
  clonedCells.forEach(cellJson => _graph.addCell(_graph.getCell(cellJson.id) ? null : cellJson));
  history.endGroup();
}

// ---------------------------------------------------------------------------
// Change notification
// ---------------------------------------------------------------------------

export function onTemplatesChange(fn) {
  _onChangeCbs.add(fn);
  return () => _onChangeCbs.delete(fn);
}

function notifyChange() {
  _onChangeCbs.forEach(fn => fn());
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

export function exportTemplatesJson() {
  return JSON.stringify(getTemplates(), null, 2);
}

/**
 * Import templates from a JSON string.
 * @param {string} jsonStr
 * @returns {number} count of templates added
 */
export function importTemplatesJson(jsonStr) {
  let incoming;
  try {
    incoming = JSON.parse(jsonStr);
    if (!Array.isArray(incoming)) throw new Error('not array');
  } catch {
    return 0;
  }

  const existing = getTemplates();
  const existingIds = new Set(existing.map(t => t.id));

  const toAdd = incoming.filter(t => t.id && t.cells && !existingIds.has(t.id));
  if (toAdd.length === 0) return 0;

  const merged = [...toAdd, ...existing];
  if (merged.length > MAX_TEMPLATES) {
    // Storage may be full.
    console.warn('SF Diagrams: Template storage may be full.', 'error');
    return 0;
  }
  notifyChange();
  return added;
}
