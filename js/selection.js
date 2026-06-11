// Selection manager — tracks selected elements
// Provides single-click, shift-click, rubber-band selection + halo (resize/move handles)

import * as history from './history.js?v=1.15.7';
import { updateSimpleNodeLayout, canEmbed, getContainerEmbeds, reparentEmbeds, snapActivationToLifeline, showDropGhost, hideDropGhost } from './canvas.js?v=1.15.7';

let graph, paper;
let _selectedCells = [];
let _haloViews = [];
let _onSelectionChange = null;
let _onHaloAction = null;

// ── rubberband ──────────────────────────────────────────────────────
let _rbActive = false;
let _rbStart = null;
let _rbEl = null;

export function init(_graph, _paper, opts = {}) {
  graph = _graph;
  paper = _paper;
  _onSelectionChange = opts.onSelectionChange || null;
  _onHaloAction = opts.onHaloAction || null;

  paper.on('cell:pointerdown', onCellPointerDown);
  paper.on('blank:pointerdown', onBlankPointerDown);
  paper.on('blank:pointerup', onBlankPointerUp);
  paper.on('cell:pointerup', onCellPointerUp);
  document.addEventListener('keydown', onKeyDown);
}

export function getSelection() {
  return [..._selectedCells];
}

export function setSelection(cells, opts = {}) {
  _clearHalos();
  _selectedCells = [...cells];
  _renderHalos();
  if (!opts.silent) _onSelectionChange?.(_selectedCells);
}

export function clearSelection(opts = {}) {
  setSelection([], opts);
}

export function addToSelection(cell) {
  if (_selectedCells.includes(cell)) return;
  setSelection([..._selectedCells, cell]);
}

export function removeFromSelection(cell) {
  setSelection(_selectedCells.filter(c => c !== cell));
}

export function isSelected(cell) {
  return _selectedCells.includes(cell);
}

// ── event handlers ──────────────────────────────────────────────────

function onCellPointerDown(cellView, evt) {
  const cell = cellView.model;

  // Let link-endpoint drags pass through without stealing selection
  if (cell.isLink()) return;

  if (evt.shiftKey) {
    if (isSelected(cell)) removeFromSelection(cell);
    else addToSelection(cell);
    return;
  }

  if (!isSelected(cell)) {
    setSelection([cell]);
  }
  // else: clicked inside a multi-selection — keep it, don't collapse
}

function onBlankPointerDown(evt, x, y) {
  // Middle-click / right-click — don't start rubber-band, just clear selection
  if (evt.button !== 0) {
    clearSelection();
    return;
  }
  // Left-click on blank without shift — clear immediately
  if (!evt.shiftKey) clearSelection();

  // Start rubber-band
  _rbActive = true;
  _rbStart = { x, y };
  _rbEl = document.createElement('div');
  _rbEl.className = 'df-rubberband';
  document.getElementById('canvas-container').appendChild(_rbEl);
  _updateRubberband(x, y);
}

function onBlankPointerUp(evt, x, y) {
  if (!_rbActive) return;
  const [rx, ry, rw, rh] = _rubberbandRect(_rbStart, { x, y });
  const area = new g.Rect(rx, ry, rw, rh);
  const inArea = graph.getElements().filter(el => {
    const bb = el.getBBox();
    return area.intersect(bb) !== null;
  });
  if (inArea.length > 0) {
    setSelection(inArea);
  }
  _endRubberband();
}

function onCellPointerUp(cellView, evt) {
  _endRubberband();
}

function onKeyDown(evt) {
  // Escape — clear selection
  if (evt.key === 'Escape') {
    clearSelection();
    return;
  }

  const isMeta = evt.metaKey || evt.ctrlKey;

  // Select all (Cmd/Ctrl+A)
  if (isMeta && evt.key === 'a') {
    evt.preventDefault();
    setSelection(graph.getElements());
    return;
  }

  if (_selectedCells.length === 0) return;

  // Delete / Backspace — delete selected
  if ((evt.key === 'Delete' || evt.key === 'Backspace') && !isInputTarget(evt)) {
    evt.preventDefault();
    deleteSelected();
    return;
  }

  // Arrow keys — nudge
  const STEP = evt.shiftKey ? 10 : 1;
  const deltas = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
  const delta = deltas[evt.key];
  if (delta && !isInputTarget(evt)) {
    evt.preventDefault();
    nudgeSelected(delta[0], delta[1]);
    return;
  }

  // Cmd/Ctrl + D — duplicate
  if (isMeta && evt.key === 'd') {
    evt.preventDefault();
    duplicateSelected();
    return;
  }

  // Cmd/Ctrl + C — copy
  if (isMeta && evt.key === 'c' && !isInputTarget(evt)) {
    evt.preventDefault();
    copySelected();
    return;
  }

  // Cmd/Ctrl + X — cut
  if (isMeta && evt.key === 'x' && !isInputTarget(evt)) {
    evt.preventDefault();
    cutSelected();
    return;
  }

  // Cmd/Ctrl + V — paste
  if (isMeta && evt.key === 'v' && !isInputTarget(evt)) {
    evt.preventDefault();
    pasteSelected();
    return;
  }
}

