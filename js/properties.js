// Properties panel — left sidebar element inspector
// Properties are grouped into collapsible accordion sections

import { wrapSelectionWithMarker } from './markdown.js?v=1.15.7';
import { confirmModal, showToast, buildModal } from './feedback.js?v=1.15.7';
import { buildColorInput } from './color-input.js?v=1.15.7';

// ─── accordion helper ───────────────────────────────────────────────────────

function buildAccordion(id, title, contentEl, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'prop-accordion' + (opts.open ? ' open' : '');
  wrap.dataset.section = id;

  const hdr = document.createElement('div');
  hdr.className = 'prop-accordion-header';
  hdr.innerHTML = `<span>${title}</span><svg class="chevron" viewBox="0 0 10 6"><polyline points="1,1 5,5 9,1"/></svg>`;

  const body = document.createElement('div');
  body.className = 'prop-accordion-body';
  body.appendChild(contentEl);

  hdr.addEventListener('click', () => {
    wrap.classList.toggle('open');
  });

  wrap.appendChild(hdr);
  wrap.appendChild(body);
  return wrap;
}

// ─── label / input row helper ────────────────────────────────────────────────

function row(labelText, inputEl, opts = {}) {
  const r = document.createElement('div');
  r.className = 'prop-row' + (opts.wide ? ' wide' : '');

  if (labelText) {
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    if (opts.for) lbl.htmlFor = opts.for;
    r.appendChild(lbl);
  }

  if (inputEl) r.appendChild(inputEl);
  return r;
}

// ─── number input ────────────────────────────────────────────────────────────

function numInput(value, opts = {}) {
  const el = document.createElement('input');
  el.type = 'number';
  el.className = 'prop-num';
  el.value = value ?? '';
  if (opts.min !== undefined) el.min = opts.min;
  if (opts.max !== undefined) el.max = opts.max;
  if (opts.step !== undefined) el.step = opts.step;
  if (opts.placeholder !== undefined) el.placeholder = opts.placeholder;
  if (opts.disabled) el.disabled = true;
  return el;
}

// ─── select input ────────────────────────────────────────────────────────────

function selectInput(options, current) {
  const el = document.createElement('select');
  el.className = 'prop-select';
  for (const [val, label] of options) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    if (val === current) opt.selected = true;
    el.appendChild(opt);
  }
  return el;
}

// ─── text input ──────────────────────────────────────────────────────────────

function textInput(value, opts = {}) {
  const el = document.createElement('input');
  el.type = 'text';
  el.className = 'prop-text';
  el.value = value ?? '';
  if (opts.placeholder) el.placeholder = opts.placeholder;
  if (opts.disabled) el.disabled = true;
  return el;
}

// ─── textarea ────────────────────────────────────────────────────────────────

function textArea(value, opts = {}) {
  const el = document.createElement('textarea');
  el.className = 'prop-textarea';
  el.value = value ?? '';
  el.rows = opts.rows ?? 3;
  if (opts.placeholder) el.placeholder = opts.placeholder;
  if (opts.disabled) el.disabled = true;
  return el;
}

// ─── checkbox ────────────────────────────────────────────────────────────────

function checkBox(checked, id) {
  const el = document.createElement('input');
  el.type = 'checkbox';
  el.className = 'prop-check';
  el.id = id;
  el.checked = !!checked;
  return el;
}

// ─── icon button ─────────────────────────────────────────────────────────────

