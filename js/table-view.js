// Data Mapping — table view (Phase 2 overhaul + CR refinements).
//
// A strictly READ-ONLY spreadsheet-style view of all data-mapping links on
// the current canvas.  The panel is toggled from the toolbar; its contents
// refresh automatically whenever the graph changes.
//
// Each row represents one *DataMapping* link and shows:
//   Source Entity  |  Source Field  |  Target Entity  |  Target Field
//   Transformation |  Notes         |  Confidence
//
// Columns are sortable (click header) and the whole table is filterable via
// the search box at the top.  Rows highlight the corresponding link on the
// canvas when hovered.

import { FIELD_TYPES } from './components.js?v=1.15.7';

let _graph = null;
let _paper = null;
let _panelEl = null;
let _tableEl = null;
let _searchEl = null;
let _visible = false;

let _sortCol = 0;
let _sortAsc = true;

const COL_HEADERS = [
  'Source Entity',
  'Source Field',
  'Target Entity',
  'Target Field',
  'Transformation',
  'Notes',
  'Confidence',
];

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function init(graph, paper) {
  _graph = graph;
  _paper = paper;

  _panelEl = document.getElementById('table-view-panel');
  _tableEl = document.getElementById('table-view-table');
  _searchEl = document.getElementById('table-view-search');

  if (!_panelEl || !_tableEl || !_searchEl) {
    console.warn('SF Diagrams: table-view DOM elements missing');
    return;
  }

  // Refresh on any graph change
  _graph.on('change add remove', () => {
    if (_visible) refresh();
  });

  _searchEl.addEventListener('input', () => {
    if (_visible) refresh();
  });

  // Header sort handled via delegation (re-attached on each refresh)
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

export function toggle() {
  _visible = !_visible;
  _panelEl.classList.toggle('open', _visible);
  if (_visible) refresh();
}

export function show() {
  _visible = true;
  _panelEl.classList.add('open');
  refresh();
}

export function hide() {
  _visible = false;
  _panelEl.classList.remove('open');
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function buildData() {
  if (!_graph) return { rows: [], headers: COL_HEADERS };

  const links = _graph.getLinks().filter(l => {
    const type = l.get('type') || '';
    return type.toLowerCase().includes('datamapping');
  });

  const rows = links.map(link => {
    const attrs  = link.get('attrs') || {};
    const props  = link.get('properties') || {};
    const labels = link.get('labels') || [];

    const srcId  = link.get('source')?.id;
    const tgtId  = link.get('target')?.id;
    const srcEl  = srcId ? _graph.getCell(srcId) : null;
    const tgtEl  = tgtId ? _graph.getCell(tgtId) : null;

    const srcEntity = srcEl?.get('attrs')?.label?.text
                   || srcEl?.get('label')
                   || srcId
                   || '—';
    const tgtEntity = tgtEl?.get('attrs')?.label?.text
                   || tgtEl?.get('label')
                   || tgtId
                   || '—';

    const srcField  = props.sourceField  || labels[0]?.attrs?.text?.text || '—';
    const tgtField  = props.targetField  || labels[1]?.attrs?.text?.text || '—';
    const transform = props.transformation || '—';
    const notes     = props.notes         || '—';
    const confidence = props.confidence   != null ? `${Math.round(props.confidence * 100)}%` : '—';

    return {
      linkId: link.id,
      cells: [srcEntity, srcField, tgtEntity, tgtField, transform, notes, confidence],
    };
  });

  return { rows, headers: COL_HEADERS };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function refresh() {
  const { rows, headers } = buildData();
  const query = _searchEl.value.trim().toLowerCase();

  // Filter
  const filtered = query
    ? rows.filter(r => r.cells.some(c => String(c).toLowerCase().includes(query)))
    : rows;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const av = a.cells[_sortCol] || '';
    const bv = b.cells[_sortCol] || '';
    return _sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  // Build table
  _tableEl.innerHTML = '';

  // Header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach((h, i) => {
    const th = document.createElement('th');
    th.textContent = h;
    th.dataset.col = i;
    if (_sortCol === i) {
      th.classList.add(_sortAsc ? 'sort-asc' : 'sort-desc');
    }
    th.addEventListener('click', () => {
      if (_sortCol === i) {
        _sortAsc = !_sortAsc;
      } else {
        _sortCol = i;
        _sortAsc = true;
      }
      refresh();
    });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  _tableEl.appendChild(thead);

  // Body rows
  const tbody = document.createElement('tbody');
  if (sorted.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = headers.length;
    td.className = 'table-empty';
    td.textContent = query ? 'No results match your search.' : 'No data-mapping links on this canvas.';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    sorted.forEach(row => {
      const tr = document.createElement('tr');
      tr.dataset.linkId = row.linkId;

      row.cells.forEach(val => {
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });

      // Hover → highlight link on canvas
      tr.addEventListener('mouseenter', () => highlightLink(row.linkId, true));
      tr.addEventListener('mouseleave', () => highlightLink(row.linkId, false));

      // Click → select link
      tr.addEventListener('click', () => selectLink(row.linkId));

      tbody.appendChild(tr);
    });
  }

  _tableEl.appendChild(tbody);
}

// ---------------------------------------------------------------------------
// Canvas interaction helpers
// ---------------------------------------------------------------------------

function highlightLink(id, on) {
  if (!_graph || !_paper) return;
  const link = _graph.getCell(id);
  if (!link) return;
  const view = _paper.findViewByModel(link);
  if (!view) return;
  view.el.classList.toggle('table-highlight', on);
}

function selectLink(id) {
  if (!_graph) return;
  const link = _graph.getCell(id);
  if (!link) return;
  // Delegate to the selection module if available
  try {
    import('./selection.js?v=1.15.7').then(sel => sel.select(link));
  } catch {
    // selection module not available
  }
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportRowsCsv(rows) {
  const lines = [COL_HEADERS.join(',')];
  rows.forEach(row => {
    const escaped = row.cells.map(v => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(escaped.join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `data-mapping-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMappingCsv() {
  if (!_graph) return;
  exportRowsCsv(buildData().rows);
}
