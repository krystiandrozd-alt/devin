// Stencil panel — draggable component library
// Organizes built-in components + saved templates by category, search, drag-to-canvas

import { COMPONENT_CATEGORIES, BPMN_CATEGORIES, DATAMODEL_CATEGORIES, DATAMAPPING_CATEGORIES, GANTT_CATEGORIES, ORG_CATEGORIES, SEQUENCE_CATEGORIES, createElementFromComponent } from './components.js?v=1.15.7';
import { getAllIcons, getCategories } from './icons.js?v=1.15.7';
import { updateSimpleNodeLayout, snapActivationToLifeline, canEmbed, findHaloParent, tuckChildInside, showDropGhost, hideDropGhost } from './canvas.js?v=1.15.7';
import { startImageAddFlow } from './image-component.js?v=1.15.7';
import * as history from './history.js?v=1.15.7';
import { getTemplates, deleteTemplate, renderTemplateThumbnail, instantiateTemplate, onTemplatesChange } from './templates.js?v=1.15.7';
import { confirmModal } from './feedback.js?v=1.15.7';
import { DIAGRAM_TYPES } from './tabs.js?v=1.15.7'; // reader-friendly workspace labels (no cycle: tabs ⊄ stencil)

let graph, paper;
let panelEl, searchEl, bodyEl;
let currentDiagramType = 'architecture';

export function init(_graph, _paper) {
  graph = _graph;
  paper = _paper;
  panelEl = document.getElementById('stencil-panel');
  searchEl = document.getElementById('stencil-search');
  bodyEl = document.getElementById('stencil-categories');

  renderCategories();

  // Re-render when the saved-template library changes (save / delete) so the
  // "My {Type} Templates" / "My Other Templates" categories appear, update their
  // counts, or disappear.
  onTemplatesChange(() => renderCategories());

  // Gap 17 (v1.12.0) — clear-× button shows when the search has a value;
  // clicks wipe the field and re-run the filter so the user can return to
  // the full palette without selecting + deleting.
  const clearBtn = document.getElementById('btn-stencil-search-clear');
  const refreshClearVisibility = () =>
    clearBtn.classList.toggle('visible', searchEl.value.length > 0);
  searchEl.addEventListener('input', refreshClearVisibility);
  clearBtn.addEventListener('click', () => {
    searchEl.value = '';
    refreshClearVisibility();
    filterComponents('');
  });

  searchEl.addEventListener('input', (e) => filterComponents(e.target.value));

  initDragFromStencil();
}