function isInputTarget(evt) {
  const tag = evt.target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || evt.target?.isContentEditable;
}

// ── rubber-band helpers ─────────────────────────────────────────────

function _updateRubberband(x, y) {
  if (!_rbEl || !_rbStart) return;
  const [rx, ry, rw, rh] = _rubberbandRect(_rbStart, { x, y });
  // convert local→client for CSS positioning
  const origin = paper.localToClientPoint(rx, ry);
  const corner = paper.localToClientPoint(rx + rw, ry + rh);
  const container = document.getElementById('canvas-container').getBoundingClientRect();
  _rbEl.style.left = (origin.x - container.left) + 'px';
  _rbEl.style.top = (origin.y - container.top) + 'px';
  _rbEl.style.width = (corner.x - origin.x) + 'px';
  _rbEl.style.height = (corner.y - origin.y) + 'px';
}

function _rubberbandRect(a, b) {
  const rx = Math.min(a.x, b.x);
  const ry = Math.min(a.y, b.y);
  const rw = Math.abs(a.x - b.x);
  const rh = Math.abs(a.y - b.y);
  return [rx, ry, rw, rh];
}

function _endRubberband() {
  _rbActive = false;
  _rbStart = null;
  if (_rbEl) { _rbEl.remove(); _rbEl = null; }
}

// paper mousemove — update rubber-band while dragging
// (JointJS doesn't expose blank:pointermove, so attach to the SVG directly)
let _svgMoveListener = null;
export function attachPaperMoveListener() {
  const svg = paper.el.querySelector('svg') || paper.el;
  _svgMoveListener = (evt) => {
    if (!_rbActive) return;
    const pt = paper.clientToLocalPoint(evt.clientX, evt.clientY);
    _updateRubberband(pt.x, pt.y);
  };
  svg.addEventListener('mousemove', _svgMoveListener);
}

// ── halo (resize + action handles) ─────────────────────────────────

function _clearHalos() {
  for (const hv of _haloViews) hv.remove();
  _haloViews = [];
}

function _renderHalos() {
  if (_selectedCells.length === 0) return;
  if (_selectedCells.length === 1) {
    const hv = new SingleHalo(_selectedCells[0]);
    _haloViews.push(hv);
  } else {
    const hv = new MultiHalo(_selectedCells);
    _haloViews.push(hv);
  }
}

// ─── SingleHalo ───────────────────────────────────────────────────────
class SingleHalo {
  constructor(cell) {
    this.cell = cell;
    this.el = null;
    this._listeners = [];
    this._resizing = false;
    this._moving = false;
    this._moveStart = null;
    this._ghostDropSize = null;
    this._ghostDropType = null;
    this._render();
    this._bindCellEvents();
  }

  _render() {
    this.remove();
    const bbox = this.cell.getBBox();
    const el = document.createElement('div');
    el.className = 'df-halo';
    this._positionEl(el, bbox);
    this._addHandles(el);
    document.getElementById('canvas-container').appendChild(el);
    this.el = el;
    this._bindHandleEvents();
  }

  _positionEl(el, bbox) {
    const container = document.getElementById('canvas-container').getBoundingClientRect();
    const tl = paper.localToClientPoint(bbox.x, bbox.y);
    const br = paper.localToClientPoint(bbox.x + bbox.width, bbox.y + bbox.height);
    el.style.left = (tl.x - container.left) + 'px';
    el.style.top = (tl.y - container.top) + 'px';
    el.style.width = (br.x - tl.x) + 'px';
    el.style.height = (br.y - tl.y) + 'px';
  }

