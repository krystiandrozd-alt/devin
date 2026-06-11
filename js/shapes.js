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