export function setDiagramType(type) {
  currentDiagramType = type;
  renderCategories();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function getCategoriesForType(type) {
  switch (type) {
    case 'bpmn':        return BPMN_CATEGORIES;
    case 'datamodel':   return DATAMODEL_CATEGORIES;
    case 'datamapping': return DATAMAPPING_CATEGORIES;
    case 'gantt':       return GANTT_CATEGORIES;
    case 'org':         return ORG_CATEGORIES;
    case 'sequence':    return SEQUENCE_CATEGORIES;
    default:            return COMPONENT_CATEGORIES;
  }
}

function renderCategories() {
  bodyEl.innerHTML = '';

  // ── Icon sub-panel (architecture only) ──────────────────────────────────
  if (currentDiagramType === 'architecture') {
    const iconSection = buildIconSection();
    if (iconSection) bodyEl.appendChild(iconSection);
  }

  // ── Shape categories ────────────────────────────────────────────────────
  const cats = getCategoriesForType(currentDiagramType);
  cats.forEach(cat => {
    const section = buildCategorySection(cat.name, cat.components);
    bodyEl.appendChild(section);
  });

  // ── Saved user templates ─────────────────────────────────────────────────
  renderTemplateCategories();
}

function buildCategorySection(name, components) {
  const section  = document.createElement('div');
  section.className = 'stencil-category';

  const header = document.createElement('div');
  header.className = 'stencil-category-header';

  const title = document.createElement('span');
  title.textContent = name;

  const arrow = document.createElement('span');
  arrow.className = 'stencil-arrow';
  arrow.textContent = '▾';

  header.appendChild(title);
  header.appendChild(arrow);

  const grid = document.createElement('div');
  grid.className = 'stencil-grid';

  components.forEach(comp => {
    const item = buildStencilItem(comp);
    grid.appendChild(item);
  });

  section.appendChild(header);
  section.appendChild(grid);

  // collapse / expand
  header.addEventListener('click', () => {
    const collapsed = section.classList.toggle('collapsed');
    arrow.textContent = collapsed ? '▸' : '▾';
  });

  return section;
}

function buildStencilItem(comp) {
  const item = document.createElement('div');
  item.className = 'stencil-item';
  item.dataset.compId = comp.id;
  item.draggable = true;

  const preview = document.createElement('div');
  preview.className = 'stencil-preview';

  // Build a minimal SVG preview from the component definition
  const svg = renderComponentPreview(comp);
  preview.appendChild(svg);

  const label = document.createElement('div');
  label.className = 'stencil-label';
  label.textContent = comp.label;

  item.appendChild(preview);
  item.appendChild(label);
  return item;
}

// ---------------------------------------------------------------------------
// Icon section (architecture diagrams)
// ---------------------------------------------------------------------------

function buildIconSection() {
  const iconCats = getCategories();
  if (!iconCats || iconCats.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'stencil-category stencil-icons-section';

  const header = document.createElement('div');
  header.className = 'stencil-category-header';

  const title = document.createElement('span');
  title.textContent = 'Icons';

  const arrow = document.createElement('span');
  arrow.className = 'stencil-arrow';
  arrow.textContent = '▾';

  header.appendChild(title);
  header.appendChild(arrow);

  const body = document.createElement('div');
  body.className = 'stencil-icons-body';

  // Sub-categories for icons
  iconCats.forEach(cat => {
    const subSection = document.createElement('div');
    subSection.className = 'stencil-icon-cat';

    const subHeader = document.createElement('div');
    subHeader.className = 'stencil-icon-cat-header';
    subHeader.textContent = cat.name;

    const subGrid = document.createElement('div');
    subGrid.className = 'stencil-icon-grid';

    const icons = getAllIcons(cat.id);
    icons.forEach(icon => {
      const iconEl = document.createElement('div');
      iconEl.className = 'stencil-icon-item';
      iconEl.dataset.iconId = icon.id;
      iconEl.draggable = true;
      iconEl.title = icon.label;
      iconEl.innerHTML = icon.svg;
      subGrid.appendChild(iconEl);
    });

    subSection.appendChild(subHeader);
    subSection.appendChild(subGrid);
    body.appendChild(subSection);
  });

  section.appendChild(header);
  section.appendChild(body);

  header.addEventListener('click', () => {
    const collapsed = section.classList.toggle('collapsed');
    arrow.textContent = collapsed ? '▸' : '▾';
  });

  return section;
}

// ---------------------------------------------------------------------------
// Saved templates section
// ---------------------------------------------------------------------------

function renderTemplateCategories() {
  const all = getTemplates();
  if (!all || all.length === 0) return;

  // Group by diagramType, then collect any whose type doesn't match as 'other'
  const matching = all.filter(t => t.diagramType === currentDiagramType);
  const others   = all.filter(t => t.diagramType !== currentDiagramType);

  if (matching.length > 0) {
    const label = DIAGRAM_TYPES[currentDiagramType] || currentDiagramType;
    const section = buildTemplateSection(`My ${label} Templates`, matching);
    bodyEl.appendChild(section);
  }

  if (others.length > 0) {
    const section = buildTemplateSection('My Other Templates', others);
    bodyEl.appendChild(section);
  }
}

function buildTemplateSection(title, templates) {
  const section = document.createElement('div');
  section.className = 'stencil-category stencil-template-section';

  const header = document.createElement('div');
  header.className = 'stencil-category-header';

  const titleEl = document.createElement('span');
  titleEl.textContent = title;

  const arrow = document.createElement('span');
  arrow.className = 'stencil-arrow';
  arrow.textContent = '▾';

  header.appendChild(titleEl);
  header.appendChild(arrow);

  const grid = document.createElement('div');
  grid.className = 'stencil-grid stencil-template-grid';

  templates.forEach(tpl => {
    const item = buildTemplateItem(tpl);
    grid.appendChild(item);
  });

  section.appendChild(header);
  section.appendChild(grid);

  header.addEventListener('click', () => {
    const collapsed = section.classList.toggle('collapsed');
    arrow.textContent = collapsed ? '▸' : '▾';
  });

  return section;
}

function buildTemplateItem(tpl) {
  const item = document.createElement('div');
  item.className = 'stencil-item stencil-template-item';
  item.dataset.templateId = tpl.id;
  item.draggable = true;

  const thumb = document.createElement('div');
  thumb.className = 'stencil-preview stencil-template-thumb';
  renderTemplateThumbnail(tpl, thumb);

  const label = document.createElement('div');
  label.className = 'stencil-label';
  label.textContent = tpl.name;

  // Delete button
  const del = document.createElement('button');
  del.className = 'stencil-template-delete';
  del.title = 'Delete template';
  del.textContent = '×';
  del.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await confirmModal(`Delete template "${tpl.name}"?`);
    if (ok) deleteTemplate(tpl.id);
  });

  item.appendChild(thumb);
  item.appendChild(label);
  item.appendChild(del);
  return item;
}