  _addHandles(el) {
    const cell = this.cell;
    const type = cell.get('type');

    // ── Resize handles (corners + edges) ──
    const RESIZE_HANDLES = [
      { cls: 'nw', cursor: 'nw-resize' },
      { cls: 'n',  cursor: 'n-resize'  },
      { cls: 'ne', cursor: 'ne-resize' },
      { cls: 'e',  cursor: 'e-resize'  },
      { cls: 'se', cursor: 'se-resize' },
      { cls: 's',  cursor: 's-resize'  },
      { cls: 'sw', cursor: 'sw-resize' },
      { cls: 'w',  cursor: 'w-resize'  },
    ];
    for (const h of RESIZE_HANDLES) {
      const handle = document.createElement('div');
      handle.className = `df-halo__handle df-halo__handle--${h.cls}`;
      handle.style.cursor = h.cursor;
      handle.dataset.dir = h.cls;
      el.appendChild(handle);
    }

    // ── Action buttons ──
    const actions = [
      { id: 'delete', title: 'Delete', icon: deleteIcon() },
      { id: 'clone',  title: 'Duplicate', icon: cloneIcon() },
    ];

    // Link button — not for links or types that cannot be a link source
    const NO_LINK_TYPES = new Set(['sf.TextLabel', 'sf.Note', 'sf.Line', 'sf.Image']);
    if (!cell.isLink() && !NO_LINK_TYPES.has(type)) {
      actions.push({ id: 'link', title: 'Draw link', icon: linkIcon() });
    }

    for (const a of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `df-halo__action df-halo__action--${a.id}`;
      btn.title = a.title;
      btn.innerHTML = a.icon;
      btn.dataset.action = a.id;
      el.appendChild(btn);
    }
  }

  _bindHandleEvents() {
    const el = this.el;
    if (!el) return;

    // ── Resize ──
    for (const handle of el.querySelectorAll('.df-halo__handle')) {
      this._on(handle, 'mousedown', (e) => this._startResize(e, handle.dataset.dir));
    }

    // ── Actions ──
    for (const btn of el.querySelectorAll('.df-halo__action')) {
      this._on(btn, 'click', (e) => {
        e.stopPropagation();
        this._handleAction(btn.dataset.action);
      });
    }

    // ── Move (drag the halo body) ──
    this._on(el, 'mousedown', (e) => {
      if (e.target !== el) return; // only the body, not handles/buttons
      this._startMove(e);
    });
  }

  _bindCellEvents() {
    const refresh = () => { if (this.el) this._positionEl(this.el, this.cell.getBBox()); };
    this.cell.on('change:position change:size', refresh);
  }

  _on(target, type, fn) {
    target.addEventListener(type, fn);
    this._listeners.push({ target, type, fn });
  }

  remove() {
    for (const { target, type, fn } of this._listeners) target.removeEventListener(type, fn);
    this._listeners = [];
    if (this.el) { this.el.remove(); this.el = null; }
  }

