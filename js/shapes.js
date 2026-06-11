// Custom JointJS shapes for SF Diagrams
// All shapes are under the `sf` namespace
// Uses JointJS v4 JSON markup array syntax

import { parseMarkdown } from './markdown.js?v=1.15.7';
import { fieldFocus } from './canvas/focus-state.js?v=1.15.7';

// ── Stable field identity (fid) ────────────────────────────────────
// Pre-1.15.0, sf.DataObject field ports were keyed by ARRAY INDEX
// (`field-left-2`), so reordering or deleting a field silently re-bound any
// connected link to whatever field then occupied that index. Each field now
// carries an immutable `fid`; ports are `field-left-<fid>` / `field-right-<fid>`
// so a link follows its field across reorder / delete / apiName rename. A fid
// only needs to be unique WITHIN one DataObject (port IDs are cell-scoped), so
// duplicated objects may safely share fids. The leading 'f' keeps a fid from
// ever matching the legacy numeric-index form, which lets the load migration
// (migration.js) distinguish old positional ports from new fid ports.
//
// INVARIANT: every field must have a fid before its ports are built. Guaranteed
// by sf.DataObject.initialize (construction: load / paste / factory) and
// re-asserted in DataObjectView._syncFieldPorts (covers fields added later via
// the editor). Any NEW field-creation path can rely on one of those two.
export function newFid(existing) {
  let id;
  do { id = 'f' + Math.random().toString(36).slice(2, 9); } while (existing && existing.has(id));
  return id;
}

export function ensureFieldFids(cell) {
  const fields = cell.get('fields');
  if (!Array.isArray(fields) || fields.length === 0) return;
  if (fields.every(f => f && f.fid)) return; // idempotent no-op once all fids exist
  const seen = new Set(fields.filter(f => f && f.fid).map(f => f.fid));
  cell.set('fields', fields.map(f => {
    if (f && !f.fid) { const id = newFid(seen); seen.add(id); return { ...f, fid: id }; }
    return f;
  }), { silent: true });
}

// Data Cloud mapping mode flag (per active diagram), wired from app.js. Read by
// DataObjectView._syncFieldPorts to decide whether EVERY field gets connectable
// ports (mapping) or only PK/FK fields (default ER).
let mappingModeGetter = null;
export function setMappingModeGetter(fn) { mappingModeGetter = fn; }

// Wraps a mutation in a single undo entry — wired from app.js to history.startBatch/endBatch so
// the DataObject collapse toggle (a `collapsed` prop change + the follow-on resize) is one undo.
let dataObjectHistoryBatcher = null;
export function setDataObjectHistoryBatcher(fn) { dataObjectHistoryBatcher = fn; }

// Reads the Auto-Fit Containers toggle (canvas.isAutoSizingEnabled) — wired from app.js. When on,
// collapsing/expanding a DataObject re-packs its lane (shifts same-parent siblings below it).
let autoFitGetter = null;
export function setAutoFitGetter(fn) { autoFitGetter = fn; }

// Does a field have a live link on either of its ports? Drives "Show Only Mapped"
// — connected fields stay visible so collapsing the rest never breaks a link.
function fieldHasLink(model, field) {
  const graph = model.graph;
  if (!graph || !field || !field.fid) return false;
  const left = `field-left-${field.fid}`, right = `field-right-${field.fid}`;
  for (const link of graph.getConnectedLinks(model)) {
    for (const end of ['source', 'target']) {
      const ep = link.get(end);
      if (ep && ep.id === model.id && (ep.port === left || ep.port === right)) return true;
    }
  }
  return false;
}

// The fields a DataObject currently renders — rows, ports, and height all agree on
// this single list:
//   • keyFieldsOnly off             → every field
//   • keyFieldsOnly on + mapping ON → mapped fields PLUS key (PK/FK) fields
//     ("Show Only Mapped": unmapped non-key rows collapse, but keys stay as
//     structural anchors so the object keeps context — and any field with a live
//     link always stays, so no JointJS link is ever destroyed)
//   • keyFieldsOnly on + mapping off → only PK/FK fields ("Key Fields Only")
export function getVisibleDataObjectFields(model) {
  const fields = model.get('fields') || [];
  if (!model.get('keyFieldsOnly')) return fields;
  const mapping = !!(mappingModeGetter && mappingModeGetter());
  return mapping
    ? fields.filter(f => f && (fieldHasLink(model, f) || f.keyType))
    : fields.filter(f => f && f.keyType);
}