// ---------------------------------------------------------------------------
// Search / filter
// ---------------------------------------------------------------------------

function filterComponents(query) {
  const q = query.trim().toLowerCase();
  const items = bodyEl.querySelectorAll('.stencil-item');

  if (!q) {
    items.forEach(el => (el.style.display = ''));
    bodyEl.querySelectorAll('.stencil-category').forEach(s => (s.style.display = ''));
    return;
  }

  bodyEl.querySelectorAll('.stencil-category').forEach(section => {
    const sectionItems = section.querySelectorAll('.stencil-item');
    let anyVisible = false;

    sectionItems.forEach(el => {
      const labelText = el.querySelector('.stencil-label')?.textContent.toLowerCase() || '';
      const iconTitle  = el.title?.toLowerCase() || '';
      const visible = labelText.includes(q) || iconTitle.includes(q);
      el.style.display = visible ? '' : 'none';
      if (visible) anyVisible = true;
    });

    section.style.display = anyVisible ? '' : 'none';
    if (anyVisible) {
      // Expand section so matches are visible
      section.classList.remove('collapsed');
      const arrow = section.querySelector('.stencil-arrow');
      if (arrow) arrow.textContent = '▾';
    }
  });
}

// ---------------------------------------------------------------------------
// Minimal SVG preview renderer
// ---------------------------------------------------------------------------