  // ── Resize implementation ─────────────────────────────────────────
  _startResize(e, dir) {
    e.stopPropagation();
    e.preventDefault();
    this._resizing = true;
    const bbox = this.cell.getBBox();
    const startClient = { x: e.clientX, y: e.clientY };
    const startBbox = { ...bbox };
    const MIN = 20;

    // Initialise drop ghost for container-like shapes
    this._ghostDropSize = null;
    this._ghostDropType = null;
    const type = this.cell.get('type');
    if (['sf.Container', 'sf.Zone', 'sf.BpmnPool', 'sf.BpmnLane', 'sf.BpmnLoop',
         'sf.GanttTimeline', 'sf.SequenceParticipant', 'sf.SequenceActor', 'sf.Task'].includes(type)) {
      this._ghostDropType = type;
    }

    const onMove = (me) => {
      const dx = (me.clientX - startClient.x) / paper.scale().sx;
      const dy = (me.clientY - startClient.y) / paper.scale().sy;
      let { x, y, width, height } = startBbox;

      if (dir.includes('e')) width  = Math.max(MIN, width  + dx);
      if (dir.includes('s')) height = Math.max(MIN, height + dy);
      if (dir.includes('w')) { width  = Math.max(MIN, width  - dx); if (width  > MIN) x += dx; }
      if (dir.includes('n')) { height = Math.max(MIN, height - dy); if (height > MIN) y += dy; }

      this.cell.set({ position: { x, y }, size: { width, height } });
      updateSimpleNodeLayout(this.cell);

      // Live drop-ghost preview while resizing a container
      if (this._ghostDropType) {
        showDropGhost({ x, y, width, height }, this._ghostDropType, null);
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this._resizing = false;
      hideDropGhost();
      this._ghostDropSize = null;
      this._ghostDropType = null;
      history.captureResize(this.cell);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Move implementation ───────────────────────────────────────────
  _startMove(e) {
    e.stopPropagation();
    e.preventDefault();
    this._moving = true;

    const startClient = { x: e.clientX, y: e.clientY };
    const startPos = { ...this.cell.position() };
    const gridSize = paper.options.gridSize || 4;

    // Embed state at move-start (so we can reparent on move-end)
    const origParentId = this.cell.get('parent') || null;

    // v1.14.1 — collect child-offset map once at drag-start so children
    // translate rigidly with their parent (JointJS embeds don't auto-move).
    const embeds = getContainerEmbeds(this.cell);
    const childOffsets = embeds.map(ch => {
      const cp = ch.position();
      return { cell: ch, dx: cp.x - startPos.x, dy: cp.y - startPos.y };
    });

    const onMove = (me) => {
      const dx = (me.clientX - startClient.x) / paper.scale().sx;
      const dy = (me.clientY - startClient.y) / paper.scale().sy;
      const nx = Math.round((startPos.x + dx) / gridSize) * gridSize;
      const ny = Math.round((startPos.y + dy) / gridSize) * gridSize;
      this.cell.position(nx, ny);
      // Move children rigidly
      for (const { cell: ch, dx: cdx, dy: cdy } of childOffsets) {
        ch.position(nx + cdx, ny + cdy);
      }
      updateSimpleNodeLayout(this.cell);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this._moving = false;

      // Re-embed into whichever container now overlaps the dropped position.
      // Only fire when the element isn't already a child of the right parent.
      const pos = this.cell.position();
      const bbox = this.cell.getBBox();
      const childType = this.cell.get('type');

      // Walk candidates topmost-first; skip self and own embeds
      const ownIds = new Set([this.cell.id, ...embeds.map(c => c.id)]);
      const candidates = graph.findModelsInArea(bbox)
        .filter(c => !ownIds.has(c.id))
        .sort((a, b) => (b.get('z') || 0) - (a.get('z') || 0));

      let newParent = null;
      for (const c of candidates) {
        if (canEmbed(c.get('type'), childType)) { newParent = c; break; }
      }

      history.suppressEmbedTracking(() => {
        reparentEmbeds(this.cell, origParentId, newParent?.id || null);
      });

      // Snap sequence-activation to its lifeline after a move
      if (childType === 'sf.SequenceActivation') {
        snapActivationToLifeline(this.cell);
      }

      history.captureMove(this.cell);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Action dispatch ───────────────────────────────────────────────
  _handleAction(action) {
    if (action === 'delete') {
      deleteSelected();
    } else if (action === 'clone') {
      duplicateSelected();
    } else if (action === 'link') {
      _onHaloAction?.('link', this.cell);
    }
  }
}

// ─── MultiHalo ────────────────────────────────────────────────────────
class MultiHalo {
  constructor(cells) {
    this.cells = cells;
    this.el = null;
    this._listeners = [];
    this._render();
  }

  _render() {
    this.remove();
    const bbox = combinedBBox(this.cells);
    const el = document.createElement('div');
    el.className = 'df-halo df-halo--multi';
    positionHaloEl(el, bbox);

    // Delete + clone buttons for multi-select
    for (const [action, title, icon] of [['delete','Delete',deleteIcon()],['clone','Duplicate',cloneIcon()]]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `df-halo__action df-halo__action--${action}`;
      btn.title = title;
      btn.innerHTML = icon;
      btn.dataset.action = action;
      this._on(btn, 'click', (e) => { e.stopPropagation(); this._handleAction(action); });
      el.appendChild(btn);
    }

    document.getElementById('canvas-container').appendChild(el);
    this.el = el;

    // Move the whole selection
    this._on(el, 'mousedown', (e) => {
      if (e.target !== el) return;
      this._startMove(e);
    });
  }

  _on(target, type, fn) {
    target.addEventListener(type, fn);
    this._listeners.push({ target, type, fn });
  }

  remove() {
    for (const { target, type, fn } of this._listeners) target.removeEventListener(type, fn);
    this._listeners = [];
    if (this.el) { this.el.remove(); this.el = null; }
  }

  _startMove(e) {
    e.stopPropagation();
    e.preventDefault();
    const startClient = { x: e.clientX, y: e.clientY };
    const startPositions = this.cells.map(c => ({ cell: c, pos: { ...c.position() } }));
    const gridSize = paper.options.gridSize || 4;
    const bbox = combinedBBox(this.cells);
    const bboxStart = { x: bbox.x, y: bbox.y };

    const onMove = (me) => {
      const dx = (me.clientX - startClient.x) / paper.scale().sx;
      const dy = (me.clientY - startClient.y) / paper.scale().sy;
      const snappedBboxX = Math.round((bboxStart.x + dx) / gridSize) * gridSize;
      const snappedBboxY = Math.round((bboxStart.y + dy) / gridSize) * gridSize;
      const snapDx = snappedBboxX - bboxStart.x;
      const snapDy = snappedBboxY - bboxStart.y;
      for (const { cell, pos } of startPositions) {
        cell.position(pos.x + snapDx, pos.y + snapDy);
      }
      // Re-position the halo outline
      const newBbox = combinedBBox(this.cells);
      positionHaloEl(this.el, newBbox);
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      history.captureMultiMove(this.cells);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  _handleAction(action) {
    if (action === 'delete') deleteSelected();
    else if (action === 'clone') duplicateSelected();
  }
}

// ── helpers ─────────────────────────────────────────────────────────

function combinedBBox(cells) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) {
    const b = c.getBBox();
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function positionHaloEl(el, bbox) {
  const container = document.getElementById('canvas-container').getBoundingClientRect();
  const tl = paper.localToClientPoint(bbox.x, bbox.y);
  const br = paper.localToClientPoint(bbox.x + bbox.width, bbox.y + bbox.height);
  el.style.left = (tl.x - container.left) + 'px';
  el.style.top = (tl.y - container.top) + 'px';
  el.style.width = (br.x - tl.x) + 'px';
  el.style.height = (br.y - tl.y) + 'px';
}

// ── clipboard ────────────────────────────────────────────────────────
let _clipboard = [];

function copySelected() {
  _clipboard = _selectedCells.map(c => c.toJSON());
}

function cutSelected() {
  copySelected();
  deleteSelected();
}

function pasteSelected() {
  if (_clipboard.length === 0) return;
  const OFFSET = 20;
  const newCells = _clipboard.map(json => {
    const cell = graph.getCell(json.id);
    const clone = cell ? cell.clone() : joint.dia.Element.define(json.type, json).clone();
    // Offset position so paste isn't on top of original
    const pos = clone.position();
    clone.position(pos.x + OFFSET, pos.y + OFFSET);
    return clone;
  });
  graph.addCells(newCells);
  setSelection(newCells);
  history.captureAdd(newCells);
}

// ── actions ─────────────────────────────────────────────────────────

export function deleteSelected() {
  if (_selectedCells.length === 0) return;
  const toDelete = [..._selectedCells];
  clearSelection({ silent: true });
  history.captureRemove(toDelete);
  for (const cell of toDelete) {
    // Remove any links that touch this cell
    graph.getConnectedLinks(cell).forEach(link => link.remove());
    cell.remove();
  }
}

export function duplicateSelected() {
  if (_selectedCells.length === 0) return;
  const OFFSET = 20;
  const clones = _selectedCells.map(c => {
    const clone = c.clone();
    const pos = clone.position();
    clone.position(pos.x + OFFSET, pos.y + OFFSET);
    return clone;
  });
  graph.addCells(clones);
  setSelection(clones);
  history.captureAdd(clones);
}

function nudgeSelected(dx, dy) {
  const gridSize = paper.options.gridSize || 4;
  for (const cell of _selectedCells) {
    const pos = cell.position();
    cell.position(
      Math.round((pos.x + dx) / gridSize) * gridSize,
      Math.round((pos.y + dy) / gridSize) * gridSize,
    );
    updateSimpleNodeLayout(cell);
  }
  history.captureMultiMove(_selectedCells);
}

// ── SVG icon helpers ─────────────────────────────────────────────────
function deleteIcon() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
}
function cloneIcon() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="3" width="7" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M4 3V2a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}
function linkIcon() {
  return `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.5 1.5h2a3 3 0 010 6H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M6.5 11.5h-2a3 3 0 010-6H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M4.5 6.5h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

// ── public refresh ───────────────────────────────────────────────────
/** Re-render halos after an external change (e.g. undo/redo). */
export function refreshHalos() {
  _clearHalos();
  if (_selectedCells.length > 0) _renderHalos();
}