// ── Markdown foreignObject helper (CR-6.1) ─────────────────────────
// sf.TextLabel and sf.Note render their text as native HTML inside an SVG
// <foreignObject> so inline markdown markers (**bold**, *italic*, ~~strike~~,
// `code`) round-trip through to visible markup. Raster export then converts
// the FO + HTML back into tspans via persistence.js → replaceForeignObjects.
//
// Idempotent — finds an existing FO by `data-md` marker or creates one. Safe
// to call from initialize/render/update without leaking DOM.
const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const SVG_NS_SHAPES = 'http://www.w3.org/2000/svg';

function ensureMarkdownFO(view, key, text, opts) {
  if (!view?.el) return;
  let fo = view.el.querySelector(`:scope > foreignObject[data-md="${key}"]`);
  if (!fo) {
    fo = document.createElementNS(SVG_NS_SHAPES, 'foreignObject');
    fo.setAttribute('data-md', key);
    // v1.12.1 — pointer-events:none on the FO itself so clicks pass
    // through to the SVG geometry beneath (hitArea on TextLabel /
    // Annotation, body on Note, header on DataObject, etc.). The
    // previous `pointer-events="all"` made the FO catch clicks but
    // didn't reliably propagate them to JointJS's element-view
    // delegation in Safari — the cell only became selectable via
    // Shift-drag rubber-band. Now selection always goes through proper
    // SVG geometry, which JointJS hit-tests bulletproof.
    fo.setAttribute('pointer-events', 'none');
    view.el.appendChild(fo);
  }
  fo.setAttribute('x', String(opts.x));
  fo.setAttribute('y', String(opts.y));
  fo.setAttribute('width', String(Math.max(0, opts.width)));
  fo.setAttribute('height', String(Math.max(0, opts.height)));

  // Two-level structure: outer `frame` div does flex-based centring (the
  // shape decides via opts.css whether to centre vertically/horizontally);
  // inner `content` div is block-level so `<br>` line breaks and inline
  // markdown elements lay out naturally. Without this nesting the inner
  // <br>s become flex items and stop working as line breaks.
  let frame = fo.firstChild;
  if (!frame || frame.nodeType !== 1 || frame.localName !== 'div' || !frame.dataset?.mdFrame) {
    while (fo.firstChild) fo.removeChild(fo.firstChild);
    frame = document.createElementNS(XHTML_NS, 'div');
    frame.setAttribute('xmlns', XHTML_NS);
    frame.dataset.mdFrame = '';
    const content = document.createElementNS(XHTML_NS, 'div');
    content.setAttribute('xmlns', XHTML_NS);
    content.dataset.mdContent = '';
    frame.appendChild(content);
    fo.appendChild(frame);
  }
  // Append `pointer-events:none; user-select:none` to the frame so the FO
  // itself catches the JointJS pointerdown (selection / drag) and the HTML
  // children don't start a browser text-selection mid-drag. The FO element's
  // `pointer-events="all"` attribute remains the actual hit target.
  frame.style.cssText = opts.css + ';pointer-events:none;user-select:none;';
  // The inner content div carries the rendered HTML; explicit display:block
  // so <br> + inline marks behave normally regardless of frame's flex.
  const content = frame.firstChild;
  content.style.cssText = 'display:block;max-width:100%;pointer-events:none;user-select:none;';
  // parseMarkdown escHtml's first, then applies only the four whitelisted
  // tags + <br>. innerHTML is safe here.
  content.innerHTML = parseMarkdown(text);
  // Hide the original SVG <text> node JointJS still emits (so its rendering
  // doesn't shadow / sit underneath our HTML). Done via inline style so it
  // survives JointJS attr-pass re-renders.
  if (opts.hideSelector) {
    const orig = view.el.querySelector(`[joint-selector="${opts.hideSelector}"]`);
    if (orig) orig.style.display = 'none';
  }
}