function renderComponentPreview(comp) {
  const W = 56, H = 40;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const shape = comp.defaultAttrs?.shape || comp.type || 'rectangle';
  const fill  = '#e8f0fe';
  const stroke = '#4a6fa5';
  const sw = 1.5;

  if (shape === 'circle' || shape === 'ellipse') {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    el.setAttribute('cx', W / 2); el.setAttribute('cy', H / 2);
    el.setAttribute('rx', W / 2 - 3); el.setAttribute('ry', H / 2 - 3);
    el.setAttribute('fill', fill); el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', sw);
    svg.appendChild(el);
  } else if (shape === 'diamond' || shape === 'rhombus') {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', `${W/2},3 ${W-3},${H/2} ${W/2},${H-3} 3,${H/2}`);
    poly.setAttribute('fill', fill); poly.setAttribute('stroke', stroke); poly.setAttribute('stroke-width', sw);
    svg.appendChild(poly);
  } else if (shape === 'cylinder') {
    // simplified cylinder: rect + ellipse top
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', 8); r.setAttribute('y', 8); r.setAttribute('width', W - 16); r.setAttribute('height', H - 10);
    r.setAttribute('fill', fill); r.setAttribute('stroke', stroke); r.setAttribute('stroke-width', sw);
    svg.appendChild(r);
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    e.setAttribute('cx', W / 2); e.setAttribute('cy', 8);
    e.setAttribute('rx', (W - 16) / 2); e.setAttribute('ry', 4);
    e.setAttribute('fill', fill); e.setAttribute('stroke', stroke); e.setAttribute('stroke-width', sw);
    svg.appendChild(e);
  } else {
    // default: rounded rectangle
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', 3); r.setAttribute('y', 3); r.setAttribute('width', W - 6); r.setAttribute('height', H - 6);
    r.setAttribute('rx', 4); r.setAttribute('ry', 4);
    r.setAttribute('fill', fill); r.setAttribute('stroke', stroke); r.setAttribute('stroke-width', sw);
    svg.appendChild(r);
  }

  return svg;
}

// ---------------------------------------------------------------------------
// Drag-from-stencil
// ---------------------------------------------------------------------------

function initDragFromStencil() {
  bodyEl.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.stencil-item');
    if (!item) return;

    if (item.dataset.templateId) {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'template',
        templateId: item.dataset.templateId,
      }));
    } else if (item.dataset.compId) {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'component',
        compId: item.dataset.compId,
      }));
    }

    const iconItem = e.target.closest('.stencil-icon-item');
    if (iconItem) {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'icon',
        iconId: iconItem.dataset.iconId,
      }));
    }
  });

  // Touch-drag support (mobile / tablet)
  let touchDragPayload = null;
  let touchGhost = null;

  bodyEl.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.stencil-item, .stencil-icon-item');
    if (!item) return;

    if (item.dataset.templateId) {
      touchDragPayload = { type: 'template', templateId: item.dataset.templateId };
    } else if (item.dataset.compId) {
      touchDragPayload = { type: 'component', compId: item.dataset.compId };
    } else if (item.dataset.iconId) {
      touchDragPayload = { type: 'icon', iconId: item.dataset.iconId };
    }

    // Create ghost
    touchGhost = item.cloneNode(true);
    touchGhost.style.cssText = 'position:fixed;opacity:0.7;pointer-events:none;z-index:9999;';
    document.body.appendChild(touchGhost);
  }, { passive: true });

  bodyEl.addEventListener('touchmove', (e) => {
    if (!touchGhost) return;
    const t = e.touches[0];
    touchGhost.style.left = `${t.clientX - 28}px`;
    touchGhost.style.top  = `${t.clientY - 20}px`;
    showDropGhost(t.clientX, t.clientY);
  }, { passive: true });

  bodyEl.addEventListener('touchend', (e) => {
    if (touchGhost) { touchGhost.remove(); touchGhost = null; }
    hideDropGhost();
    if (!touchDragPayload) return;

    const t = e.changedTouches[0];
    const payload = touchDragPayload;
    touchDragPayload = null;

    try {
      const canvasEl = document.getElementById('canvas');
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      if (t.clientX < rect.left || t.clientX > rect.right ||
          t.clientY < rect.top  || t.clientY > rect.bottom) return;

      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;

      if (payload.type === 'template') {
        instantiateTemplate(payload.templateId, { x, y });
      } else if (payload.type === 'component') {
        const elem = createElementFromComponent(payload.compId, x, y);
        if (elem) {
          graph.addCell(elem);
          const embedParent = findHaloParent(elem, graph);
          if (embedParent && canEmbed(embedParent, elem)) {
            tuckChildInside(embedParent, elem, graph);
          }
        }
      } else if (payload.type === 'icon') {
        startImageAddFlow({ iconId: payload.iconId, x, y });
      }
    } catch (err) {
      console.warn('SF Diagrams: Touch drop failed:', err);
    }
  });
}
