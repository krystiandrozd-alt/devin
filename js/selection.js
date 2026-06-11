// Selection manager — tracks selected elements
// Provides single-click, shift-click, rubber-band selection and keyboard helpers.
//
// Public API
//   init(graph, paper)  — wire up listeners
//   getSelected()       — returns Set<dia.Cell>
//   select(cell, opts)  — add to / replace selection
//   deselect(cell)      — remove one cell
//   clearSelection()    — empty the set
//   selectAll()         — select every cell
//   deleteSelected()    — delete selected cells (with history)
//   onSelectionChange(fn)  — subscribe; returns unsubscribe fn

import * as history from './history.js?v=1.15.7';
import { showHalo, hideHalo } from './halo.js?v=1.15.7';
import { showContextMenu, hideContextMenu } from './context-menu.js?v=1.15.7';
import { canEmbed, findHaloParent, tuckChildInside } from './canvas.js?v=1.15.7';

let _graph = null;
let _paper = null;

/** @type {Set<import('@joint/core').dia.Cell>} */
const selected = new Set();
const listeners = new Set();

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function init(graph, paper) {
  _graph = graph;
  _paper = paper;

  // ── Cell clicks ──────────────────────────────────────────────────────────
  paper.on('cell:pointerdown', (view, evt) => {
    const cell = view.model;
    if (evt.shiftKey) {
      toggleSelect(cell);
    } else {
      if (!selected.has(cell)) {
        replaceSelection([cell]);
      }
      // If already selected, a later pointerup will handle drag-or-confirm.
    }
  });

  paper.on('cell:pointerup', (view, evt) => {
    const cell = view.model;
    if (!evt.shiftKey && !evt._wasDragged) {
      // Simple click with no shift and no drag: confirm single selection
      if (selected.size > 1 || !selected.has(cell)) {
        replaceSelection([cell]);
      }
    }
  });

  // ── Blank clicks ─────────────────────────────────────────────────────────
  paper.on('blank:pointerdown', (_evt) => {
    clearSelection();
    hideContextMenu();
  });

  // ── Right-click context menu ──────────────────────────────────────────────
  paper.on('cell:contextmenu', (view, evt) => {
    evt.preventDefault();
    const cell = view.model;
    if (!selected.has(cell)) replaceSelection([cell]);
    showContextMenu(evt.clientX, evt.clientY, [...selected]);
  });

  // ── Rubber-band (lasso) selection ────────────────────────────────────────
  initRubberBand(paper);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  document.addEventListener('keydown', handleKeyDown);

  // ── Graph removals keep the selection consistent ─────────────────────────
  graph.on('remove', (cell) => {
    if (selected.has(cell)) {
      selected.delete(cell);
      notify();
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSelected() {
  return new Set(selected);
}

export function select(cell, { add = false } = {}) {
  if (add) {
    selected.add(cell);
  } else {
    replaceSelection([cell]);
  }
  notify();
  updateVisuals();
}

export function deselect(cell) {
  selected.delete(cell);
  notify();
  updateVisuals();
}

export function clearSelection() {
  selected.clear();
  notify();
  updateVisuals();
}

export function selectAll() {
  _graph.getCells().forEach(c => selected.add(c));
  notify();
  updateVisuals();
}

export function deleteSelected() {
  if (selected.size === 0) return;
  const cells = [...selected];
  clearSelection();
  history.recordDelete(cells);
  cells.forEach(c => c.remove());
}

/**
 * Subscribe to selection changes.
 * @param {function(Set): void} fn
 * @returns {function(): void} unsubscribe
 */
export function onSelectionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toggleSelect(cell) {
  if (selected.has(cell)) {
    selected.delete(cell);
  } else {
    selected.add(cell);
  }
  notify();
  updateVisuals();
}

function replaceSelection(cells) {
  selected.clear();
  cells.forEach(c => selected.add(c));
  notify();
  updateVisuals();
}

function notify() {
  const snapshot = new Set(selected);
  listeners.forEach(fn => fn(snapshot));
}

function updateVisuals() {
  // Halo: show for single-element selections only
  if (selected.size === 1) {
    const [cell] = selected;
    showHalo(cell, _paper);
  } else {
    hideHalo();
  }

  // Highlight rings on all selected cells
  if (!_paper) return;
  _graph.getCells().forEach(cell => {
    const view = _paper.findViewByModel(cell);
    if (!view) return;
    if (selected.has(cell)) {
      view.el.classList.add('selected');
    } else {
      view.el.classList.remove('selected');
    }
  });
}

// ---------------------------------------------------------------------------
// Rubber-band (lasso) selection
// ---------------------------------------------------------------------------

function initRubberBand(paper) {
  let active = false;
  let startX = 0, startY = 0;
  let bandEl = null;

  const container = paper.el.parentElement;

  paper.on('blank:pointerdown', (_view, evt) => {
    // Only left-button drags start a lasso
    if (evt.button !== 0) return;

    active = true;
    const rect = paper.el.getBoundingClientRect();
    startX = evt.clientX - rect.left;
    startY = evt.clientY - rect.top;

    bandEl = document.createElement('div');
    bandEl.className = 'rubber-band';
    bandEl.style.cssText = `left:${startX}px;top:${startY}px;width:0;height:0;`;
    container.appendChild(bandEl);
  });

  document.addEventListener('mousemove', (evt) => {
    if (!active || !bandEl) return;
    const rect = paper.el.getBoundingClientRect();
    const curX = evt.clientX - rect.left;
    const curY = evt.clientY - rect.top;

    const x = Math.min(startX, curX);
    const y = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);

    bandEl.style.left   = `${x}px`;
    bandEl.style.top    = `${y}px`;
    bandEl.style.width  = `${w}px`;
    bandEl.style.height = `${h}px`;
  });

  document.addEventListener('mouseup', (evt) => {
    if (!active) return;
    active = false;

    if (bandEl) {
      const rect = paper.el.getBoundingClientRect();
      const curX = evt.clientX - rect.left;
      const curY = evt.clientY - rect.top;

      const lx = Math.min(startX, curX);
      const ly = Math.min(startY, curY);
      const lw = Math.abs(curX - startX);
      const lh = Math.abs(curY - startY);

      bandEl.remove();
      bandEl = null;

      // Only treat it as a lasso if the drag was meaningful
      if (lw > 5 || lh > 5) {
        // Convert to paper-local coordinates (account for pan/zoom)
        const scale = paper.scale();
        const translate = paper.translate();
        const px = (lx - translate.tx) / scale.sx;
        const py = (ly - translate.ty) / scale.sy;
        const pw = lw / scale.sx;
        const ph = lh / scale.sy;

        const hits = _graph.getElements().filter(el => {
          const bbox = el.getBBox();
          return bbox.x >= px && bbox.y >= py &&
                 bbox.x + bbox.width  <= px + pw &&
                 bbox.y + bbox.height <= py + ph;
        });
        replaceSelection(hits);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

function handleKeyDown(e) {
  // Ignore when typing in an input
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

  if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size > 0) {
    e.preventDefault();
    deleteSelected();
    return;
  }

  // Ctrl/Cmd + A  →  select all
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault();
    selectAll();
    return;
  }

  // Arrow keys → nudge selected elements
  const NUDGE = e.shiftKey ? 10 : 1;
  const DIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const delta = DIR[e.key];
  if (delta && selected.size > 0) {
    e.preventDefault();
    const dx = delta[0] * NUDGE;
    const dy = delta[1] * NUDGE;
    history.beginGroup();
    selected.forEach(cell => {
      if (cell.isElement()) {
        const { x, y } = cell.position();
        cell.position(x + dx, y + dy);
      }
    });
    history.endGroup();
  }
}

// ---------------------------------------------------------------------------
// Multi-select drag (move all selected elements together)
// ---------------------------------------------------------------------------
// JointJS handles individual element drag via the paper. We need to extend
// that so dragging one selected element moves all selected elements.

let _dragOrigins = null;   // Map<cell, {x,y}> at drag start
let _dragCell   = null;    // the cell being directly dragged

/**
 * Called by the canvas module's element:pointermove handler.
 * If more than one element is selected and the dragged element is among
 * them, translate all *other* selected elements by the same delta.
 */
export function onElementDrag(cell, dx, dy) {
  if (selected.size <= 1) return;
  if (!selected.has(cell)) return;

  selected.forEach(other => {
    if (other === cell || !other.isElement()) return;
    const pos = other.position();
    other.set('position', { x: pos.x + dx, y: pos.y + dy }, { silent: false });
  });
}

/**
 * Record starting positions for all selected elements when a drag begins.
 */
export function onElementDragStart(cell) {
  if (!selected.has(cell)) {
    replaceSelection([cell]);
  }
  _dragCell = cell;
  _dragOrigins = new Map();
  selected.forEach(c => {
    if (c.isElement()) _dragOrigins.set(c, { ...c.position() });
  });
}

/**
 * After a drag ends, record the collective move in history as one action.
 */
export function onElementDragEnd(cell) {
  if (!_dragOrigins || _dragOrigins.size === 0) return;

  const moves = [];
  _dragOrigins.forEach((origin, c) => {
    const current = c.position();
    if (current.x !== origin.x || current.y !== origin.y) {
      moves.push({ cell: c, from: origin, to: { ...current } });
    }
  });

  if (moves.length > 0) {
    history.recordMultiMove(moves);
  }

  _dragOrigins = null;
  _dragCell = null;

  // Re-check embed relationships for all moved elements
  selected.forEach(c => {
    if (!c.isElement()) return;
    const parent = findHaloParent(c, _graph);
    if (parent && canEmbed(parent, c)) {
      tuckChildInside(parent, c, _graph);
    }
  });
}

// ---------------------------------------------------------------------------
// Copy / paste
// ---------------------------------------------------------------------------

let _clipboard = [];

export function copySelected() {
  _clipboard = [...selected].filter(c => c.isElement() || c.isLink());
}

export function pasteClipboard() {
  if (_clipboard.length === 0) return;

  const OFFSET = 20;
  const clones = _clipboard.map(cell => {
    const clone = cell.clone();
    if (clone.isElement()) {
      const { x, y } = clone.position();
      clone.position(x + OFFSET, y + OFFSET);
    }
    return clone;
  });

  // Re-map links so their source/target point to the clones
  const idMap = new Map();
  _clipboard.forEach((orig, i) => idMap.set(orig.id, clones[i].id));

  clones.forEach(clone => {
    if (!clone.isLink()) return;
    const src = clone.get('source');
    const tgt = clone.get('target');
    if (src?.id && idMap.has(src.id)) clone.set('source', { ...src, id: idMap.get(src.id) });
    if (tgt?.id && idMap.has(tgt.id)) clone.set('target', { ...tgt, id: idMap.get(tgt.id) });
  });

  history.beginGroup();
  clones.forEach(c => _graph.addCell(c));
  history.endGroup();

  replaceSelection(clones);

  // The paste itself becomes the new clipboard (for repeated paste-offset)
  _clipboard = clones;
}

// Ctrl+C / Ctrl+V wiring
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    copySelected();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    pasteClipboard();
  }
});

// ---------------------------------------------------------------------------
// Alignment helpers (used by the toolbar align buttons)
// ---------------------------------------------------------------------------

export function alignSelected(direction) {
  const elements = [...selected].filter(c => c.isElement());
  if (elements.length < 2) return;

  const bboxes = elements.map(el => ({ el, bbox: el.getBBox() }));

  let refValue;
  switch (direction) {
    case 'left':   refValue = Math.min(...bboxes.map(b => b.bbox.x)); break;
    case 'right':  refValue = Math.max(...bboxes.map(b => b.bbox.x + b.bbox.width)); break;
    case 'top':    refValue = Math.min(...bboxes.map(b => b.bbox.y)); break;
    case 'bottom': refValue = Math.max(...bboxes.map(b => b.bbox.y + b.bbox.height)); break;
    case 'centerH': refValue = bboxes.reduce((s, b) => s + b.bbox.x + b.bbox.width / 2, 0) / bboxes.length; break;
    case 'centerV': refValue = bboxes.reduce((s, b) => s + b.bbox.y + b.bbox.height / 2, 0) / bboxes.length; break;
    default: return;
  }

  history.beginGroup();
  bboxes.forEach(({ el, bbox }) => {
    let nx = bbox.x, ny = bbox.y;
    switch (direction) {
      case 'left':    nx = refValue; break;
      case 'right':   nx = refValue - bbox.width; break;
      case 'top':     ny = refValue; break;
      case 'bottom':  ny = refValue - bbox.height; break;
      case 'centerH': nx = refValue - bbox.width / 2; break;
      case 'centerV': ny = refValue - bbox.height / 2; break;
    }
    el.position(nx, ny);
  });
  history.endGroup();
}

// Distribute evenly
export function distributeSelected(axis) {
  const elements = [...selected].filter(c => c.isElement());
  if (elements.length < 3) return;

  const bboxes = elements
    .map(el => ({ el, bbox: el.getBBox() }))
    .sort((a, b) => (axis === 'h' ? a.bbox.x - b.bbox.x : a.bbox.y - b.bbox.y));

  const first = bboxes[0].bbox;
  const last  = bboxes[bboxes.length - 1].bbox;
  const totalSpan = axis === 'h'
    ? (last.x + last.width) - first.x
    : (last.y + last.height) - first.y;
  const totalSize = bboxes.reduce((s, b) => s + (axis === 'h' ? b.bbox.width : b.bbox.height), 0);
  const gap = (totalSpan - totalSize) / (bboxes.length - 1);

  history.beginGroup();
  let cursor = axis === 'h' ? first.x : first.y;
  bboxes.forEach(({ el, bbox }) => {
    if (axis === 'h') {
      el.position(cursor, bbox.y);
      cursor += bbox.width + gap;
    } else {
      el.position(bbox.x, cursor);
      cursor += bbox.height + gap;
    }
  });
  history.endGroup();
}

// ---------------------------------------------------------------------------
// Long-press context menu (touch devices)
// ---------------------------------------------------------------------------

let longPressTimer = null;
let longPressMenu = null;

export function initLongPress(paper) {
  paper.on('cell:pointerdown', (view, evt) => {
    if (evt.pointerType !== 'touch') return;
    const cell = view.model;
    longPressTimer = setTimeout(() => {
      const touch = evt.changedTouches?.[0] || evt;
      if (!selected.has(cell)) replaceSelection([cell]);
      longPressMenu = showContextMenu(touch.clientX, touch.clientY, [...selected]);
    }, 500);
  });

  paper.on('cell:pointerup cell:pointermove', () => {
    clearTimeout(longPressTimer);
  });

  document.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);
  });
}

export function dismissLongPressMenu() {
  if (longPressMenu) {
    longPressMenu.remove();
    longPressMenu = null;
  }
}
