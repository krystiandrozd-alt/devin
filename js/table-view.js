// Data Mapping — table view (Phase 2 overhaul + CR refinements).
//
// A strictly READ-ONLY spreadsheet-style view that mirrors data-object fields
// for the current diagram. The canvas remains the editing surface; this panel
// is for scanning and filtering large field inventories.
//
// Columns: Object  |  Field  |  Type  |  PK  |  Nullable  |  Length  |  Notes
// Rows   : one per field, grouped under a collapsible Object header.
//
// Interactions:
//   • Click an Object header row → select that DataObject on the canvas
//   • Click a field row          → select + scroll the parent DataObject into view
//   • Search box (top)           → live filter across object + field names
//   • Export CSV button          → download the visible rows as UTF-8 CSV

import { getDisplayName } from './canvas.js?v=1.15.7';

let _graph = null;
let _paper = null;
let _container = null;   // the wrapping panel element
let _tableEl  = null;    // <table> inside the panel
let _searchEl = null;    // search <input>
let _filterText = '';    // current filter string (lower-cased)

// ── init ─────────────────────────────────────────────────────────────

export function init(graph, paper, containerEl) {
  _graph = graph;
  _paper = paper;
  _container = containerEl;

  _searchEl = containerEl.querySelector('.df-table-search');
  if (_searchEl) {
    _searchEl.addEventListener('input', () => {
      _filterText = _searchEl.value.trim().toLowerCase();
      _render();
    });
  }

  const exportBtn = containerEl.querySelector('.df-table-export');
  if (exportBtn) exportBtn.addEventListener('click', exportCsv);

  // ── clear-search × button ─────────────────────────────────────────
  const clearBtn = containerEl.querySelector('.df-table-search-clear');
  if (clearBtn) {
    const updateClearVisibility = () => {
      clearBtn.hidden = !_searchEl?.value;
    };
    _searchEl?.addEventListener('input', updateClearVisibility);
    clearBtn.addEventListener('click', () => {
      if (_searchEl) { _searchEl.value = ''; _filterText = ''; }
      _render();
      updateClearVisibility();
    });
    updateClearVisibility();
  }

  _graph.on('add remove change', _render);
  _render();
}

// ── render ────────────────────────────────────────────────────────────

function _render() {
  if (!_container) return;

  const objects = _graph.getElements()
    .filter(el => el.get('type') === 'sf.DataObject')
    .sort((a, b) => {
      const na = _objectName(a).toLowerCase();
      const nb = _objectName(b).toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    });

  // Build or replace the <table>
  const table = document.createElement('table');
  table.className = 'df-table-view';

  // ── header row ───────────────────────────────────────────────────
  const thead = table.createTHead();
  const hrow = thead.insertRow();
  for (const col of ['Object', 'Field', 'Type', 'PK', 'Nullable', 'Length', 'Notes']) {
    const th = document.createElement('th');
    th.textContent = col;
    hrow.appendChild(th);
  }

  const tbody = table.createTBody();

  let visibleObjects = 0;

  for (const obj of objects) {
    const name   = _objectName(obj);
    const fields = _fields(obj);

    // Filter: an object is shown if its name or any field name matches.
    const objMatches = !_filterText || name.toLowerCase().includes(_filterText);
    const matchingFields = fields.filter(f =>
      !_filterText || name.toLowerCase().includes(_filterText) || f.name.toLowerCase().includes(_filterText),
    );
    if (!objMatches && matchingFields.length === 0) continue;
    visibleObjects++;

    // ── Object header row ─────────────────────────────────────────
    const objRow = tbody.insertRow();
    objRow.className = 'df-table-view__obj-row';
    objRow.dataset.objId = obj.id;
    const objCell = objRow.insertCell();
    objCell.colSpan = 7;
    objCell.className = 'df-table-view__obj-name';
    objCell.textContent = name;
    objRow.addEventListener('click', () => _selectOnCanvas(obj));

    // ── Field rows ────────────────────────────────────────────────
    for (const field of matchingFields) {
      const frow = tbody.insertRow();
      frow.className = 'df-table-view__field-row';
      frow.dataset.fieldName = field.name;
      // Highlight filtered fields if the filter didn't match on object name only
      if (_filterText && field.name.toLowerCase().includes(_filterText)) {
        frow.classList.add('df-table-view__field-row--match');
      }
      frow.addEventListener('click', () => _selectOnCanvas(obj));

      const td = (val) => { const c = frow.insertCell(); c.textContent = val ?? ''; return c; };
      td(name);   // repeat object name for CSV legibility (hidden via CSS on screen)
      td(field.name);
      td(field.type);
      const pkCell = frow.insertCell();
      if (field.pk) {
        pkCell.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="1.8" fill="currentColor"/></svg>`;
        pkCell.className = 'df-table-view__pk';
      }
      td(field.nullable ? '✓' : '');
      td(field.length ?? '');
      td(field.notes ?? '');
    }
  }

  // ── empty state ───────────────────────────────────────────────────
  if (visibleObjects === 0) {
    const erow = tbody.insertRow();
    const cell = erow.insertCell();
    cell.colSpan = 7;
    cell.className = 'df-table-view__empty';
    cell.textContent = _filterText
      ? 'No fields match the current filter.'
      : 'Add a Data Object to the canvas to see its fields here.';
  }

  // Swap in new table
  if (_tableEl) _tableEl.replaceWith(table);
  else _container.appendChild(table);
  _tableEl = table;
}

// ── helpers ──────────────────────────────────────────────────────────

function _objectName(obj) {
  return getDisplayName(obj) || 'Unnamed Object';
}

function _fields(obj) {
  // DataObject stores fields as an array on the `fields` attribute.
  return (obj.get('fields') || []).map(f => ({
    name:     f.name     || '',
    type:     f.type     || '',
    pk:       !!f.pk,
    nullable: f.nullable !== false,   // default true
    length:   f.length   ?? null,
    notes:    f.notes    || '',
  }));
}

function _selectOnCanvas(obj) {
  // Bring the element into view and fire the standard selection flow.
  const bbox = obj.getBBox();
  const center = bbox.center();
  _paper.translate(
    _paper.el.offsetWidth  / 2 - center.x * _paper.scale().sx,
    _paper.el.offsetHeight / 2 - center.y * _paper.scale().sy,
  );
  // Programmatic selection — trigger paper's cell:pointerdown equivalent
  const view = _paper.findViewByModel(obj);
  if (view) view.el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}

// ── CSV export ────────────────────────────────────────────────────────

function exportCsv() {
  const rows = [['Object', 'Field', 'Type', 'PK', 'Nullable', 'Length', 'Notes']];
  const objects = _graph.getElements().filter(el => el.get('type') === 'sf.DataObject');
  for (const obj of objects) {
    const name = _objectName(obj);
    for (const field of _fields(obj)) {
      rows.push([name, field.name, field.type, field.pk ? 'Yes' : '', field.nullable ? 'Yes' : 'No', field.length ?? '', field.notes ?? '']);
    }
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data-model.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