function iconBtn(svgPath, title, cls = '') {
  const btn = document.createElement('button');
  btn.className = 'prop-icon-btn' + (cls ? ' ' + cls : '');
  btn.title = title;
  btn.innerHTML = `<svg viewBox="0 0 16 16">${svgPath}</svg>`;
  return btn;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHAPE PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildShapeProperties(shape, diagram, onChange) {
  const frag = document.createDocumentFragment();

  // ── geometry section ──
  const geoContent = document.createElement('div');
  geoContent.className = 'prop-section-content';

  // x / y
  const xIn = numInput(Math.round(shape.x), { step: 1 });
  const yIn = numInput(Math.round(shape.y), { step: 1 });
  xIn.addEventListener('change', () => onChange({ x: parseFloat(xIn.value) }));
  yIn.addEventListener('change', () => onChange({ y: parseFloat(yIn.value) }));
  const xyRow = document.createElement('div');
  xyRow.className = 'prop-row twin';
  xyRow.appendChild(row('X', xIn));
  xyRow.appendChild(row('Y', yIn));
  geoContent.appendChild(xyRow);

  // width / height
  const wIn = numInput(Math.round(shape.width), { min: 10, step: 1 });
  const hIn = numInput(Math.round(shape.height), { min: 10, step: 1 });
  wIn.addEventListener('change', () => onChange({ width: parseFloat(wIn.value) }));
  hIn.addEventListener('change', () => onChange({ height: parseFloat(hIn.value) }));
  const whRow = document.createElement('div');
  whRow.className = 'prop-row twin';
  whRow.appendChild(row('W', wIn));
  whRow.appendChild(row('H', hIn));
  geoContent.appendChild(whRow);

  // rotation
  const rotIn = numInput(Math.round((shape.rotation ?? 0) * 180 / Math.PI), { step: 1 });
  rotIn.addEventListener('change', () =>
    onChange({ rotation: parseFloat(rotIn.value) * Math.PI / 180 }));
  geoContent.appendChild(row('Rotation°', rotIn));

  frag.appendChild(buildAccordion('geometry', 'Geometry', geoContent, { open: true }));

  // ── fill section ──
  const fillContent = document.createElement('div');
  fillContent.className = 'prop-section-content';

  const fillColorIn = buildColorInput(shape.fillColor ?? '#ffffff', (c) =>
    onChange({ fillColor: c }));
  fillContent.appendChild(row('Color', fillColorIn));

  const fillOpaIn = numInput((shape.fillOpacity ?? 1) * 100, { min: 0, max: 100, step: 1 });
  fillOpaIn.addEventListener('change', () =>
    onChange({ fillOpacity: parseFloat(fillOpaIn.value) / 100 }));
  fillContent.appendChild(row('Opacity %', fillOpaIn));

  const fillStyleSel = selectInput([
    ['solid', 'Solid'], ['none', 'None'], ['hatch', 'Hatch'],
    ['dots', 'Dots'], ['cross', 'Cross'],
  ], shape.fillStyle ?? 'solid');
  fillStyleSel.addEventListener('change', () => onChange({ fillStyle: fillStyleSel.value }));
  fillContent.appendChild(row('Style', fillStyleSel));

  frag.appendChild(buildAccordion('fill', 'Fill', fillContent, { open: true }));

  // ── stroke section ──
  const strokeContent = document.createElement('div');
  strokeContent.className = 'prop-section-content';

  const strokeColorIn = buildColorInput(shape.strokeColor ?? '#000000', (c) =>
    onChange({ strokeColor: c }));
  strokeContent.appendChild(row('Color', strokeColorIn));

  const strokeWidthIn = numInput(shape.strokeWidth ?? 1, { min: 0, max: 50, step: 0.5 });
  strokeWidthIn.addEventListener('change', () =>
    onChange({ strokeWidth: parseFloat(strokeWidthIn.value) }));
  strokeContent.appendChild(row('Width', strokeWidthIn));

  const strokeStyleSel = selectInput([
    ['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted'], ['none', 'None'],
  ], shape.strokeStyle ?? 'solid');
  strokeStyleSel.addEventListener('change', () => onChange({ strokeStyle: strokeStyleSel.value }));
  strokeContent.appendChild(row('Style', strokeStyleSel));

  frag.appendChild(buildAccordion('stroke', 'Stroke', strokeContent));

  // ── text section ──
  const textContent = document.createElement('div');
  textContent.className = 'prop-section-content';

  const labelIn = textArea(shape.label ?? '', { placeholder: 'Label…' });
  labelIn.addEventListener('input', () => onChange({ label: labelIn.value }));
  textContent.appendChild(row('Label', labelIn, { wide: true }));

  const fontSizeIn = numInput(shape.fontSize ?? 14, { min: 6, max: 144, step: 1 });
  fontSizeIn.addEventListener('change', () =>
    onChange({ fontSize: parseFloat(fontSizeIn.value) }));
  textContent.appendChild(row('Size', fontSizeIn));

  const fontFamilySel = selectInput([
    ['sans-serif', 'Sans-serif'], ['serif', 'Serif'],
    ['monospace', 'Monospace'], ['cursive', 'Cursive'],
  ], shape.fontFamily ?? 'sans-serif');
  fontFamilySel.addEventListener('change', () => onChange({ fontFamily: fontFamilySel.value }));
  textContent.appendChild(row('Font', fontFamilySel));

  const textColorIn = buildColorInput(shape.textColor ?? '#000000', (c) =>
    onChange({ textColor: c }));
  textContent.appendChild(row('Color', textColorIn));

  const boldChk = checkBox(shape.bold, 'prop-bold');
  boldChk.addEventListener('change', () => onChange({ bold: boldChk.checked }));
  const italicChk = checkBox(shape.italic, 'prop-italic');
  italicChk.addEventListener('change', () => onChange({ italic: italicChk.checked }));

  const styleRow = document.createElement('div');
  styleRow.className = 'prop-row twin';
  const boldRow = row('Bold', boldChk); boldRow.appendChild(boldChk);
  const italicRow = row('Italic', italicChk); italicRow.appendChild(italicChk);
  styleRow.appendChild(boldRow);
  styleRow.appendChild(italicRow);
  textContent.appendChild(styleRow);

  const alignSel = selectInput([
    ['left', 'Left'], ['center', 'Center'], ['right', 'Right'],
  ], shape.textAlign ?? 'center');
  alignSel.addEventListener('change', () => onChange({ textAlign: alignSel.value }));
  textContent.appendChild(row('Align', alignSel));

  frag.appendChild(buildAccordion('text', 'Text', textContent));

  // ── shadow section ──
  const shadowContent = document.createElement('div');
  shadowContent.className = 'prop-section-content';

  const shadowChk = checkBox(shape.shadow, 'prop-shadow');
  shadowChk.addEventListener('change', () => onChange({ shadow: shadowChk.checked }));
  shadowContent.appendChild(row('Enable', shadowChk, { for: 'prop-shadow' }));

  const shadowColorIn = buildColorInput(shape.shadowColor ?? '#00000066', (c) =>
    onChange({ shadowColor: c }));
  shadowContent.appendChild(row('Color', shadowColorIn));

  const shadowBlurIn = numInput(shape.shadowBlur ?? 4, { min: 0, max: 50, step: 1 });
  shadowBlurIn.addEventListener('change', () =>
    onChange({ shadowBlur: parseFloat(shadowBlurIn.value) }));
  shadowContent.appendChild(row('Blur', shadowBlurIn));

  const shadowXIn = numInput(shape.shadowX ?? 2, { step: 1 });
  shadowXIn.addEventListener('change', () =>
    onChange({ shadowX: parseFloat(shadowXIn.value) }));
  const shadowYIn = numInput(shape.shadowY ?? 2, { step: 1 });
  shadowYIn.addEventListener('change', () =>
    onChange({ shadowY: parseFloat(shadowYIn.value) }));
  const shadowOffRow = document.createElement('div');
  shadowOffRow.className = 'prop-row twin';
  shadowOffRow.appendChild(row('Offset X', shadowXIn));
  shadowOffRow.appendChild(row('Offset Y', shadowYIn));
  shadowContent.appendChild(shadowOffRow);

  frag.appendChild(buildAccordion('shadow', 'Shadow', shadowContent));

  // ── corner / shape-specific ──
  if (shape.type === 'rect' || shape.type === 'rounded-rect') {
    const cornerContent = document.createElement('div');
    cornerContent.className = 'prop-section-content';

    const radiusIn = numInput(shape.cornerRadius ?? 0, { min: 0, max: 200, step: 1 });
    radiusIn.addEventListener('change', () =>
      onChange({ cornerRadius: parseFloat(radiusIn.value) }));
    cornerContent.appendChild(row('Radius', radiusIn));

    frag.appendChild(buildAccordion('corner', 'Corner', cornerContent));
  }

  if (shape.type === 'polygon') {
    const polyContent = document.createElement('div');
    polyContent.className = 'prop-section-content';

    const sidesIn = numInput(shape.sides ?? 6, { min: 3, max: 20, step: 1 });
    sidesIn.addEventListener('change', () =>
      onChange({ sides: parseInt(sidesIn.value, 10) }));
    polyContent.appendChild(row('Sides', sidesIn));

    frag.appendChild(buildAccordion('polygon', 'Polygon', polyContent));
  }

  if (shape.type === 'star') {
    const starContent = document.createElement('div');
    starContent.className = 'prop-section-content';

    const pointsIn = numInput(shape.points ?? 5, { min: 3, max: 20, step: 1 });
    pointsIn.addEventListener('change', () =>
      onChange({ points: parseInt(pointsIn.value, 10) }));
    starContent.appendChild(row('Points', pointsIn));

    const innerRatioIn = numInput(((shape.innerRatio ?? 0.4) * 100).toFixed(0),
      { min: 10, max: 90, step: 1 });
    innerRatioIn.addEventListener('change', () =>
      onChange({ innerRatio: parseFloat(innerRatioIn.value) / 100 }));
    starContent.appendChild(row('Inner %', innerRatioIn));

    frag.appendChild(buildAccordion('star', 'Star', starContent));
  }

  // ── link section ──
  const linkContent = document.createElement('div');
  linkContent.className = 'prop-section-content';

  const linkIn = textInput(shape.link ?? '', { placeholder: 'https://…' });
  linkIn.addEventListener('change', () => onChange({ link: linkIn.value.trim() || null }));
  linkContent.appendChild(row('URL', linkIn, { wide: true }));

  const linkTargetSel = selectInput([
    ['_blank', 'New tab'], ['_self', 'Same tab'],
  ], shape.linkTarget ?? '_blank');
  linkTargetSel.addEventListener('change', () => onChange({ linkTarget: linkTargetSel.value }));
  linkContent.appendChild(row('Open in', linkTargetSel));

  frag.appendChild(buildAccordion('link', 'Link', linkContent));

  // ── metadata section ──
  const metaContent = document.createElement('div');
  metaContent.className = 'prop-section-content';

  const tooltipIn = textArea(shape.tooltip ?? '', { placeholder: 'Tooltip on hover…', rows: 2 });
  tooltipIn.addEventListener('input', () => onChange({ tooltip: tooltipIn.value || null }));
  metaContent.appendChild(row('Tooltip', tooltipIn, { wide: true }));

  const tagIn = textInput(shape.tag ?? '', { placeholder: 'custom-tag' });
  tagIn.addEventListener('change', () => onChange({ tag: tagIn.value.trim() || null }));
  metaContent.appendChild(row('Tag', tagIn));

  frag.appendChild(buildAccordion('meta', 'Metadata', metaContent));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONNECTOR PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildConnectorProperties(conn, diagram, onChange) {
  const frag = document.createDocumentFragment();

  // ── stroke section ──
  const strokeContent = document.createElement('div');
  strokeContent.className = 'prop-section-content';

  const colorIn = buildColorInput(conn.color ?? '#444444', (c) => onChange({ color: c }));
  strokeContent.appendChild(row('Color', colorIn));

  const widthIn = numInput(conn.width ?? 2, { min: 0.5, max: 30, step: 0.5 });
  widthIn.addEventListener('change', () => onChange({ width: parseFloat(widthIn.value) }));
  strokeContent.appendChild(row('Width', widthIn));

  const styleIn = selectInput([
    ['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted'],
  ], conn.style ?? 'solid');
  styleIn.addEventListener('change', () => onChange({ style: styleIn.value }));
  strokeContent.appendChild(row('Style', styleIn));

  const opacityIn = numInput((conn.opacity ?? 1) * 100, { min: 0, max: 100, step: 1 });
  opacityIn.addEventListener('change', () =>
    onChange({ opacity: parseFloat(opacityIn.value) / 100 }));
  strokeContent.appendChild(row('Opacity %', opacityIn));

  frag.appendChild(buildAccordion('stroke', 'Stroke', strokeContent, { open: true }));

  // ── routing section ──
  const routeContent = document.createElement('div');
  routeContent.className = 'prop-section-content';

  const routeSel = selectInput([
    ['straight', 'Straight'], ['orthogonal', 'Orthogonal'],
    ['curved', 'Curved'], ['arc', 'Arc'],
  ], conn.routing ?? 'straight');
  routeSel.addEventListener('change', () => onChange({ routing: routeSel.value }));
  routeContent.appendChild(row('Routing', routeSel));

  frag.appendChild(buildAccordion('routing', 'Routing', routeContent, { open: true }));

  // ── arrow ends ──
  const arrowContent = document.createElement('div');
  arrowContent.className = 'prop-section-content';

  const arrowOptions = [
    ['none', 'None'], ['arrow', 'Arrow'], ['open-arrow', 'Open'],
    ['diamond', 'Diamond'], ['circle', 'Circle'], ['square', 'Square'],
  ];

  const startSel = selectInput(arrowOptions, conn.startMarker ?? 'none');
  startSel.addEventListener('change', () => onChange({ startMarker: startSel.value }));
  arrowContent.appendChild(row('Start', startSel));

  const endSel = selectInput(arrowOptions, conn.endMarker ?? 'arrow');
  endSel.addEventListener('change', () => onChange({ endMarker: endSel.value }));
  arrowContent.appendChild(row('End', endSel));

  const markerSizeIn = numInput(conn.markerSize ?? 8, { min: 2, max: 40, step: 1 });
  markerSizeIn.addEventListener('change', () =>
    onChange({ markerSize: parseFloat(markerSizeIn.value) }));
  arrowContent.appendChild(row('Marker size', markerSizeIn));

  frag.appendChild(buildAccordion('arrows', 'Arrows', arrowContent, { open: true }));

  // ── label section ──
  const labelContent = document.createElement('div');
  labelContent.className = 'prop-section-content';

  const lblIn = textInput(conn.label ?? '', { placeholder: 'Edge label…' });
  lblIn.addEventListener('input', () => onChange({ label: lblIn.value }));
  labelContent.appendChild(row('Text', lblIn, { wide: true }));

  const lblFontSizeIn = numInput(conn.labelFontSize ?? 12, { min: 6, max: 72, step: 1 });
  lblFontSizeIn.addEventListener('change', () =>
    onChange({ labelFontSize: parseFloat(lblFontSizeIn.value) }));
  labelContent.appendChild(row('Size', lblFontSizeIn));

  const lblColorIn = buildColorInput(conn.labelColor ?? '#333333', (c) =>
    onChange({ labelColor: c }));
  labelContent.appendChild(row('Color', lblColorIn));

  frag.appendChild(buildAccordion('label', 'Label', labelContent));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TEXT / STICKY PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildTextProperties(item, diagram, onChange) {
  const frag = document.createDocumentFragment();

  // ── position ──
  const posContent = document.createElement('div');
  posContent.className = 'prop-section-content';

  const xIn = numInput(Math.round(item.x), { step: 1 });
  const yIn = numInput(Math.round(item.y), { step: 1 });
  xIn.addEventListener('change', () => onChange({ x: parseFloat(xIn.value) }));
  yIn.addEventListener('change', () => onChange({ y: parseFloat(yIn.value) }));
  const xyRow = document.createElement('div');
  xyRow.className = 'prop-row twin';
  xyRow.appendChild(row('X', xIn));
  xyRow.appendChild(row('Y', yIn));
  posContent.appendChild(xyRow);

  frag.appendChild(buildAccordion('position', 'Position', posContent, { open: true }));

  // ── text ──
  const textContent = document.createElement('div');
  textContent.className = 'prop-section-content';

  const bodyIn = textArea(item.body ?? '', { placeholder: 'Text…', rows: 4 });
  bodyIn.addEventListener('input', () => onChange({ body: bodyIn.value }));
  textContent.appendChild(row('Content', bodyIn, { wide: true }));

  const fontSizeIn = numInput(item.fontSize ?? 14, { min: 6, max: 144, step: 1 });
  fontSizeIn.addEventListener('change', () =>
    onChange({ fontSize: parseFloat(fontSizeIn.value) }));
  textContent.appendChild(row('Size', fontSizeIn));

  const fontFamilySel = selectInput([
    ['sans-serif', 'Sans-serif'], ['serif', 'Serif'],
    ['monospace', 'Monospace'], ['cursive', 'Cursive'],
  ], item.fontFamily ?? 'sans-serif');
  fontFamilySel.addEventListener('change', () => onChange({ fontFamily: fontFamilySel.value }));
  textContent.appendChild(row('Font', fontFamilySel));

  const textColorIn = buildColorInput(item.color ?? '#000000', (c) => onChange({ color: c }));
  textContent.appendChild(row('Color', textColorIn));

  frag.appendChild(buildAccordion('text', 'Text', textContent, { open: true }));

  // ── sticky-specific ──
  if (item.type === 'sticky') {
    const stickyContent = document.createElement('div');
    stickyContent.className = 'prop-section-content';

    const bgIn = buildColorInput(item.bgColor ?? '#fff9c4', (c) => onChange({ bgColor: c }));
    stickyContent.appendChild(row('Background', bgIn));

    const rotIn = numInput(Math.round((item.rotation ?? 0) * 180 / Math.PI), { step: 1 });
    rotIn.addEventListener('change', () =>
      onChange({ rotation: parseFloat(rotIn.value) * Math.PI / 180 }));
    stickyContent.appendChild(row('Rotation°', rotIn));

    frag.appendChild(buildAccordion('sticky', 'Sticky note', stickyContent));
  }

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  IMAGE PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildImageProperties(img, diagram, onChange) {
  const frag = document.createDocumentFragment();

  // ── geometry ──
  const geoContent = document.createElement('div');
  geoContent.className = 'prop-section-content';

  const xIn = numInput(Math.round(img.x), { step: 1 });
  const yIn = numInput(Math.round(img.y), { step: 1 });
  xIn.addEventListener('change', () => onChange({ x: parseFloat(xIn.value) }));
  yIn.addEventListener('change', () => onChange({ y: parseFloat(yIn.value) }));
  const xyRow = document.createElement('div');
  xyRow.className = 'prop-row twin';
  xyRow.appendChild(row('X', xIn));
  xyRow.appendChild(row('Y', yIn));
  geoContent.appendChild(xyRow);

  const wIn = numInput(Math.round(img.width), { min: 10, step: 1 });
  const hIn = numInput(Math.round(img.height), { min: 10, step: 1 });
  wIn.addEventListener('change', () => onChange({ width: parseFloat(wIn.value) }));
  hIn.addEventListener('change', () => onChange({ height: parseFloat(hIn.value) }));
  const whRow = document.createElement('div');
  whRow.className = 'prop-row twin';
  whRow.appendChild(row('W', wIn));
  whRow.appendChild(row('H', hIn));
  geoContent.appendChild(whRow);

  const lockAspectChk = checkBox(img.lockAspect ?? true, 'prop-lock-aspect');
  lockAspectChk.addEventListener('change', () =>
    onChange({ lockAspect: lockAspectChk.checked }));
  geoContent.appendChild(row('Lock aspect', lockAspectChk, { for: 'prop-lock-aspect' }));

  frag.appendChild(buildAccordion('geometry', 'Geometry', geoContent, { open: true }));

  // ── appearance ──
  const appContent = document.createElement('div');
  appContent.className = 'prop-section-content';

  const opacityIn = numInput((img.opacity ?? 1) * 100, { min: 0, max: 100, step: 1 });
  opacityIn.addEventListener('change', () =>
    onChange({ opacity: parseFloat(opacityIn.value) / 100 }));
  appContent.appendChild(row('Opacity %', opacityIn));

  const fitSel = selectInput([
    ['contain', 'Contain'], ['cover', 'Cover'],
    ['fill', 'Fill'], ['none', 'None'],
  ], img.fit ?? 'contain');
  fitSel.addEventListener('change', () => onChange({ fit: fitSel.value }));
  appContent.appendChild(row('Fit', fitSel));

  frag.appendChild(buildAccordion('appearance', 'Appearance', appContent, { open: true }));

  // ── border ──
  const borderContent = document.createElement('div');
  borderContent.className = 'prop-section-content';

  const borderColorIn = buildColorInput(img.borderColor ?? '#000000', (c) =>
    onChange({ borderColor: c }));
  borderContent.appendChild(row('Color', borderColorIn));

  const borderWidthIn = numInput(img.borderWidth ?? 0, { min: 0, max: 20, step: 0.5 });
  borderWidthIn.addEventListener('change', () =>
    onChange({ borderWidth: parseFloat(borderWidthIn.value) }));
  borderContent.appendChild(row('Width', borderWidthIn));

  const borderRadiusIn = numInput(img.borderRadius ?? 0, { min: 0, max: 200, step: 1 });
  borderRadiusIn.addEventListener('change', () =>
    onChange({ borderRadius: parseFloat(borderRadiusIn.value) }));
  borderContent.appendChild(row('Radius', borderRadiusIn));

  frag.appendChild(buildAccordion('border', 'Border', borderContent));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  FRAME PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildFrameProperties(frame, diagram, onChange) {
  const frag = document.createDocumentFragment();

  // ── geometry ──
  const geoContent = document.createElement('div');
  geoContent.className = 'prop-section-content';

  const xIn = numInput(Math.round(frame.x), { step: 1 });
  const yIn = numInput(Math.round(frame.y), { step: 1 });
  xIn.addEventListener('change', () => onChange({ x: parseFloat(xIn.value) }));
  yIn.addEventListener('change', () => onChange({ y: parseFloat(yIn.value) }));
  const xyRow = document.createElement('div');
  xyRow.className = 'prop-row twin';
  xyRow.appendChild(row('X', xIn));
  xyRow.appendChild(row('Y', yIn));
  geoContent.appendChild(xyRow);

  const wIn = numInput(Math.round(frame.width), { min: 50, step: 1 });
  const hIn = numInput(Math.round(frame.height), { min: 50, step: 1 });
  wIn.addEventListener('change', () => onChange({ width: parseFloat(wIn.value) }));
  hIn.addEventListener('change', () => onChange({ height: parseFloat(hIn.value) }));
  const whRow = document.createElement('div');
  whRow.className = 'prop-row twin';
  whRow.appendChild(row('W', wIn));
  whRow.appendChild(row('H', hIn));
  geoContent.appendChild(whRow);

  frag.appendChild(buildAccordion('geometry', 'Geometry', geoContent, { open: true }));

  // ── title ──
  const titleContent = document.createElement('div');
  titleContent.className = 'prop-section-content';

  const titleIn = textInput(frame.title ?? '', { placeholder: 'Frame title…' });
  titleIn.addEventListener('input', () => onChange({ title: titleIn.value }));
  titleContent.appendChild(row('Title', titleIn, { wide: true }));

  const titleSizeIn = numInput(frame.titleFontSize ?? 13, { min: 8, max: 48, step: 1 });
  titleSizeIn.addEventListener('change', () =>
    onChange({ titleFontSize: parseFloat(titleSizeIn.value) }));
  titleContent.appendChild(row('Font size', titleSizeIn));

  const titleColorIn = buildColorInput(frame.titleColor ?? '#333333', (c) =>
    onChange({ titleColor: c }));
  titleContent.appendChild(row('Color', titleColorIn));

  frag.appendChild(buildAccordion('title', 'Title', titleContent, { open: true }));

  // ── background ──
  const bgContent = document.createElement('div');
  bgContent.className = 'prop-section-content';

  const bgColorIn = buildColorInput(frame.bgColor ?? '#f5f5f5', (c) =>
    onChange({ bgColor: c }));
  bgContent.appendChild(row('Color', bgColorIn));

  const bgOpacityIn = numInput((frame.bgOpacity ?? 1) * 100, { min: 0, max: 100, step: 1 });
  bgOpacityIn.addEventListener('change', () =>
    onChange({ bgOpacity: parseFloat(bgOpacityIn.value) / 100 }));
  bgContent.appendChild(row('Opacity %', bgOpacityIn));

  frag.appendChild(buildAccordion('background', 'Background', bgContent));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  DIAGRAM (canvas) PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildDiagramProperties(diagram, onChange) {
  const frag = document.createDocumentFragment();

  // ── canvas ──
  const canvasContent = document.createElement('div');
  canvasContent.className = 'prop-section-content';

  const bgColorIn = buildColorInput(diagram.bgColor ?? '#ffffff', (c) =>
    onChange({ bgColor: c }));
  canvasContent.appendChild(row('Background', bgColorIn));

  const gridChk = checkBox(diagram.showGrid ?? true, 'prop-grid');
  gridChk.addEventListener('change', () => onChange({ showGrid: gridChk.checked }));
  canvasContent.appendChild(row('Show grid', gridChk, { for: 'prop-grid' }));

  const snapChk = checkBox(diagram.snapToGrid ?? true, 'prop-snap');
  snapChk.addEventListener('change', () => onChange({ snapToGrid: snapChk.checked }));
  canvasContent.appendChild(row('Snap to grid', snapChk, { for: 'prop-snap' }));

  const gridSizeIn = numInput(diagram.gridSize ?? 20, { min: 5, max: 200, step: 5 });
  gridSizeIn.addEventListener('change', () =>
    onChange({ gridSize: parseInt(gridSizeIn.value, 10) }));
  canvasContent.appendChild(row('Grid size', gridSizeIn));

  frag.appendChild(buildAccordion('canvas', 'Canvas', canvasContent, { open: true }));

  // ── page ──
  const pageContent = document.createElement('div');
  pageContent.className = 'prop-section-content';

  const pageNameIn = textInput(diagram.pageName ?? '', { placeholder: 'Page name…' });
  pageNameIn.addEventListener('input', () => onChange({ pageName: pageNameIn.value }));
  pageContent.appendChild(row('Name', pageNameIn, { wide: true }));

  frag.appendChild(buildAccordion('page', 'Page', pageContent));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MULTI-SELECTION PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildMultiProperties(items, diagram, onChange) {
  const frag = document.createDocumentFragment();

  const info = document.createElement('p');
  info.className = 'prop-multi-info';
  info.textContent = `${items.length} items selected`;
  frag.appendChild(info);

  // shared fill color
  const fillContent = document.createElement('div');
  fillContent.className = 'prop-section-content';

  const firstFill = items.find(i => i.fillColor)?.fillColor ?? '#ffffff';
  const fillColorIn = buildColorInput(firstFill, (c) => onChange({ fillColor: c }));
  fillContent.appendChild(row('Color', fillColorIn));

  frag.appendChild(buildAccordion('fill', 'Fill', fillContent, { open: true }));

  // shared stroke color
  const strokeContent = document.createElement('div');
  strokeContent.className = 'prop-section-content';

  const firstStroke = items.find(i => i.strokeColor)?.strokeColor ?? '#000000';
  const strokeColorIn = buildColorInput(firstStroke, (c) => onChange({ strokeColor: c }));
  strokeContent.appendChild(row('Color', strokeColorIn));

  const strokeWidthIn = numInput('', { placeholder: 'mixed', step: 0.5 });
  strokeWidthIn.addEventListener('change', () => {
    const v = parseFloat(strokeWidthIn.value);
    if (!isNaN(v)) onChange({ strokeWidth: v });
  });
  strokeContent.appendChild(row('Width', strokeWidthIn));

  frag.appendChild(buildAccordion('stroke', 'Stroke', strokeContent));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROPERTIES PANEL CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

export class PropertiesPanel {
  constructor(containerEl, diagram) {
    this._container = containerEl;
    this._diagram = diagram;
    this._selection = [];
    this._pendingRender = false;
  }

  // ── public API ──────────────────────────────────────────────────────────

  setDiagram(diagram) {
    this._diagram = diagram;
    this._scheduleRender();
  }

  setSelection(items) {
    this._selection = items ?? [];
    this._scheduleRender();
  }

  clear() {
    this._selection = [];
    this._render();
  }

  // ── rendering ───────────────────────────────────────────────────────────

  _scheduleRender() {
    if (this._pendingRender) return;
    this._pendingRender = true;
    requestAnimationFrame(() => {
      this._pendingRender = false;
      this._render();
    });
  }

  _render() {
    const c = this._container;
    c.innerHTML = '';

    const sel = this._selection;

    if (sel.length === 0) {
      // nothing selected → show diagram properties
      const header = document.createElement('div');
      header.className = 'prop-panel-header';
      header.textContent = 'Diagram';
      c.appendChild(header);

      const frag = buildDiagramProperties(this._diagram, (patch) => {
        Object.assign(this._diagram, patch);
        this._diagram.emit?.('change', { type: 'diagram', patch });
      });
      c.appendChild(frag);
      return;
    }

    if (sel.length > 1) {
      const header = document.createElement('div');
      header.className = 'prop-panel-header';
      header.textContent = `Selection (${sel.length})`;
      c.appendChild(header);

      const frag = buildMultiProperties(sel, this._diagram, (patch) => {
        for (const item of sel) {
          Object.assign(item, patch);
          this._diagram.emit?.('change', { type: 'multi', ids: sel.map(i => i.id), patch });
        }
      });
      c.appendChild(frag);
      return;
    }

    const item = sel[0];
    const header = document.createElement('div');
    header.className = 'prop-panel-header';
    header.textContent = _itemTypeLabel(item);
    c.appendChild(header);

    const emit = (patch) => {
      Object.assign(item, patch);
      this._diagram.emit?.('change', { type: 'item', id: item.id, patch });
    };

    let frag;
    switch (item._kind) {
      case 'shape':     frag = buildShapeProperties(item, this._diagram, emit); break;
      case 'connector': frag = buildConnectorProperties(item, this._diagram, emit); break;
      case 'text':
      case 'sticky':    frag = buildTextProperties(item, this._diagram, emit); break;
      case 'image':     frag = buildImageProperties(item, this._diagram, emit); break;
      case 'frame':     frag = buildFrameProperties(item, this._diagram, emit); break;
      default:
        frag = document.createDocumentFragment();
        const msg = document.createElement('p');
        msg.textContent = 'No editable properties.';
        frag.appendChild(msg);
    }
    c.appendChild(frag);
  }
}

function _itemTypeLabel(item) {
  const map = {
    shape: 'Shape', connector: 'Connector', text: 'Text',
    sticky: 'Sticky note', image: 'Image', frame: 'Frame',
  };
  return map[item._kind] ?? 'Element';
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONTEXT MENU (right-click) INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

export function buildContextMenu(items, pos, diagram, callbacks) {
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = pos.x + 'px';
  menu.style.top  = pos.y + 'px';

  const addItem = (label, action, opts = {}) => {
    const li = document.createElement('div');
    li.className = 'ctx-item' + (opts.danger ? ' danger' : '') + (opts.disabled ? ' disabled' : '');
    li.textContent = label;
    if (!opts.disabled) li.addEventListener('click', () => { action(); menu.remove(); });
    menu.appendChild(li);
  };

  const addSep = () => {
    const s = document.createElement('div');
    s.className = 'ctx-sep';
    menu.appendChild(s);
  };

  const sel = items;
  const single = sel.length === 1;
  const any = sel.length > 0;

  if (any) {
    addItem('Cut',  () => callbacks.cut?.(sel));
    addItem('Copy', () => callbacks.copy?.(sel));
  }
  addItem('Paste', () => callbacks.paste?.(pos), { disabled: !callbacks.canPaste?.() });

  if (any) {
    addSep();
    addItem('Bring to Front', () => callbacks.bringToFront?.(sel));
    addItem('Send to Back',   () => callbacks.sendToBack?.(sel));
    addItem('Bring Forward',  () => callbacks.bringForward?.(sel));
    addItem('Send Backward',  () => callbacks.sendBackward?.(sel));
  }

  if (any) {
    addSep();
    addItem('Group',   () => callbacks.group?.(sel),   { disabled: sel.length < 2 });
    addItem('Ungroup', () => callbacks.ungroup?.(sel), { disabled: !sel.some(i => i._kind === 'group') });
  }

  if (single) {
    const item = sel[0];
    if (item._kind === 'shape' || item._kind === 'text') {
      addSep();
      addItem('Edit label', () => callbacks.editLabel?.(item));
    }
    if (item._kind === 'image') {
      addSep();
      addItem('Replace image…', () => callbacks.replaceImage?.(item));
    }
    if (item._kind === 'connector') {
      addSep();
      addItem('Reverse direction', () => callbacks.reverseConnector?.(item));
    }
  }

  if (any) {
    addSep();
    addItem('Align left',   () => callbacks.align?.(sel, 'left'));
    addItem('Align center', () => callbacks.align?.(sel, 'center'));
    addItem('Align right',  () => callbacks.align?.(sel, 'right'));
    addItem('Align top',    () => callbacks.align?.(sel, 'top'));
    addItem('Align middle', () => callbacks.align?.(sel, 'middle'));
    addItem('Align bottom', () => callbacks.align?.(sel, 'bottom'));
  }

  if (any) {
    addSep();
    addItem('Lock',   () => callbacks.lock?.(sel));
    addItem('Unlock', () => callbacks.unlock?.(sel));
  }

  if (any) {
    addSep();
    addItem('Delete', () => callbacks.delete?.(sel), { danger: true });
  }

  // close on outside click
  const onOutside = (e) => {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', onOutside); }
  };
  document.addEventListener('mousedown', onOutside);

  return menu;
}

// ═══════════════════════════════════════════════════════════════════════════
//  INLINE LABEL EDITOR
// ═══════════════════════════════════════════════════════════════════════════

export function openInlineLabelEditor(item, canvasEl, viewMatrix, onCommit) {
  const overlay = document.createElement('div');
  overlay.className = 'inline-label-overlay';

  const textarea = document.createElement('textarea');
  textarea.className = 'inline-label-input';
  textarea.value = item.label ?? item.body ?? '';

  // position over item on canvas
  const { x, y, width, height } = _itemBoundsInScreen(item, viewMatrix);
  overlay.style.left   = x + 'px';
  overlay.style.top    = y + 'px';
  overlay.style.width  = width + 'px';
  overlay.style.height = height + 'px';

  overlay.appendChild(textarea);
  canvasEl.parentElement.appendChild(overlay);
  textarea.focus();
  textarea.select();

  const commit = () => {
    const val = textarea.value;
    overlay.remove();
    onCommit(val);
  };

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { overlay.remove(); }
  });

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) commit();
  });

  return overlay;
}

function _itemBoundsInScreen(item, mat) {
  const x = mat.a * item.x + mat.e;
  const y = mat.d * item.y + mat.f;
  const w = mat.a * (item.width  ?? 120);
  const h = mat.d * (item.height ?? 60);
  return { x, y, width: w, height: h };
}

// ═══════════════════════════════════════════════════════════════════════════
//  TOOLTIP MANAGER
// ═══════════════════════════════════════════════════════════════════════════

export class TooltipManager {
  constructor() {
    this._el = null;
    this._timer = null;
  }

  show(text, x, y, delay = 600) {
    this.hide();
    this._timer = setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'canvas-tooltip';
      el.textContent = text;
      el.style.left = (x + 12) + 'px';
      el.style.top  = (y + 12) + 'px';
      document.body.appendChild(el);
      this._el = el;
    }, delay);
  }

  hide() {
    clearTimeout(this._timer);
    this._el?.remove();
    this._el = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

export function buildShortcutHelp() {
  const shortcuts = [
    { keys: 'V',         desc: 'Select tool' },
    { keys: 'R',         desc: 'Rectangle' },
    { keys: 'E',         desc: 'Ellipse' },
    { keys: 'L',         desc: 'Line / connector' },
    { keys: 'T',         desc: 'Text' },
    { keys: 'I',         desc: 'Image' },
    { keys: 'F',         desc: 'Frame' },
    { keys: 'H',         desc: 'Pan (hand) tool' },
    { keys: 'Ctrl+Z',    desc: 'Undo' },
    { keys: 'Ctrl+Y',    desc: 'Redo' },
    { keys: 'Ctrl+C',    desc: 'Copy' },
    { keys: 'Ctrl+X',    desc: 'Cut' },
    { keys: 'Ctrl+V',    desc: 'Paste' },
    { keys: 'Ctrl+D',    desc: 'Duplicate' },
    { keys: 'Ctrl+A',    desc: 'Select all' },
    { keys: 'Delete',    desc: 'Delete selected' },
    { keys: 'Ctrl+=',   desc: 'Zoom in' },
    { keys: 'Ctrl+-',   desc: 'Zoom out' },
    { keys: 'Ctrl+0',   desc: 'Fit to screen' },
    { keys: 'Ctrl+G',   desc: 'Group selection' },
    { keys: 'Ctrl+Shift+G', desc: 'Ungroup' },
    { keys: 'F2 / Dbl-click', desc: 'Edit label' },
  ];

  const wrap = document.createElement('div');
  wrap.className = 'shortcut-help';

  const title = document.createElement('h3');
  title.textContent = 'Keyboard shortcuts';
  wrap.appendChild(title);

  const list = document.createElement('dl');
  for (const { keys, desc } of shortcuts) {
    const dt = document.createElement('dt');
    dt.textContent = keys;
    const dd = document.createElement('dd');
    dd.textContent = desc;
    list.appendChild(dt);
    list.appendChild(dd);
  }
  wrap.appendChild(list);
  return wrap;
}

// ═══════════════════════════════════════════════════════════════════════════
//  FIND / REPLACE PANEL
// ═══════════════════════════════════════════════════════════════════════════

export class FindReplacePanel {
  constructor(diagram) {
    this._diagram = diagram;
    this._el = null;
    this._results = [];
    this._cursor = -1;
  }

  open() {
    if (this._el) { this._el.querySelector('.find-input').focus(); return; }

    const el = document.createElement('div');
    el.className = 'find-replace-panel';
    el.innerHTML = `
      <div class="find-replace-row">
        <input class="find-input" placeholder="Find…" />
        <button class="fr-btn" data-action="prev">&#8679;</button>
        <button class="fr-btn" data-action="next">&#8681;</button>
        <span class="fr-count"></span>
      </div>
      <div class="find-replace-row">
        <input class="replace-input" placeholder="Replace with…" />
        <button class="fr-btn" data-action="replace">Replace</button>
        <button class="fr-btn" data-action="replace-all">All</button>
      </div>
      <button class="fr-close">&#10005;</button>
    `;
    document.body.appendChild(el);
    this._el = el;

    const findIn = el.querySelector('.find-input');
    const replaceIn = el.querySelector('.replace-input');
    const countEl = el.querySelector('.fr-count');

    const doSearch = () => {
      const q = findIn.value.toLowerCase();
      this._results = q ? this._diagram.items.filter(i =>
        (i.label ?? i.body ?? '').toLowerCase().includes(q)) : [];
      this._cursor = this._results.length ? 0 : -1;
      countEl.textContent = this._results.length
        ? `${this._cursor + 1} / ${this._results.length}`
        : (q ? '0 results' : '');
      this._highlight();
    };

    findIn.addEventListener('input', doSearch);
    findIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._step(e.shiftKey ? -1 : 1);
      if (e.key === 'Escape') this.close();
    });

    el.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'next')  this._step(1);
      if (action === 'prev')  this._step(-1);
      if (action === 'replace') {
        const cur = this._results[this._cursor];
        if (cur) {
          const key = cur.label !== undefined ? 'label' : 'body';
          cur[key] = replaceIn.value;
          this._diagram.emit?.('change', { type: 'item', id: cur.id, patch: { [key]: replaceIn.value } });
          doSearch();
        }
      }
      if (action === 'replace-all') {
        const val = replaceIn.value;
        for (const item of this._results) {
          const key = item.label !== undefined ? 'label' : 'body';
          item[key] = val;
          this._diagram.emit?.('change', { type: 'item', id: item.id, patch: { [key]: val } });
        }
        doSearch();
      }
    });

    el.querySelector('.fr-close').addEventListener('click', () => this.close());
    findIn.focus();
  }

  close() {
    this._el?.remove();
    this._el = null;
    this._results = [];
    this._cursor = -1;
    this._diagram.emit?.('change', { type: 'highlight-clear' });
  }

  _step(dir) {
    if (!this._results.length) return;
    this._cursor = (this._cursor + dir + this._results.length) % this._results.length;
    const countEl = this._el?.querySelector('.fr-count');
    if (countEl) countEl.textContent = `${this._cursor + 1} / ${this._results.length}`;
    this._highlight();
    this._diagram.emit?.('change', {
      type: 'scroll-to', id: this._results[this._cursor].id,
    });
  }

  _highlight() {
    this._diagram.emit?.('change', {
      type: 'highlight', ids: this._results.map(i => i.id),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  LAYER / Z-ORDER PANEL
// ═══════════════════════════════════════════════════════════════════════════

export function buildLayerPanel(items, onReorder, onToggleVisible, onToggleLock) {
  const el = document.createElement('div');
  el.className = 'layer-panel';

  const header = document.createElement('div');
  header.className = 'layer-panel-header';
  header.textContent = 'Layers';
  el.appendChild(header);

  const list = document.createElement('div');
  list.className = 'layer-list';

  const render = () => {
    list.innerHTML = '';
    // show in reverse z-order (top first)
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const row = document.createElement('div');
      row.className = 'layer-row' + (item._selected ? ' selected' : '');
      row.dataset.id = item.id;

      const visBtn = document.createElement('button');
      visBtn.className = 'layer-vis-btn';
      visBtn.title = item._hidden ? 'Show' : 'Hide';
      visBtn.innerHTML = item._hidden
        ? '<svg viewBox="0 0 16 16"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" fill="none" stroke="currentColor"/><line x1="2" y1="2" x2="14" y2="14" stroke="currentColor"/></svg>'
        : '<svg viewBox="0 0 16 16"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" fill="none" stroke="currentColor"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>';
      visBtn.addEventListener('click', () => onToggleVisible(item));

      const lockBtn = document.createElement('button');
      lockBtn.className = 'layer-lock-btn';
      lockBtn.title = item._locked ? 'Unlock' : 'Lock';
      lockBtn.innerHTML = item._locked
        ? '<svg viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="8" rx="1" fill="none" stroke="currentColor"/><path d="M5 7V5a3 3 0 016 0v2" fill="none" stroke="currentColor"/></svg>'
        : '<svg viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="8" rx="1" fill="none" stroke="currentColor"/><path d="M5 7V5a3 3 0 016 0" fill="none" stroke="currentColor"/></svg>';
      lockBtn.addEventListener('click', () => onToggleLock(item));

      const label = document.createElement('span');
      label.className = 'layer-label';
      label.textContent = item.label ?? item.body ?? item._kind ?? 'Item';

      row.appendChild(visBtn);
      row.appendChild(lockBtn);
      row.appendChild(label);
      list.appendChild(row);
    }
  };

  render();
  el.appendChild(list);
  return { el, refresh: render };
}

// ═══════════════════════════════════════════════════════════════════════════
//  STYLE PRESETS
// ═══════════════════════════════════════════════════════════════════════════

const STYLE_PRESETS = [
  { id: 'default',  label: 'Default',    fillColor: '#ffffff', strokeColor: '#333333', strokeWidth: 1.5 },
  { id: 'primary',  label: 'Primary',    fillColor: '#4a90e2', strokeColor: '#2c6fbd', strokeWidth: 0, textColor: '#ffffff' },
  { id: 'success',  label: 'Success',    fillColor: '#5cb85c', strokeColor: '#3e8e41', strokeWidth: 0, textColor: '#ffffff' },
  { id: 'warning',  label: 'Warning',    fillColor: '#f0ad4e', strokeColor: '#c87f0a', strokeWidth: 0, textColor: '#ffffff' },
  { id: 'danger',   label: 'Danger',     fillColor: '#d9534f', strokeColor: '#b52b27', strokeWidth: 0, textColor: '#ffffff' },
  { id: 'subtle',   label: 'Subtle',     fillColor: '#f5f5f5', strokeColor: '#cccccc', strokeWidth: 1 },
  { id: 'dark',     label: 'Dark',       fillColor: '#333333', strokeColor: '#111111', strokeWidth: 0, textColor: '#ffffff' },
  { id: 'ghost',    label: 'Ghost',      fillColor: 'none',    strokeColor: '#333333', strokeWidth: 1.5, strokeStyle: 'dashed' },
];

export function buildStylePresets(onApply) {
  const el = document.createElement('div');
  el.className = 'style-presets';

  for (const preset of STYLE_PRESETS) {
    const btn = document.createElement('button');
    btn.className = 'style-preset-btn';
    btn.title = preset.label;
    btn.style.background = preset.fillColor === 'none' ? 'transparent' : preset.fillColor;
    btn.style.border = `2px solid ${preset.strokeColor}`;
    btn.style.color = preset.textColor ?? '#333333';
    btn.textContent = preset.label[0];
    btn.addEventListener('click', () => onApply({ ...preset }));
    el.appendChild(btn);
  }

  return el;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SMART LABELS — auto-fit text inside shape
// ═══════════════════════════════════════════════════════════════════════════

const _measureCanvas = document.createElement('canvas');
const _mctx = _measureCanvas.getContext('2d');

export function fitFontSize(text, width, height, fontFamily, bold, italic,
  minSize = 8, maxSize = 72) {
  if (!text) return maxSize;
  const style = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}`;
  let lo = minSize, hi = maxSize;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    _mctx.font = `${style}${mid}px ${fontFamily}`;
    const lines = text.split('\n');
    const maxW = Math.max(...lines.map(l => _mctx.measureText(l).width));
    const totalH = mid * 1.3 * lines.length;
    if (maxW <= width * 0.9 && totalH <= height * 0.9) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MARKDOWN-AWARE TEXT RENDER  (used in text / sticky items)
// ═══════════════════════════════════════════════════════════════════════════

export function renderMarkdownText(text, containerEl, opts = {}) {
  const { fontSize = 14, fontFamily = 'sans-serif', color = '#000000',
    bold = false, italic = false, align = 'left' } = opts;

  containerEl.innerHTML = '';
  containerEl.style.fontSize   = fontSize + 'px';
  containerEl.style.fontFamily = fontFamily;
  containerEl.style.color      = color;
  containerEl.style.fontWeight  = bold   ? 'bold'   : 'normal';
  containerEl.style.fontStyle   = italic ? 'italic' : 'normal';
  containerEl.style.textAlign   = align;

  const lines = (text ?? '').split('\n');
  for (const line of lines) {
    const p = document.createElement('p');
    p.innerHTML = _inlineMarkdown(line);
    containerEl.appendChild(p);
  }
}

function _inlineMarkdown(line) {
  return line
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
    .replace(/~~(.+?)~~/g,     '<del>$1</del>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORT HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function buildExportPanel(diagram, onExport) {
  const el = document.createElement('div');
  el.className = 'export-panel';

  const formats = [
    { id: 'png',  label: 'PNG image' },
    { id: 'svg',  label: 'SVG vector' },
    { id: 'pdf',  label: 'PDF document' },
    { id: 'json', label: 'JSON data' },
  ];

  for (const fmt of formats) {
    const btn = document.createElement('button');
    btn.className = 'export-btn';
    btn.textContent = `Export ${fmt.label}`;
    btn.addEventListener('click', () => onExport(fmt.id));
    el.appendChild(btn);
  }

  // quality slider (PNG)
  const qualityWrap = document.createElement('div');
  qualityWrap.className = 'export-quality-wrap';
  const qualityLbl = document.createElement('label');
  qualityLbl.textContent = 'PNG scale: ';
  const qualityIn = document.createElement('input');
  qualityIn.type  = 'range';
  qualityIn.min   = '1';
  qualityIn.max   = '4';
  qualityIn.step  = '0.5';
  qualityIn.value = '2';
  const qualityVal = document.createElement('span');
  qualityVal.textContent = '2×';
  qualityIn.addEventListener('input', () => {
    qualityVal.textContent = qualityIn.value + '×';
    diagram._exportScale = parseFloat(qualityIn.value);
  });
  qualityWrap.appendChild(qualityLbl);
  qualityWrap.appendChild(qualityIn);
  qualityWrap.appendChild(qualityVal);
  el.appendChild(qualityWrap);

  return el;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MINI-MAP
// ═══════════════════════════════════════════════════════════════════════════

export class MiniMap {
  constructor(canvasEl, diagram) {
    this._canvas = canvasEl;
    this._diagram = diagram;
    this._ctx = canvasEl.getContext('2d');
    this._dragging = false;
    this._bindEvents();
  }

  render(viewBounds) {
    const ctx = this._ctx;
    const W = this._canvas.width;
    const H = this._canvas.height;
    const items = this._diagram.items ?? [];

    // compute diagram bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of items) {
      minX = Math.min(minX, item.x ?? 0);
      minY = Math.min(minY, item.y ?? 0);
      maxX = Math.max(maxX, (item.x ?? 0) + (item.width ?? 0));
      maxY = Math.max(maxY, (item.y ?? 0) + (item.height ?? 0));
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1000; maxY = 600; }

    const dW = maxX - minX || 1;
    const dH = maxY - minY || 1;
    const scale = Math.min(W / dW, H / dH) * 0.9;
    const offX = (W - dW * scale) / 2 - minX * scale;
    const offY = (H - dH * scale) / 2 - minY * scale;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, W, H);

    // draw items
    for (const item of items) {
      const x = (item.x ?? 0) * scale + offX;
      const y = (item.y ?? 0) * scale + offY;
      const w = (item.width  ?? 40) * scale;
      const h = (item.height ?? 20) * scale;
      ctx.fillStyle = item.fillColor ?? '#cccccc';
      ctx.fillRect(x, y, w, h);
    }

    // draw viewport rectangle
    if (viewBounds) {
      const vx = viewBounds.x * scale + offX;
      const vy = viewBounds.y * scale + offY;
      const vw = viewBounds.width  * scale;
      const vh = viewBounds.height * scale;
      ctx.strokeStyle = '#2979ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx, vy, vw, vh);
      ctx.fillStyle = 'rgba(41,121,255,0.08)';
      ctx.fillRect(vx, vy, vw, vh);
    }
  }

  _bindEvents() {
    this._canvas.addEventListener('mousedown', (e) => {
      this._dragging = true;
      this._navigateTo(e);
    });
    this._canvas.addEventListener('mousemove', (e) => {
      if (this._dragging) this._navigateTo(e);
    });
    window.addEventListener('mouseup', () => { this._dragging = false; });
  }

  _navigateTo(e) {
    const rect = this._canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top)  / rect.height;
    this._diagram.emit?.('change', { type: 'minimap-navigate', px, py });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  COLOR PALETTE  (recent / swatches)
// ═══════════════════════════════════════════════════════════════════════════

const SWATCH_COLORS = [
  '#000000', '#ffffff', '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722',
  '#795548', '#9e9e9e', '#607d8b', '#37474f',
];

let _recentColors = [];

export function buildSwatchPalette(onPick) {
  const el = document.createElement('div');
  el.className = 'swatch-palette';

  if (_recentColors.length) {
    const recentHdr = document.createElement('div');
    recentHdr.className = 'swatch-section-label';
    recentHdr.textContent = 'Recent';
    el.appendChild(recentHdr);

    const recentRow = document.createElement('div');
    recentRow.className = 'swatch-row';
    for (const c of _recentColors) {
      recentRow.appendChild(_swatch(c, onPick));
    }
    el.appendChild(recentRow);
  }

  const allHdr = document.createElement('div');
  allHdr.className = 'swatch-section-label';
  allHdr.textContent = 'Colors';
  el.appendChild(allHdr);

  const grid = document.createElement('div');
  grid.className = 'swatch-grid';
  for (const c of SWATCH_COLORS) {
    grid.appendChild(_swatch(c, (picked) => {
      _recentColors = [picked, ..._recentColors.filter(x => x !== picked)].slice(0, 8);
      onPick(picked);
    }));
  }
  el.appendChild(grid);
  return el;
}

function _swatch(color, onPick) {
  const s = document.createElement('button');
  s.className = 'color-swatch';
  s.style.background = color;
  s.title = color;
  s.addEventListener('click', () => onPick(color));
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROPERTY BINDING — live update helper
// ═══════════════════════════════════════════════════════════════════════════

export function bindProp(el, eventName, diagram, itemId, propKey, transform = v => v) {
  el.addEventListener(eventName, () => {
    const item = diagram.items.find(i => i.id === itemId);
    if (!item) return;
    const raw = el.type === 'checkbox' ? el.checked
      : el.type === 'number' ? parseFloat(el.value)
      : el.value;
    const val = transform(raw);
    item[propKey] = val;
    diagram.emit?.('change', { type: 'item', id: itemId, patch: { [propKey]: val } });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  TABLE SHAPE PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildTableProperties(table, diagram, onChange) {
  const frag = document.createDocumentFragment();

  // ── geometry ──
  const geoContent = document.createElement('div');
  geoContent.className = 'prop-section-content';

  const xIn = numInput(Math.round(table.x), { step: 1 });
  const yIn = numInput(Math.round(table.y), { step: 1 });
  xIn.addEventListener('change', () => onChange({ x: parseFloat(xIn.value) }));
  yIn.addEventListener('change', () => onChange({ y: parseFloat(yIn.value) }));
  const xyRow = document.createElement('div');
  xyRow.className = 'prop-row twin';
  xyRow.appendChild(row('X', xIn));
  xyRow.appendChild(row('Y', yIn));
  geoContent.appendChild(xyRow);

  frag.appendChild(buildAccordion('geometry', 'Geometry', geoContent, { open: true }));

  // ── table settings ──
  const tableContent = document.createElement('div');
  tableContent.className = 'prop-section-content';

  const rowsIn = numInput(table.rows ?? 3, { min: 1, max: 50, step: 1 });
  rowsIn.addEventListener('change', () =>
    onChange({ rows: parseInt(rowsIn.value, 10) }));
  tableContent.appendChild(row('Rows', rowsIn));

  const colsIn = numInput(table.cols ?? 3, { min: 1, max: 20, step: 1 });
  colsIn.addEventListener('change', () =>
    onChange({ cols: parseInt(colsIn.value, 10) }));
  tableContent.appendChild(row('Columns', colsIn));

  const headerChk = checkBox(table.hasHeader ?? true, 'prop-table-header');
  headerChk.addEventListener('change', () => onChange({ hasHeader: headerChk.checked }));
  tableContent.appendChild(row('Header row', headerChk, { for: 'prop-table-header' }));

  const headerBgIn = buildColorInput(table.headerBg ?? '#4a90e2', (c) =>
    onChange({ headerBg: c }));
  tableContent.appendChild(row('Header color', headerBgIn));

  const cellPadIn = numInput(table.cellPadding ?? 6, { min: 0, max: 40, step: 1 });
  cellPadIn.addEventListener('change', () =>
    onChange({ cellPadding: parseInt(cellPadIn.value, 10) }));
  tableContent.appendChild(row('Cell padding', cellPadIn));

  frag.appendChild(buildAccordion('table', 'Table', tableContent, { open: true }));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHART SHAPE PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildChartProperties(chart, diagram, onChange) {
  const frag = document.createDocumentFragment();

  const chartContent = document.createElement('div');
  chartContent.className = 'prop-section-content';

  const typeSel = selectInput([
    ['bar', 'Bar'], ['line', 'Line'], ['pie', 'Pie'],
    ['donut', 'Donut'], ['scatter', 'Scatter'],
  ], chart.chartType ?? 'bar');
  typeSel.addEventListener('change', () => onChange({ chartType: typeSel.value }));
  chartContent.appendChild(row('Type', typeSel));

  const titleIn = textInput(chart.chartTitle ?? '', { placeholder: 'Chart title…' });
  titleIn.addEventListener('input', () => onChange({ chartTitle: titleIn.value }));
  chartContent.appendChild(row('Title', titleIn, { wide: true }));

  const legendChk = checkBox(chart.showLegend ?? true, 'prop-chart-legend');
  legendChk.addEventListener('change', () => onChange({ showLegend: legendChk.checked }));
  chartContent.appendChild(row('Legend', legendChk, { for: 'prop-chart-legend' }));

  frag.appendChild(buildAccordion('chart', 'Chart', chartContent, { open: true }));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CODE BLOCK PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildCodeBlockProperties(block, diagram, onChange) {
  const frag = document.createDocumentFragment();

  const codeContent = document.createElement('div');
  codeContent.className = 'prop-section-content';

  const langSel = selectInput([
    ['text', 'Plain text'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'],
    ['python', 'Python'], ['java', 'Java'], ['csharp', 'C#'],
    ['cpp', 'C++'], ['go', 'Go'], ['rust', 'Rust'],
    ['html', 'HTML'], ['css', 'CSS'], ['sql', 'SQL'],
    ['json', 'JSON'], ['yaml', 'YAML'], ['shell', 'Shell'],
  ], block.language ?? 'text');
  langSel.addEventListener('change', () => onChange({ language: langSel.value }));
  codeContent.appendChild(row('Language', langSel));

  const themeSel = selectInput([
    ['github-light', 'GitHub Light'], ['github-dark', 'GitHub Dark'],
    ['monokai', 'Monokai'], ['solarized-light', 'Solarized Light'],
    ['dracula', 'Dracula'],
  ], block.theme ?? 'github-light');
  themeSel.addEventListener('change', () => onChange({ theme: themeSel.value }));
  codeContent.appendChild(row('Theme', themeSel));

  const lineNumChk = checkBox(block.showLineNumbers ?? true, 'prop-code-lines');
  lineNumChk.addEventListener('change', () => onChange({ showLineNumbers: lineNumChk.checked }));
  codeContent.appendChild(row('Line numbers', lineNumChk, { for: 'prop-code-lines' }));

  frag.appendChild(buildAccordion('code', 'Code block', codeContent, { open: true }));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SWIMLANE PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildSwimlaneProperties(lane, diagram, onChange) {
  const frag = document.createDocumentFragment();

  const laneContent = document.createElement('div');
  laneContent.className = 'prop-section-content';

  const orientSel = selectInput([
    ['horizontal', 'Horizontal'], ['vertical', 'Vertical'],
  ], lane.orientation ?? 'horizontal');
  orientSel.addEventListener('change', () => onChange({ orientation: orientSel.value }));
  laneContent.appendChild(row('Orientation', orientSel));

  const lanesIn = numInput(lane.laneCount ?? 3, { min: 1, max: 20, step: 1 });
  lanesIn.addEventListener('change', () =>
    onChange({ laneCount: parseInt(lanesIn.value, 10) }));
  laneContent.appendChild(row('Lanes', lanesIn));

  const headerBgIn = buildColorInput(lane.headerBg ?? '#4a90e2', (c) =>
    onChange({ headerBg: c }));
  laneContent.appendChild(row('Header color', headerBgIn));

  const headerHeightIn = numInput(lane.headerHeight ?? 30, { min: 20, max: 120, step: 2 });
  headerHeightIn.addEventListener('change', () =>
    onChange({ headerHeight: parseInt(headerHeightIn.value, 10) }));
  laneContent.appendChild(row('Header height', headerHeightIn));

  frag.appendChild(buildAccordion('swimlane', 'Swimlane', laneContent, { open: true }));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION (group container) PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

export function buildSectionProperties(section, diagram, onChange) {
  const frag = document.createDocumentFragment();

  const secContent = document.createElement('div');
  secContent.className = 'prop-section-content';

  const nameIn = textInput(section.name ?? '', { placeholder: 'Section name…' });
  nameIn.addEventListener('input', () => onChange({ name: nameIn.value }));
  secContent.appendChild(row('Name', nameIn, { wide: true }));

  const bgColorIn = buildColorInput(section.bgColor ?? '#e8f0fe', (c) =>
    onChange({ bgColor: c }));
  secContent.appendChild(row('Background', bgColorIn));

  const borderColorIn = buildColorInput(section.borderColor ?? '#4a90e2', (c) =>
    onChange({ borderColor: c }));
  secContent.appendChild(row('Border', borderColorIn));

  const borderWidthIn = numInput(section.borderWidth ?? 1, { min: 0, max: 10, step: 0.5 });
  borderWidthIn.addEventListener('change', () =>
    onChange({ borderWidth: parseFloat(borderWidthIn.value) }));
  secContent.appendChild(row('Border width', borderWidthIn));

  const paddingIn = numInput(section.padding ?? 16, { min: 0, max: 80, step: 2 });
  paddingIn.addEventListener('change', () =>
    onChange({ padding: parseInt(paddingIn.value, 10) }));
  secContent.appendChild(row('Padding', paddingIn));

  frag.appendChild(buildAccordion('section', 'Section', secContent, { open: true }));

  return frag;
}

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS TOOLBAR (floating above selection)
// ═══════════════════════════════════════════════════════════════════════════

export function buildQuickActions(items, pos, callbacks) {
  const bar = document.createElement('div');
  bar.className = 'quick-actions-bar';
  bar.style.left = pos.x + 'px';
  bar.style.top  = (pos.y - 44) + 'px';

  const btn = (title, svg, action) => {
    const b = document.createElement('button');
    b.className = 'qa-btn';
    b.title = title;
    b.innerHTML = svg;
    b.addEventListener('click', action);
    return b;
  };

  bar.appendChild(btn('Bold', '<svg viewBox="0 0 10 12"><text x="1" y="10" font-weight="bold" font-size="11">B</text></svg>',
    () => callbacks.toggleBold?.(items)));
  bar.appendChild(btn('Italic', '<svg viewBox="0 0 10 12"><text x="2" y="10" font-style="italic" font-size="11">I</text></svg>',
    () => callbacks.toggleItalic?.(items)));
  bar.appendChild(btn('Delete', '<svg viewBox="0 0 16 16"><polyline points="3,4 13,4"/><path d="M5 4V2h6v2M6 7v5M10 7v5" fill="none" stroke="currentColor"/></svg>',
    () => callbacks.delete?.(items)));
  bar.appendChild(btn('Duplicate', '<svg viewBox="0 0 16 16"><rect x="2" y="4" width="9" height="9" fill="none" stroke="currentColor"/><rect x="5" y="2" width="9" height="9" fill="none" stroke="currentColor"/></svg>',
    () => callbacks.duplicate?.(items)));

  return bar;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELP / ONBOARDING OVERLAY
// ═══════════════════════════════════════════════════════════════════════════

export function buildOnboardingOverlay(onDismiss) {
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';

  const card = document.createElement('div');
  card.className = 'onboarding-card';

  card.innerHTML = `
    <h2>Welcome to DiagramForce</h2>
    <p>Create beautiful diagrams with an intuitive drag-and-drop interface.</p>
    <ul>
      <li>Use the <strong>toolbar</strong> to add shapes, connectors, and text.</li>
      <li>Click a shape to <strong>select</strong> it and edit its properties in the right panel.</li>
      <li>Drag connectors between shapes to <strong>link</strong> them.</li>
      <li>Use <strong>Ctrl+Z / Ctrl+Y</strong> to undo and redo.</li>
    </ul>
    <button class="onboarding-dismiss">Get started</button>
  `;

  overlay.appendChild(card);
  card.querySelector('.onboarding-dismiss').addEventListener('click', () => {
    overlay.remove();
    onDismiss?.();
  });

  return overlay;
}

// ═══════════════════════════════════════════════════════════════════════════
//  COLOR UTILITIES  (hex ↔ rgb ↔ hsl)
// ═══════════════════════════════════════════════════════════════════════════

export function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

export function rgbToHex({ r, g, b }) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export function lighten(hex, amount = 0.1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  hsl.l = Math.min(100, hsl.l + Math.round(amount * 100));
  return rgbToHex(hslToRgb(hsl));
}

export function darken(hex, amount = 0.1) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  hsl.l = Math.max(0, hsl.l - Math.round(amount * 100));
  return rgbToHex(hslToRgb(hsl));
}

export function colorWithAlpha(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${alpha})`;
}

export function contrastColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  const lum = 0.2126 * _lin(rgb.r) + 0.7152 * _lin(rgb.g) + 0.0722 * _lin(rgb.b);
  return lum > 0.179 ? '#000000' : '#ffffff';
}

function _lin(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function parseColor(str) {
  if (!str) return null;
  str = str.trim();
  if (/^#[0-9a-f]{3}$/i.test(str)) {
    return '#' + str[1]+str[1] + str[2]+str[2] + str[3]+str[3];
  }
  if (/^#[0-9a-f]{6}$/i.test(str)) return str;
  const m = str.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
  if (m) return rgbToHex({ r: +m[1], g: +m[2], b: +m[3] });
  return null;
}

export function mixColors(hex1, hex2, t = 0.5) {
  const a = hexToRgb(hex1), b = hexToRgb(hex2);
  if (!a || !b) return hex1;
  return rgbToHex({
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  });
}

export function toHexColor(r, g, b) {
  try {
    const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
  } catch {
    return '#000000';
  }
}
