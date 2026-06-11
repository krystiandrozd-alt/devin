// Properties panel — left sidebar element inspector
// Properties are grouped into collapsible accordion sections

import { wrapSelectionWithMarker } from './markdown.js?v=1.15.7';
import { confirmModal, showToast, buildModal } from './feedback.js?v=1.15.7';
import { applyTheme } from './theme.js?v=1.15.7';

/* ─────────────────────────────────────────────
   Bootstrap
───────────────────────────────────────────── */
export function initProperties(editor) {
  const panel = document.getElementById('properties-panel');
  if (!panel) return;

  editor.on('selectionchange', () => renderProperties(editor, panel));
  editor.on('contentchange',   () => renderProperties(editor, panel));
  renderProperties(editor, panel);
}

/* ─────────────────────────────────────────────
   Main renderer
───────────────────────────────────────────── */
function renderProperties(editor, panel) {
  const sel = editor.getSelection();
  panel.innerHTML = '';

  if (!sel || sel.isEmpty()) {
    panel.appendChild(emptyState());
    return;
  }

  const nodes = sel.getNodes();
  if (nodes.length === 0) {
    panel.appendChild(emptyState());
    return;
  }

  // Mixed-type selections get a summary section only
  const types = [...new Set(nodes.map(n => n.type))];
  if (types.length > 1) {
    panel.appendChild(buildMixedSection(nodes));
    return;
  }

  const type = types[0];
  const builders = {
    text:      buildTextSection,
    image:     buildImageSection,
    shape:     buildShapeSection,
    table:     buildTableSection,
    code:      buildCodeSection,
    embed:     buildEmbedSection,
    connector: buildConnectorSection,
    group:     buildGroupSection,
    frame:     buildFrameSection,
  };

  const builder = builders[type];
  if (builder) {
    panel.appendChild(builder(nodes, editor));
  } else {
    panel.appendChild(buildGenericSection(nodes, editor));
  }
}

/* ─────────────────────────────────────────────
   Empty state
───────────────────────────────────────────── */
function emptyState() {
  const wrap = document.createElement('div');
  wrap.className = 'props-empty';
  wrap.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>
    <p>Select an element<br>to inspect its properties.</p>
  `;
  return wrap;
}

/* ─────────────────────────────────────────────
   Section scaffold
───────────────────────────────────────────── */
function makeSection(title, collapsed = false) {
  const section = document.createElement('div');
  section.className = 'props-section' + (collapsed ? ' collapsed' : '');

  const header = document.createElement('div');
  header.className = 'props-section-header';
  header.innerHTML = `
    <span class="props-section-title">${title}</span>
    <svg class="props-chevron" width="12" height="12" viewBox="0 0 12 12">
      <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5"
            fill="none" stroke-linecap="round"/>
    </svg>
  `;
  header.addEventListener('click', () => section.classList.toggle('collapsed'));

  const body = document.createElement('div');
  body.className = 'props-section-body';

  section.appendChild(header);
  section.appendChild(body);
  return { section, body };
}

/* ─────────────────────────────────────────────
   Row helpers
───────────────────────────────────────────── */
function makeRow(label, control) {
  const row = document.createElement('div');
  row.className = 'props-row';

  const lbl = document.createElement('label');
  lbl.className = 'props-label';
  lbl.textContent = label;

  row.appendChild(lbl);
  row.appendChild(control);
  return row;
}

function makeTextInput(value, onChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'props-input';
  input.value = value ?? '';
  input.addEventListener('change', e => onChange(e.target.value));
  return input;
}

function makeNumberInput(value, min, max, step, onChange) {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'props-input props-input--number';
  input.value = value ?? '';
  if (min !== undefined) input.min = min;
  if (max !== undefined) input.max = max;
  if (step !== undefined) input.step = step;
  input.addEventListener('change', e => onChange(+e.target.value));
  return input;
}

function makeColorInput(value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'props-color-wrap';

  const swatch = document.createElement('input');
  swatch.type = 'color';
  swatch.className = 'props-color-swatch';
  swatch.value = normalizeHex(value);

  const text = document.createElement('input');
  text.type = 'text';
  text.className = 'props-input props-color-text';
  text.value = value ?? '';
  text.maxLength = 9;

  swatch.addEventListener('input', e => {
    text.value = e.target.value;
    onChange(e.target.value);
  });
  text.addEventListener('change', e => {
    const hex = normalizeHex(e.target.value);
    swatch.value = hex;
    onChange(hex);
  });

  wrap.appendChild(swatch);
  wrap.appendChild(text);
  return wrap;
}

function makeSelect(options, current, onChange) {
  const sel = document.createElement('select');
  sel.className = 'props-select';
  options.forEach(([val, label]) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    if (val === current) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', e => onChange(e.target.value));
  return sel;
}

function makeToggle(checked, onChange) {
  const label = document.createElement('label');
  label.className = 'props-toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!checked;
  input.addEventListener('change', e => onChange(e.target.checked));

  const slider = document.createElement('span');
  slider.className = 'props-toggle-slider';

  label.appendChild(input);
  label.appendChild(slider);
  return label;
}

function makeSlider(value, min, max, step, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'props-slider-wrap';

  const range = document.createElement('input');
  range.type = 'range';
  range.className = 'props-slider';
  range.min  = min;
  range.max  = max;
  range.step = step;
  range.value = value;

  const display = document.createElement('span');
  display.className = 'props-slider-value';
  display.textContent = value;

  range.addEventListener('input', e => {
    display.textContent = e.target.value;
    onChange(+e.target.value);
  });

  wrap.appendChild(range);
  wrap.appendChild(display);
  return wrap;
}

function makeButton(label, onClick, variant = 'default') {
  const btn = document.createElement('button');
  btn.className = `props-btn props-btn--${variant}`;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

/* ─────────────────────────────────────────────
   Mixed selection
───────────────────────────────────────────── */
function buildMixedSection(nodes) {
  const { section, body } = makeSection('Selection');

  const summary = document.createElement('p');
  summary.className = 'props-summary';
  summary.textContent = `${nodes.length} elements selected (mixed types).`;
  body.appendChild(summary);

  return section;
}

/* ─────────────────────────────────────────────
   TEXT
───────────────────────────────────────────── */
function buildTextSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0]; // representative
  const multi = nodes.length > 1;

  // --- Typography ---
  const { section: typo, body: typoBody } = makeSection('Typography');

  // Font family
  typoBody.appendChild(makeRow('Font family',
    makeSelect(
      [['sans-serif','Sans-serif'],['serif','Serif'],['monospace','Monospace'],
       ['cursive','Cursive'],['system-ui','System UI']],
      node.style?.fontFamily ?? 'sans-serif',
      val => applyToNodes(nodes, editor, n => { n.style.fontFamily = val; })
    )
  ));

  // Font size
  typoBody.appendChild(makeRow('Font size',
    makeNumberInput(node.style?.fontSize ?? 16, 6, 288, 1,
      val => applyToNodes(nodes, editor, n => { n.style.fontSize = val; })
    )
  ));

  // Font weight
  typoBody.appendChild(makeRow('Weight',
    makeSelect(
      [['100','Thin'],['200','Extra-light'],['300','Light'],
       ['400','Regular'],['500','Medium'],['600','Semi-bold'],
       ['700','Bold'],['800','Extra-bold'],['900','Black']],
      String(node.style?.fontWeight ?? '400'),
      val => applyToNodes(nodes, editor, n => { n.style.fontWeight = val; })
    )
  ));

  // Line height
  typoBody.appendChild(makeRow('Line height',
    makeNumberInput(node.style?.lineHeight ?? 1.4, 0.5, 5, 0.05,
      val => applyToNodes(nodes, editor, n => { n.style.lineHeight = val; })
    )
  ));

  // Letter spacing
  typoBody.appendChild(makeRow('Letter spacing',
    makeNumberInput(node.style?.letterSpacing ?? 0, -10, 40, 0.5,
      val => applyToNodes(nodes, editor, n => { n.style.letterSpacing = val; })
    )
  ));

  // Text align
  typoBody.appendChild(makeRow('Align',
    makeSelect(
      [['left','Left'],['center','Center'],['right','Right'],['justify','Justify']],
      node.style?.textAlign ?? 'left',
      val => applyToNodes(nodes, editor, n => { n.style.textAlign = val; })
    )
  ));

  // Text transform
  typoBody.appendChild(makeRow('Transform',
    makeSelect(
      [['none','None'],['uppercase','Uppercase'],['lowercase','Lowercase'],
       ['capitalize','Capitalize']],
      node.style?.textTransform ?? 'none',
      val => applyToNodes(nodes, editor, n => { n.style.textTransform = val; })
    )
  ));

  frag.appendChild(typo);

  // --- Color ---
  const { section: colorSec, body: colorBody } = makeSection('Color');

  colorBody.appendChild(makeRow('Text color',
    makeColorInput(node.style?.color ?? '#000000',
      val => applyToNodes(nodes, editor, n => { n.style.color = val; })
    )
  ));

  colorBody.appendChild(makeRow('Background',
    makeColorInput(node.style?.backgroundColor ?? '#ffffff',
      val => applyToNodes(nodes, editor, n => { n.style.backgroundColor = val; })
    )
  ));

  colorBody.appendChild(makeRow('Opacity',
    makeSlider(node.style?.opacity ?? 1, 0, 1, 0.01,
      val => applyToNodes(nodes, editor, n => { n.style.opacity = val; })
    )
  ));

  frag.appendChild(colorSec);

  // --- Spacing ---
  const { section: spaceSec, body: spaceBody } = makeSection('Spacing', true);

  ['top','right','bottom','left'].forEach(side => {
    spaceBody.appendChild(makeRow(`Padding ${side}`,
      makeNumberInput(node.style?.padding?.[side] ?? 0, 0, 200, 1,
        val => applyToNodes(nodes, editor, n => {
          n.style.padding = n.style.padding || {};
          n.style.padding[side] = val;
        })
      )
    ));
  });

  frag.appendChild(spaceSec);

  // --- Advanced ---
  const { section: advSec, body: advBody } = makeSection('Advanced', true);

  advBody.appendChild(makeRow('ID',
    makeTextInput(node.id, val => {
      editor.setNodeId(node, val);
    })
  ));

  advBody.appendChild(makeRow('CSS class',
    makeTextInput(node.className ?? '',
      val => applyToNodes(nodes, editor, n => { n.className = val; })
    )
  ));

  frag.appendChild(advSec);

  return frag;
}

/* ─────────────────────────────────────────────
   IMAGE
───────────────────────────────────────────── */
function buildImageSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  // --- Source ---
  const { section: srcSec, body: srcBody } = makeSection('Source');

  srcBody.appendChild(makeRow('URL',
    makeTextInput(node.src ?? '',
      val => applyToNodes(nodes, editor, n => { n.src = val; })
    )
  ));

  srcBody.appendChild(makeRow('Alt text',
    makeTextInput(node.alt ?? '',
      val => applyToNodes(nodes, editor, n => { n.alt = val; })
    )
  ));

  // Replace button
  const replaceBtn = makeButton('Replace image…', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        applyToNodes(nodes, editor, n => { n.src = ev.target.result; });
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }, 'secondary');
  srcBody.appendChild(replaceBtn);

  frag.appendChild(srcSec);

  // --- Layout ---
  const { section: layoutSec, body: layoutBody } = makeSection('Layout');

  layoutBody.appendChild(makeRow('Object fit',
    makeSelect(
      [['fill','Fill'],['contain','Contain'],['cover','Cover'],
       ['none','None'],['scale-down','Scale-down']],
      node.style?.objectFit ?? 'cover',
      val => applyToNodes(nodes, editor, n => { n.style.objectFit = val; })
    )
  ));

  layoutBody.appendChild(makeRow('Object position',
    makeTextInput(node.style?.objectPosition ?? 'center center',
      val => applyToNodes(nodes, editor, n => { n.style.objectPosition = val; })
    )
  ));

  layoutBody.appendChild(makeRow('Width',
    makeNumberInput(node.style?.width ?? '', 1, 8000, 1,
      val => applyToNodes(nodes, editor, n => { n.style.width = val; })
    )
  ));

  layoutBody.appendChild(makeRow('Height',
    makeNumberInput(node.style?.height ?? '', 1, 8000, 1,
      val => applyToNodes(nodes, editor, n => { n.style.height = val; })
    )
  ));

  layoutBody.appendChild(makeRow('Border radius',
    makeNumberInput(node.style?.borderRadius ?? 0, 0, 9999, 1,
      val => applyToNodes(nodes, editor, n => { n.style.borderRadius = val; })
    )
  ));

  frag.appendChild(layoutSec);

  // --- Filters ---
  const { section: filterSec, body: filterBody } = makeSection('Filters', true);

  const filters = parseFilters(node.style?.filter ?? '');

  filterBody.appendChild(makeRow('Brightness',
    makeSlider(filters.brightness ?? 1, 0, 3, 0.01,
      val => {
        filters.brightness = val;
        applyToNodes(nodes, editor, n => { n.style.filter = serializeFilters(filters); });
      }
    )
  ));

  filterBody.appendChild(makeRow('Contrast',
    makeSlider(filters.contrast ?? 1, 0, 3, 0.01,
      val => {
        filters.contrast = val;
        applyToNodes(nodes, editor, n => { n.style.filter = serializeFilters(filters); });
      }
    )
  ));

  filterBody.appendChild(makeRow('Saturation',
    makeSlider(filters.saturate ?? 1, 0, 3, 0.01,
      val => {
        filters.saturate = val;
        applyToNodes(nodes, editor, n => { n.style.filter = serializeFilters(filters); });
      }
    )
  ));

  filterBody.appendChild(makeRow('Blur (px)',
    makeSlider(filters.blur ?? 0, 0, 40, 0.5,
      val => {
        filters.blur = val;
        applyToNodes(nodes, editor, n => { n.style.filter = serializeFilters(filters); });
      }
    )
  ));

  filterBody.appendChild(makeRow('Grayscale',
    makeSlider(filters.grayscale ?? 0, 0, 1, 0.01,
      val => {
        filters.grayscale = val;
        applyToNodes(nodes, editor, n => { n.style.filter = serializeFilters(filters); });
      }
    )
  ));

  frag.appendChild(filterSec);

  // --- Opacity ---
  const { section: opSec, body: opBody } = makeSection('Opacity');
  opBody.appendChild(makeRow('Opacity',
    makeSlider(node.style?.opacity ?? 1, 0, 1, 0.01,
      val => applyToNodes(nodes, editor, n => { n.style.opacity = val; })
    )
  ));
  frag.appendChild(opSec);

  return frag;
}

/* ─────────────────────────────────────────────
   SHAPE
───────────────────────────────────────────── */
function buildShapeSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  // --- Geometry ---
  const { section: geoSec, body: geoBody } = makeSection('Geometry');

  geoBody.appendChild(makeRow('Shape type',
    makeSelect(
      [['rect','Rectangle'],['circle','Circle'],['ellipse','Ellipse'],
       ['triangle','Triangle'],['diamond','Diamond'],['pentagon','Pentagon'],
       ['hexagon','Hexagon'],['star','Star'],['arrow','Arrow'],
       ['parallelogram','Parallelogram'],['trapezoid','Trapezoid'],
       ['cross','Cross'],['cloud','Cloud'],['cylinder','Cylinder']],
      node.shapeType ?? 'rect',
      val => applyToNodes(nodes, editor, n => { n.shapeType = val; editor.refreshShape(n); })
    )
  ));

  geoBody.appendChild(makeRow('Width',
    makeNumberInput(node.width ?? 100, 1, 8000, 1,
      val => applyToNodes(nodes, editor, n => { n.width = val; })
    )
  ));

  geoBody.appendChild(makeRow('Height',
    makeNumberInput(node.height ?? 100, 1, 8000, 1,
      val => applyToNodes(nodes, editor, n => { n.height = val; })
    )
  ));

  geoBody.appendChild(makeRow('X position',
    makeNumberInput(node.x ?? 0, -99999, 99999, 1,
      val => applyToNodes(nodes, editor, n => { n.x = val; })
    )
  ));

  geoBody.appendChild(makeRow('Y position',
    makeNumberInput(node.y ?? 0, -99999, 99999, 1,
      val => applyToNodes(nodes, editor, n => { n.y = val; })
    )
  ));

  geoBody.appendChild(makeRow('Rotation (°)',
    makeNumberInput(node.rotation ?? 0, -360, 360, 1,
      val => applyToNodes(nodes, editor, n => { n.rotation = val; })
    )
  ));

  frag.appendChild(geoSec);

  // --- Fill ---
  const { section: fillSec, body: fillBody } = makeSection('Fill');

  fillBody.appendChild(makeRow('Fill color',
    makeColorInput(node.fill ?? '#4f9eff',
      val => applyToNodes(nodes, editor, n => { n.fill = val; })
    )
  ));

  fillBody.appendChild(makeRow('Fill opacity',
    makeSlider(node.fillOpacity ?? 1, 0, 1, 0.01,
      val => applyToNodes(nodes, editor, n => { n.fillOpacity = val; })
    )
  ));

  fillBody.appendChild(makeRow('Fill style',
    makeSelect(
      [['solid','Solid'],['none','None'],['hatch','Hatch'],['dots','Dots'],
       ['cross','Cross-hatch'],['gradient-linear','Linear gradient'],
       ['gradient-radial','Radial gradient']],
      node.fillStyle ?? 'solid',
      val => applyToNodes(nodes, editor, n => { n.fillStyle = val; })
    )
  ));

  frag.appendChild(fillSec);

  // --- Stroke ---
  const { section: strokeSec, body: strokeBody } = makeSection('Stroke');

  strokeBody.appendChild(makeRow('Stroke color',
    makeColorInput(node.stroke ?? '#2c6fad',
      val => applyToNodes(nodes, editor, n => { n.stroke = val; })
    )
  ));

  strokeBody.appendChild(makeRow('Stroke width',
    makeNumberInput(node.strokeWidth ?? 1, 0, 50, 0.5,
      val => applyToNodes(nodes, editor, n => { n.strokeWidth = val; })
    )
  ));

  strokeBody.appendChild(makeRow('Stroke style',
    makeSelect(
      [['solid','Solid'],['dashed','Dashed'],['dotted','Dotted'],
       ['dash-dot','Dash-dot'],['none','None']],
      node.strokeStyle ?? 'solid',
      val => applyToNodes(nodes, editor, n => { n.strokeStyle = val; })
    )
  ));

  strokeBody.appendChild(makeRow('Stroke join',
    makeSelect(
      [['miter','Miter'],['round','Round'],['bevel','Bevel']],
      node.strokeJoin ?? 'miter',
      val => applyToNodes(nodes, editor, n => { n.strokeJoin = val; })
    )
  ));

  frag.appendChild(strokeSec);

  // --- Shadow ---
  const { section: shadowSec, body: shadowBody } = makeSection('Shadow', true);

  shadowBody.appendChild(makeRow('Enable shadow',
    makeToggle(node.shadow?.enabled ?? false,
      val => applyToNodes(nodes, editor, n => {
        n.shadow = n.shadow || {};
        n.shadow.enabled = val;
      })
    )
  ));

  shadowBody.appendChild(makeRow('Shadow color',
    makeColorInput(node.shadow?.color ?? '#00000066',
      val => applyToNodes(nodes, editor, n => {
        n.shadow = n.shadow || {};
        n.shadow.color = val;
      })
    )
  ));

  shadowBody.appendChild(makeRow('Offset X',
    makeNumberInput(node.shadow?.offsetX ?? 4, -100, 100, 1,
      val => applyToNodes(nodes, editor, n => {
        n.shadow = n.shadow || {};
        n.shadow.offsetX = val;
      })
    )
  ));

  shadowBody.appendChild(makeRow('Offset Y',
    makeNumberInput(node.shadow?.offsetY ?? 4, -100, 100, 1,
      val => applyToNodes(nodes, editor, n => {
        n.shadow = n.shadow || {};
        n.shadow.offsetY = val;
      })
    )
  ));

  shadowBody.appendChild(makeRow('Blur',
    makeNumberInput(node.shadow?.blur ?? 8, 0, 100, 1,
      val => applyToNodes(nodes, editor, n => {
        n.shadow = n.shadow || {};
        n.shadow.blur = val;
      })
    )
  ));

  shadowBody.appendChild(makeRow('Spread',
    makeNumberInput(node.shadow?.spread ?? 0, -50, 50, 1,
      val => applyToNodes(nodes, editor, n => {
        n.shadow = n.shadow || {};
        n.shadow.spread = val;
      })
    )
  ));

  frag.appendChild(shadowSec);

  // --- Opacity ---
  const { section: opSec, body: opBody } = makeSection('Opacity');
  opBody.appendChild(makeRow('Opacity',
    makeSlider(node.opacity ?? 1, 0, 1, 0.01,
      val => applyToNodes(nodes, editor, n => { n.opacity = val; })
    )
  ));
  frag.appendChild(opSec);

  return frag;
}

/* ─────────────────────────────────────────────
   TABLE
───────────────────────────────────────────── */
function buildTableSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  // --- Structure ---
  const { section: strSec, body: strBody } = makeSection('Structure');

  strBody.appendChild(makeRow('Rows',
    makeNumberInput(node.rows ?? 3, 1, 200, 1,
      val => applyToNodes(nodes, editor, n => {
        editor.resizeTable(n, { rows: val });
      })
    )
  ));

  strBody.appendChild(makeRow('Columns',
    makeNumberInput(node.cols ?? 3, 1, 50, 1,
      val => applyToNodes(nodes, editor, n => {
        editor.resizeTable(n, { cols: val });
      })
    )
  ));

  strBody.appendChild(makeRow('Header row',
    makeToggle(node.headerRow ?? true,
      val => applyToNodes(nodes, editor, n => { n.headerRow = val; })
    )
  ));

  strBody.appendChild(makeRow('Header col',
    makeToggle(node.headerCol ?? false,
      val => applyToNodes(nodes, editor, n => { n.headerCol = val; })
    )
  ));

  strBody.appendChild(makeRow('Stripe rows',
    makeToggle(node.stripeRows ?? false,
      val => applyToNodes(nodes, editor, n => { n.stripeRows = val; })
    )
  ));

  frag.appendChild(strSec);

  // --- Appearance ---
  const { section: appSec, body: appBody } = makeSection('Appearance');

  appBody.appendChild(makeRow('Cell padding',
    makeNumberInput(node.cellPadding ?? 8, 0, 60, 1,
      val => applyToNodes(nodes, editor, n => { n.cellPadding = val; })
    )
  ));

  appBody.appendChild(makeRow('Border width',
    makeNumberInput(node.borderWidth ?? 1, 0, 20, 1,
      val => applyToNodes(nodes, editor, n => { n.borderWidth = val; })
    )
  ));

  appBody.appendChild(makeRow('Border color',
    makeColorInput(node.borderColor ?? '#cccccc',
      val => applyToNodes(nodes, editor, n => { n.borderColor = val; })
    )
  ));

  appBody.appendChild(makeRow('Header bg',
    makeColorInput(node.headerBg ?? '#f0f4ff',
      val => applyToNodes(nodes, editor, n => { n.headerBg = val; })
    )
  ));

  appBody.appendChild(makeRow('Header color',
    makeColorInput(node.headerColor ?? '#1a1a2e',
      val => applyToNodes(nodes, editor, n => { n.headerColor = val; })
    )
  ));

  appBody.appendChild(makeRow('Stripe color',
    makeColorInput(node.stripeColor ?? '#f8f9fc',
      val => applyToNodes(nodes, editor, n => { n.stripeColor = val; })
    )
  ));

  frag.appendChild(appSec);

  return frag;
}

/* ─────────────────────────────────────────────
   CODE BLOCK
───────────────────────────────────────────── */
function buildCodeSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  // --- Language ---
  const { section: langSec, body: langBody } = makeSection('Code');

  const LANGUAGES = [
    ['plaintext','Plain text'],['javascript','JavaScript'],['typescript','TypeScript'],
    ['python','Python'],['rust','Rust'],['go','Go'],['java','Java'],
    ['c','C'],['cpp','C++'],['csharp','C#'],['php','PHP'],['ruby','Ruby'],
    ['swift','Swift'],['kotlin','Kotlin'],['scala','Scala'],['dart','Dart'],
    ['html','HTML'],['css','CSS'],['scss','SCSS'],['less','LESS'],
    ['json','JSON'],['yaml','YAML'],['toml','TOML'],['xml','XML'],
    ['sql','SQL'],['graphql','GraphQL'],['bash','Bash/Shell'],
    ['powershell','PowerShell'],['dockerfile','Dockerfile'],
    ['markdown','Markdown'],['latex','LaTeX'],
  ];

  langBody.appendChild(makeRow('Language',
    makeSelect(LANGUAGES, node.language ?? 'plaintext',
      val => applyToNodes(nodes, editor, n => { n.language = val; })
    )
  ));

  langBody.appendChild(makeRow('Theme',
    makeSelect(
      [['dark','Dark'],['light','Light'],['monokai','Monokai'],
       ['solarized-dark','Solarized Dark'],['solarized-light','Solarized Light'],
       ['github','GitHub'],['dracula','Dracula'],['nord','Nord'],
       ['one-dark','One Dark'],['gruvbox','Gruvbox']],
      node.codeTheme ?? 'dark',
      val => applyToNodes(nodes, editor, n => { n.codeTheme = val; })
    )
  ));

  langBody.appendChild(makeRow('Show line nos.',
    makeToggle(node.showLineNumbers ?? true,
      val => applyToNodes(nodes, editor, n => { n.showLineNumbers = val; })
    )
  ));

  langBody.appendChild(makeRow('Word wrap',
    makeToggle(node.wordWrap ?? false,
      val => applyToNodes(nodes, editor, n => { n.wordWrap = val; })
    )
  ));

  langBody.appendChild(makeRow('Tab size',
    makeSelect(
      [['2','2 spaces'],['4','4 spaces'],['8','8 spaces']],
      String(node.tabSize ?? 2),
      val => applyToNodes(nodes, editor, n => { n.tabSize = +val; })
    )
  ));

  langBody.appendChild(makeRow('Font size',
    makeNumberInput(node.codeFontSize ?? 13, 8, 32, 1,
      val => applyToNodes(nodes, editor, n => { n.codeFontSize = val; })
    )
  ));

  frag.appendChild(langSec);

  return frag;
}

/* ─────────────────────────────────────────────
   EMBED
───────────────────────────────────────────── */
function buildEmbedSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section: embedSec, body: embedBody } = makeSection('Embed');

  embedBody.appendChild(makeRow('URL',
    makeTextInput(node.embedUrl ?? '',
      val => applyToNodes(nodes, editor, n => { n.embedUrl = val; })
    )
  ));

  embedBody.appendChild(makeRow('Width',
    makeNumberInput(node.width ?? 640, 100, 8000, 1,
      val => applyToNodes(nodes, editor, n => { n.width = val; })
    )
  ));

  embedBody.appendChild(makeRow('Height',
    makeNumberInput(node.height ?? 480, 60, 8000, 1,
      val => applyToNodes(nodes, editor, n => { n.height = val; })
    )
  ));

  embedBody.appendChild(makeRow('Allow fullscreen',
    makeToggle(node.allowFullscreen ?? true,
      val => applyToNodes(nodes, editor, n => { n.allowFullscreen = val; })
    )
  ));

  embedBody.appendChild(makeRow('Sandbox',
    makeTextInput(node.sandbox ?? 'allow-scripts allow-same-origin',
      val => applyToNodes(nodes, editor, n => { n.sandbox = val; })
    )
  ));

  frag.appendChild(embedSec);

  return frag;
}

/* ─────────────────────────────────────────────
   CONNECTOR
───────────────────────────────────────────── */
function buildConnectorSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  // --- Line ---
  const { section: lineSec, body: lineBody } = makeSection('Line');

  lineBody.appendChild(makeRow('Stroke color',
    makeColorInput(node.stroke ?? '#5b5f97',
      val => applyToNodes(nodes, editor, n => { n.stroke = val; })
    )
  ));

  lineBody.appendChild(makeRow('Stroke width',
    makeNumberInput(node.strokeWidth ?? 2, 0.5, 40, 0.5,
      val => applyToNodes(nodes, editor, n => { n.strokeWidth = val; })
    )
  ));

  lineBody.appendChild(makeRow('Stroke style',
    makeSelect(
      [['solid','Solid'],['dashed','Dashed'],['dotted','Dotted'],['dash-dot','Dash-dot']],
      node.strokeStyle ?? 'solid',
      val => applyToNodes(nodes, editor, n => { n.strokeStyle = val; })
    )
  ));

  lineBody.appendChild(makeRow('Line type',
    makeSelect(
      [['straight','Straight'],['curved','Curved'],['orthogonal','Orthogonal'],
       ['elbowed','Elbowed']],
      node.lineType ?? 'straight',
      val => applyToNodes(nodes, editor, n => { n.lineType = val; })
    )
  ));

  frag.appendChild(lineSec);

  // --- Arrows ---
  const { section: arrowSec, body: arrowBody } = makeSection('Arrows');

  arrowBody.appendChild(makeRow('Start arrow',
    makeSelect(
      [['none','None'],['arrow','Arrow'],['filled-arrow','Filled arrow'],
       ['circle','Circle'],['diamond','Diamond'],['open','Open'],
       ['half','Half-arrow'],['many','Crow’s foot — many'],
       ['one','Crow’s foot — one'],['zero-many','Zero or many'],
       ['one-many','One or many']],
      node.startArrow ?? 'none',
      val => applyToNodes(nodes, editor, n => { n.startArrow = val; })
    )
  ));

  arrowBody.appendChild(makeRow('End arrow',
    makeSelect(
      [['none','None'],['arrow','Arrow'],['filled-arrow','Filled arrow'],
       ['circle','Circle'],['diamond','Diamond'],['open','Open'],
       ['half','Half-arrow'],['many','Crow’s foot — many'],
       ['one','Crow’s foot — one'],['zero-many','Zero or many'],
       ['one-many','One or many']],
      node.endArrow ?? 'arrow',
      val => applyToNodes(nodes, editor, n => { n.endArrow = val; })
    )
  ));

  frag.appendChild(arrowSec);

  // --- Label ---
  const { section: labelSec, body: labelBody } = makeSection('Label', true);

  labelBody.appendChild(makeRow('Label text',
    makeTextInput(node.label ?? '',
      val => applyToNodes(nodes, editor, n => { n.label = val; })
    )
  ));

  labelBody.appendChild(makeRow('Label position',
    makeSelect(
      [['center','Center'],['start','Start'],['end','End']],
      node.labelPosition ?? 'center',
      val => applyToNodes(nodes, editor, n => { n.labelPosition = val; })
    )
  ));

  labelBody.appendChild(makeRow('Label offset',
    makeNumberInput(node.labelOffset ?? 0, -200, 200, 1,
      val => applyToNodes(nodes, editor, n => { n.labelOffset = val; })
    )
  ));

  frag.appendChild(labelSec);

  return frag;
}

/* ─────────────────────────────────────────────
   GROUP
───────────────────────────────────────────── */
function buildGroupSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section: grpSec, body: grpBody } = makeSection('Group');

  grpBody.appendChild(makeRow('Members',
    (() => {
      const span = document.createElement('span');
      span.className = 'props-value';
      span.textContent = node.children?.length ?? 0;
      return span;
    })()
  ));

  grpBody.appendChild(makeRow('Clip content',
    makeToggle(node.clipContent ?? false,
      val => applyToNodes(nodes, editor, n => { n.clipContent = val; })
    )
  ));

  grpBody.appendChild(makeRow('Lock aspect',
    makeToggle(node.lockAspect ?? false,
      val => applyToNodes(nodes, editor, n => { n.lockAspect = val; })
    )
  ));

  const ungroupBtn = makeButton('Ungroup', () => {
    editor.ungroup(nodes);
  }, 'danger');
  grpBody.appendChild(ungroupBtn);

  frag.appendChild(grpSec);

  return frag;
}

/* ─────────────────────────────────────────────
   FRAME
───────────────────────────────────────────── */
function buildFrameSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  // --- Frame info ---
  const { section: frameSec, body: frameBody } = makeSection('Frame');

  frameBody.appendChild(makeRow('Name',
    makeTextInput(node.name ?? '',
      val => applyToNodes(nodes, editor, n => { n.name = val; })
    )
  ));

  frameBody.appendChild(makeRow('Width',
    makeNumberInput(node.width ?? 1280, 100, 16000, 1,
      val => applyToNodes(nodes, editor, n => { n.width = val; })
    )
  ));

  frameBody.appendChild(makeRow('Height',
    makeNumberInput(node.height ?? 720, 60, 16000, 1,
      val => applyToNodes(nodes, editor, n => { n.height = val; })
    )
  ));

  frameBody.appendChild(makeRow('Background',
    makeColorInput(node.background ?? '#ffffff',
      val => applyToNodes(nodes, editor, n => { n.background = val; })
    )
  ));

  frameBody.appendChild(makeRow('Show title',
    makeToggle(node.showTitle ?? true,
      val => applyToNodes(nodes, editor, n => { n.showTitle = val; })
    )
  ));

  frameBody.appendChild(makeRow('Clip children',
    makeToggle(node.clipChildren ?? true,
      val => applyToNodes(nodes, editor, n => { n.clipChildren = val; })
    )
  ));

  frag.appendChild(frameSec);

  // --- Presets ---
  const { section: presetSec, body: presetBody } = makeSection('Size presets', true);

  const presets = [
    ['1920 × 1080', 1920, 1080],
    ['1280 × 720',  1280,  720],
    ['1366 × 768',  1366,  768],
    ['2560 × 1440', 2560, 1440],
    ['3840 × 2160', 3840, 2160],
    ['A4 portrait',   794, 1123],
    ['A4 landscape', 1123,  794],
    ['Letter',        816, 1056],
    ['Instagram square',  1080, 1080],
    ['Instagram story',    1080, 1920],
    ['Twitter banner',     1500,  500],
    ['LinkedIn cover',     1584,  396],
  ];

  const presetGrid = document.createElement('div');
  presetGrid.className = 'props-preset-grid';
  presets.forEach(([label, w, h]) => {
    const btn = makeButton(label, () => {
      applyToNodes(nodes, editor, n => { n.width = w; n.height = h; });
    }, 'ghost');
    presetGrid.appendChild(btn);
  });
  presetBody.appendChild(presetGrid);

  frag.appendChild(presetSec);

  return frag;
}

/* ─────────────────────────────────────────────
   GENERIC fallback
───────────────────────────────────────────── */
function buildGenericSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Properties');

  // Dump enumerable own properties as text rows
  const skip = new Set(['id','type','children','__internal']);
  Object.keys(node).filter(k => !skip.has(k)).forEach(key => {
    const val = node[key];
    if (typeof val === 'object' && val !== null) return; // skip nested
    body.appendChild(makeRow(key,
      makeTextInput(String(val ?? ''),
        newVal => applyToNodes(nodes, editor, n => { n[key] = newVal; })
      )
    ));
  });

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Utilities
───────────────────────────────────────────── */
function applyToNodes(nodes, editor, fn) {
  editor.batch(() => nodes.forEach(fn));
}

function normalizeHex(raw) {
  try {
    const s = String(raw ?? '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      return '#' + s[1].repeat(2) + s[2].repeat(2) + s[3].repeat(2);
    }
    // rgb(...)
    const m = s.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
    if (m) {
      const h = n => Math.max(0, Math.min(255, +n)).toString(16).padStart(2, '0');
      return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
    }
    return '#000000';
  } catch {
    return '#000000';
  }
}

function parseFilters(filterStr) {
  const out = {};
  const re = /(\w+)\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(filterStr)) !== null) {
    const fn  = m[1];
    const arg = parseFloat(m[2]);
    if (!isNaN(arg)) out[fn] = arg;
  }
  return out;
}

function serializeFilters(obj) {
  return Object.entries(obj)
    .map(([fn, val]) => {
      if (fn === 'blur')      return `blur(${val}px)`;
      if (fn === 'grayscale') return `grayscale(${val})`;
      return `${fn}(${val})`;
    })
    .join(' ');
}

/* ─────────────────────────────────────────────
   Additional property sections (v1.15.x additions)
───────────────────────────────────────────── */

// Accessibility panel
export function buildAccessibilitySection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Accessibility');

  body.appendChild(makeRow('ARIA label',
    makeTextInput(node.ariaLabel ?? '',
      val => applyToNodes(nodes, editor, n => { n.ariaLabel = val; })
    )
  ));

  body.appendChild(makeRow('ARIA role',
    makeSelect(
      [['','(none)'],['button','button'],['link','link'],['heading','heading'],
       ['img','img'],['region','region'],['navigation','navigation'],
       ['banner','banner'],['main','main'],['complementary','complementary'],
       ['contentinfo','contentinfo'],['form','form'],['search','search'],
       ['alert','alert'],['dialog','dialog'],['tooltip','tooltip'],
       ['tabpanel','tabpanel'],['tab','tab'],['tablist','tablist']],
      node.ariaRole ?? '',
      val => applyToNodes(nodes, editor, n => { n.ariaRole = val; })
    )
  ));

  body.appendChild(makeRow('Tab index',
    makeNumberInput(node.tabIndex ?? 0, -1, 32767, 1,
      val => applyToNodes(nodes, editor, n => { n.tabIndex = val; })
    )
  ));

  body.appendChild(makeRow('Hidden from AT',
    makeToggle(node.ariaHidden ?? false,
      val => applyToNodes(nodes, editor, n => { n.ariaHidden = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

// Interaction / link panel
export function buildInteractionSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Interaction');

  body.appendChild(makeRow('Link URL',
    makeTextInput(node.linkUrl ?? '',
      val => applyToNodes(nodes, editor, n => { n.linkUrl = val; })
    )
  ));

  body.appendChild(makeRow('Link target',
    makeSelect(
      [['_self','Same tab'],['_blank','New tab'],['_parent','Parent'],
       ['_top','Top']],
      node.linkTarget ?? '_blank',
      val => applyToNodes(nodes, editor, n => { n.linkTarget = val; })
    )
  ));

  body.appendChild(makeRow('Tooltip',
    makeTextInput(node.tooltip ?? '',
      val => applyToNodes(nodes, editor, n => { n.tooltip = val; })
    )
  ));

  body.appendChild(makeRow('Cursor',
    makeSelect(
      [['default','Default'],['pointer','Pointer'],['move','Move'],
       ['text','Text'],['crosshair','Crosshair'],['not-allowed','Not allowed'],
       ['grab','Grab'],['zoom-in','Zoom in'],['zoom-out','Zoom out']],
      node.cursor ?? 'default',
      val => applyToNodes(nodes, editor, n => { n.cursor = val; })
    )
  ));

  body.appendChild(makeRow('Draggable',
    makeToggle(node.draggable ?? true,
      val => applyToNodes(nodes, editor, n => { n.draggable = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

// Animation panel
export function buildAnimationSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Animation');

  body.appendChild(makeRow('Entrance',
    makeSelect(
      [['none','None'],['fade','Fade in'],['slide-up','Slide up'],
       ['slide-down','Slide down'],['slide-left','Slide from left'],
       ['slide-right','Slide from right'],['zoom-in','Zoom in'],
       ['zoom-out','Zoom out'],['flip-x','Flip X'],['flip-y','Flip Y'],
       ['bounce','Bounce'],['rotate','Rotate in']],
      node.entranceAnim ?? 'none',
      val => applyToNodes(nodes, editor, n => { n.entranceAnim = val; })
    )
  ));

  body.appendChild(makeRow('Duration (ms)',
    makeNumberInput(node.animDuration ?? 400, 50, 5000, 50,
      val => applyToNodes(nodes, editor, n => { n.animDuration = val; })
    )
  ));

  body.appendChild(makeRow('Delay (ms)',
    makeNumberInput(node.animDelay ?? 0, 0, 10000, 50,
      val => applyToNodes(nodes, editor, n => { n.animDelay = val; })
    )
  ));

  body.appendChild(makeRow('Easing',
    makeSelect(
      [['ease','Ease'],['ease-in','Ease in'],['ease-out','Ease out'],
       ['ease-in-out','Ease in-out'],['linear','Linear'],
       ['spring','Spring'],['bounce','Bounce']],
      node.animEasing ?? 'ease',
      val => applyToNodes(nodes, editor, n => { n.animEasing = val; })
    )
  ));

  body.appendChild(makeRow('Loop',
    makeToggle(node.animLoop ?? false,
      val => applyToNodes(nodes, editor, n => { n.animLoop = val; })
    )
  ));

  body.appendChild(makeRow('Iterations',
    makeNumberInput(node.animIterations ?? 1, 1, 999, 1,
      val => applyToNodes(nodes, editor, n => { n.animIterations = val; })
    )
  ));

  const previewBtn = makeButton('Preview animation', () => {
    editor.previewAnimation(nodes);
  }, 'secondary');
  body.appendChild(previewBtn);

  frag.appendChild(section);
  return frag;
}

// Data binding panel (for template / form workflows)
export function buildDataBindingSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Data binding', true);

  body.appendChild(makeRow('Bind key',
    makeTextInput(node.bindKey ?? '',
      val => applyToNodes(nodes, editor, n => { n.bindKey = val; })
    )
  ));

  body.appendChild(makeRow('Bind property',
    makeSelect(
      [['content','Content'],['src','Source'],['href','Link'],
       ['style.color','Text color'],['style.backgroundColor','Background'],
       ['style.opacity','Opacity'],['style.fontSize','Font size'],
       ['visible','Visibility'],['disabled','Disabled']],
      node.bindProp ?? 'content',
      val => applyToNodes(nodes, editor, n => { n.bindProp = val; })
    )
  ));

  body.appendChild(makeRow('Default value',
    makeTextInput(node.bindDefault ?? '',
      val => applyToNodes(nodes, editor, n => { n.bindDefault = val; })
    )
  ));

  body.appendChild(makeRow('Transform expr.',
    makeTextInput(node.bindTransform ?? '',
      val => applyToNodes(nodes, editor, n => { n.bindTransform = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

// Export / share helpers
export function buildExportSection(nodes, editor) {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('Export', true);

  const formats = [['png','PNG'],['svg','SVG'],['pdf','PDF'],
                   ['jpg','JPEG'],['webp','WebP']];

  const fmtSel = makeSelect(formats, 'png', () => {});
  body.appendChild(makeRow('Format', fmtSel));

  const scaleSel = makeSelect(
    [['1','1×'],['2','2×'],['3','3×'],['4','4×']],
    '2', () => {}
  );
  body.appendChild(makeRow('Scale', scaleSel));

  const exportBtn = makeButton('Export selection', () => {
    const fmt   = fmtSel.value;
    const scale = +scaleSel.value;
    editor.exportNodes(nodes, { format: fmt, scale }).then(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `export.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }, 'primary');
  body.appendChild(exportBtn);

  const copyBtn = makeButton('Copy as PNG', () => {
    editor.exportNodes(nodes, { format: 'png', scale: 2 }).then(blob => {
      const item = new ClipboardItem({ 'image/png': blob });
      navigator.clipboard.write([item]).then(() => {
        showToast('Copied to clipboard', 'success');
      });
    });
  }, 'secondary');
  body.appendChild(copyBtn);

  frag.appendChild(section);
  return frag;
}

// Locking & visibility
export function buildLockSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Lock & visibility');

  body.appendChild(makeRow('Locked',
    makeToggle(node.locked ?? false,
      val => applyToNodes(nodes, editor, n => { n.locked = val; })
    )
  ));

  body.appendChild(makeRow('Visible',
    makeToggle(node.visible ?? true,
      val => applyToNodes(nodes, editor, n => { n.visible = val; })
    )
  ));

  body.appendChild(makeRow('Print visible',
    makeToggle(node.printVisible ?? true,
      val => applyToNodes(nodes, editor, n => { n.printVisible = val; })
    )
  ));

  body.appendChild(makeRow('Export visible',
    makeToggle(node.exportVisible ?? true,
      val => applyToNodes(nodes, editor, n => { n.exportVisible = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

// Comments / annotations
export function buildCommentSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Notes', true);

  const textarea = document.createElement('textarea');
  textarea.className = 'props-textarea';
  textarea.rows = 4;
  textarea.value = node.notes ?? '';
  textarea.placeholder = 'Add a note…';
  textarea.addEventListener('change', e => {
    applyToNodes(nodes, editor, n => { n.notes = e.target.value; });
  });
  body.appendChild(textarea);

  frag.appendChild(section);
  return frag;
}

// Grid / snap overrides
export function buildSnapSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Snap overrides', true);

  body.appendChild(makeRow('Snap enabled',
    makeToggle(node.snapEnabled ?? true,
      val => applyToNodes(nodes, editor, n => { n.snapEnabled = val; })
    )
  ));

  body.appendChild(makeRow('Snap X offset',
    makeNumberInput(node.snapOffsetX ?? 0, -500, 500, 1,
      val => applyToNodes(nodes, editor, n => { n.snapOffsetX = val; })
    )
  ));

  body.appendChild(makeRow('Snap Y offset',
    makeNumberInput(node.snapOffsetY ?? 0, -500, 500, 1,
      val => applyToNodes(nodes, editor, n => { n.snapOffsetY = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

// Z-order panel
export function buildZOrderSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Layer order');

  const btnWrap = document.createElement('div');
  btnWrap.className = 'props-btn-group';

  const toFrontBtn = makeButton('Bring to front',
    () => editor.bringToFront(nodes), 'secondary');
  const forwardBtn = makeButton('Forward',
    () => editor.bringForward(nodes), 'secondary');
  const backwardBtn = makeButton('Backward',
    () => editor.sendBackward(nodes), 'secondary');
  const toBackBtn = makeButton('Send to back',
    () => editor.sendToBack(nodes), 'secondary');

  btnWrap.appendChild(toFrontBtn);
  btnWrap.appendChild(forwardBtn);
  btnWrap.appendChild(backwardBtn);
  btnWrap.appendChild(toBackBtn);
  body.appendChild(btnWrap);

  body.appendChild(makeRow('Z index',
    makeNumberInput(node.zIndex ?? 0, -9999, 9999, 1,
      val => applyToNodes(nodes, editor, n => { n.zIndex = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

// Transform / geometry panel shared across shape types
export function buildTransformSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Transform');

  body.appendChild(makeRow('X',
    makeNumberInput(node.x ?? 0, -999999, 999999, 1,
      val => applyToNodes(nodes, editor, n => { n.x = val; })
    )
  ));

  body.appendChild(makeRow('Y',
    makeNumberInput(node.y ?? 0, -999999, 999999, 1,
      val => applyToNodes(nodes, editor, n => { n.y = val; })
    )
  ));

  body.appendChild(makeRow('Width',
    makeNumberInput(node.width ?? 100, 1, 16000, 1,
      val => applyToNodes(nodes, editor, n => { n.width = val; })
    )
  ));

  body.appendChild(makeRow('Height',
    makeNumberInput(node.height ?? 100, 1, 16000, 1,
      val => applyToNodes(nodes, editor, n => { n.height = val; })
    )
  ));

  body.appendChild(makeRow('Rotation (°)',
    makeNumberInput(node.rotation ?? 0, -360, 360, 0.1,
      val => applyToNodes(nodes, editor, n => { n.rotation = val; })
    )
  ));

  body.appendChild(makeRow('Flip H',
    makeToggle(node.flipH ?? false,
      val => applyToNodes(nodes, editor, n => { n.flipH = val; })
    )
  ));

  body.appendChild(makeRow('Flip V',
    makeToggle(node.flipV ?? false,
      val => applyToNodes(nodes, editor, n => { n.flipV = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

// --- Extra utility: build a full inspector by composing all relevant sections ---
export function buildFullInspector(nodes, editor) {
  const frag = document.createDocumentFragment();
  if (!nodes || nodes.length === 0) {
    frag.appendChild(emptyState());
    return frag;
  }

  const types = [...new Set(nodes.map(n => n.type))];
  const type  = types.length === 1 ? types[0] : 'mixed';

  if (type === 'mixed') {
    frag.appendChild(buildMixedSection(nodes));
  } else {
    // Core type section
    const coreBuilders = {
      text:      buildTextSection,
      image:     buildImageSection,
      shape:     buildShapeSection,
      table:     buildTableSection,
      code:      buildCodeSection,
      embed:     buildEmbedSection,
      connector: buildConnectorSection,
      group:     buildGroupSection,
      frame:     buildFrameSection,
    };
    const builder = coreBuilders[type] ?? buildGenericSection;
    frag.appendChild(builder(nodes, editor));
  }

  // Shared supplemental sections
  frag.appendChild(buildTransformSection(nodes, editor));
  frag.appendChild(buildZOrderSection(nodes, editor));
  frag.appendChild(buildLockSection(nodes, editor));
  frag.appendChild(buildAnimationSection(nodes, editor));
  frag.appendChild(buildInteractionSection(nodes, editor));
  frag.appendChild(buildAccessibilitySection(nodes, editor));
  frag.appendChild(buildDataBindingSection(nodes, editor));
  frag.appendChild(buildExportSection(nodes, editor));
  frag.appendChild(buildSnapSection(nodes, editor));
  frag.appendChild(buildCommentSection(nodes, editor));

  return frag;
}

/* ─────────────────────────────────────────────
   Filter helpers — extended
───────────────────────────────────────────── */

export function buildFilterSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Filters');
  const filters = parseFilters(node.style?.filter ?? '');

  const filterDefs = [
    { key: 'brightness', label: 'Brightness', min: 0, max: 3,   step: 0.01, def: 1 },
    { key: 'contrast',   label: 'Contrast',   min: 0, max: 3,   step: 0.01, def: 1 },
    { key: 'saturate',   label: 'Saturation', min: 0, max: 3,   step: 0.01, def: 1 },
    { key: 'hue-rotate', label: 'Hue rotate', min: 0, max: 360, step: 1,    def: 0 },
    { key: 'blur',       label: 'Blur (px)',  min: 0, max: 40,  step: 0.5,  def: 0 },
    { key: 'grayscale',  label: 'Grayscale',  min: 0, max: 1,   step: 0.01, def: 0 },
    { key: 'sepia',      label: 'Sepia',      min: 0, max: 1,   step: 0.01, def: 0 },
    { key: 'invert',     label: 'Invert',     min: 0, max: 1,   step: 0.01, def: 0 },
    { key: 'opacity',    label: 'Opacity',    min: 0, max: 1,   step: 0.01, def: 1 },
  ];

  filterDefs.forEach(({ key, label, min, max, step, def }) => {
    body.appendChild(makeRow(label,
      makeSlider(filters[key] ?? def, min, max, step,
        val => {
          filters[key] = val;
          applyToNodes(nodes, editor, n => {
            n.style = n.style || {};
            n.style.filter = serializeFilters(filters);
          });
        }
      )
    ));
  });

  const resetBtn = makeButton('Reset filters', () => {
    filterDefs.forEach(({ key }) => delete filters[key]);
    applyToNodes(nodes, editor, n => {
      n.style = n.style || {};
      n.style.filter = '';
    });
    // Re-render
    const panel = document.getElementById('properties-panel');
    if (panel) renderProperties(editor, panel);
  }, 'danger');
  body.appendChild(resetBtn);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Grid / guide helpers
───────────────────────────────────────────── */

export function buildGridSection(editor) {
  const frag = document.createDocumentFragment();
  const prefs = editor.getGridPrefs?.() ?? {};

  const { section, body } = makeSection('Grid & guides');

  body.appendChild(makeRow('Show grid',
    makeToggle(prefs.showGrid ?? true,
      val => editor.setGridPrefs?.({ showGrid: val })
    )
  ));

  body.appendChild(makeRow('Snap to grid',
    makeToggle(prefs.snapToGrid ?? true,
      val => editor.setGridPrefs?.({ snapToGrid: val })
    )
  ));

  body.appendChild(makeRow('Grid size',
    makeNumberInput(prefs.gridSize ?? 16, 1, 256, 1,
      val => editor.setGridPrefs?.({ gridSize: val })
    )
  ));

  body.appendChild(makeRow('Grid color',
    makeColorInput(prefs.gridColor ?? '#e0e0e0',
      val => editor.setGridPrefs?.({ gridColor: val })
    )
  ));

  body.appendChild(makeRow('Show guides',
    makeToggle(prefs.showGuides ?? true,
      val => editor.setGridPrefs?.({ showGuides: val })
    )
  ));

  body.appendChild(makeRow('Snap to guides',
    makeToggle(prefs.snapToGuides ?? true,
      val => editor.setGridPrefs?.({ snapToGuides: val })
    )
  ));

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Color-theme section
───────────────────────────────────────────── */

export function buildThemeSection(editor) {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('Canvas theme');

  const themes = [
    ['light','Light'],['dark','Dark'],['high-contrast','High contrast'],
    ['sepia','Sepia'],['blueprint','Blueprint'],['paper','Paper'],
  ];

  body.appendChild(makeRow('Theme',
    makeSelect(themes, editor.getTheme?.() ?? 'light',
      val => applyTheme(editor, val)
    )
  ));

  body.appendChild(makeRow('Background',
    makeColorInput(editor.getCanvasBg?.() ?? '#ffffff',
      val => editor.setCanvasBg?.(val)
    )
  ));

  const resetThemeBtn = makeButton('Reset to default', () => {
    applyTheme(editor, 'light');
  }, 'ghost');
  body.appendChild(resetThemeBtn);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   History / undo panel
───────────────────────────────────────────── */

export function buildHistorySection(editor) {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('History', true);

  const info = document.createElement('p');
  info.className = 'props-summary';
  const snap = editor.getHistorySnapshot?.();
  info.textContent = snap
    ? `${snap.undoCount} undo step${snap.undoCount !== 1 ? 's' : ''}, \
${snap.redoCount} redo step${snap.redoCount !== 1 ? 's' : ''}.`
    : 'History unavailable.';
  body.appendChild(info);

  const undoBtn = makeButton('Undo', () => editor.undo?.(), 'secondary');
  const redoBtn = makeButton('Redo', () => editor.redo?.(), 'secondary');
  const clearBtn = makeButton('Clear history', () => {
    confirmModal('Clear all history?', 'This cannot be undone.', () => {
      editor.clearHistory?.();
    });
  }, 'danger');

  const grp = document.createElement('div');
  grp.className = 'props-btn-group';
  grp.appendChild(undoBtn);
  grp.appendChild(redoBtn);
  grp.appendChild(clearBtn);
  body.appendChild(grp);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Collaboration / presence
───────────────────────────────────────────── */

export function buildCollaborationSection(editor) {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('Collaborators', true);

  const peers = editor.getPeers?.() ?? [];

  if (peers.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'props-summary';
    empty.textContent = 'No other collaborators online.';
    body.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'props-peer-list';
    peers.forEach(peer => {
      const li = document.createElement('li');
      li.className = 'props-peer';
      const avatar = document.createElement('span');
      avatar.className = 'props-peer-avatar';
      avatar.style.background = peer.color ?? '#888';
      avatar.textContent = (peer.name ?? '?')[0].toUpperCase();
      const name = document.createElement('span');
      name.textContent = peer.name ?? 'Anonymous';
      li.appendChild(avatar);
      li.appendChild(name);
      list.appendChild(li);
    });
    body.appendChild(list);
  }

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Font manager panel
───────────────────────────────────────────── */

export function buildFontManagerSection(editor) {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('Font manager', true);

  const loadedFonts = editor.getLoadedFonts?.() ?? [];

  const fontList = document.createElement('ul');
  fontList.className = 'props-font-list';
  loadedFonts.forEach(font => {
    const li = document.createElement('li');
    li.className = 'props-font-item';
    li.style.fontFamily = font.family;
    li.textContent = font.family;

    const removeBtn = makeButton('×', () => {
      editor.unloadFont?.(font.family);
      li.remove();
    }, 'ghost');
    removeBtn.title = 'Remove font';
    li.appendChild(removeBtn);
    fontList.appendChild(li);
  });
  body.appendChild(fontList);

  const loadInput = makeTextInput('', () => {});
  loadInput.placeholder = 'Font family name or URL…';
  const loadBtn = makeButton('Load font', () => {
    const val = loadInput.value.trim();
    if (!val) return;
    editor.loadFont?.(val).then(() => {
      showToast(`Font “${val}” loaded`, 'success');
      loadInput.value = '';
    }).catch(err => {
      showToast(`Failed to load font: ${err.message}`, 'error');
    });
  }, 'secondary');

  const loadRow = document.createElement('div');
  loadRow.className = 'props-load-font-row';
  loadRow.appendChild(loadInput);
  loadRow.appendChild(loadBtn);
  body.appendChild(loadRow);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Ruler / measurement
───────────────────────────────────────────── */

export function buildRulerSection(editor) {
  const frag = document.createDocumentFragment();
  const prefs = editor.getRulerPrefs?.() ?? {};

  const { section, body } = makeSection('Ruler & measurements');

  body.appendChild(makeRow('Show rulers',
    makeToggle(prefs.showRulers ?? true,
      val => editor.setRulerPrefs?.({ showRulers: val })
    )
  ));

  body.appendChild(makeRow('Unit',
    makeSelect(
      [['px','Pixels'],['pt','Points'],['mm','Millimetres'],
       ['cm','Centimetres'],['in','Inches'],['%','Percent']],
      prefs.unit ?? 'px',
      val => editor.setRulerPrefs?.({ unit: val })
    )
  ));

  body.appendChild(makeRow('DPI',
    makeNumberInput(prefs.dpi ?? 96, 72, 600, 1,
      val => editor.setRulerPrefs?.({ dpi: val })
    )
  ));

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Plugin slot: custom property panels
───────────────────────────────────────────── */

const _customSectionBuilders = [];

export function registerCustomSection(buildFn) {
  if (typeof buildFn === 'function') {
    _customSectionBuilders.push(buildFn);
  }
}

export function buildCustomSections(nodes, editor) {
  const frag = document.createDocumentFragment();
  _customSectionBuilders.forEach(fn => {
    try {
      const el = fn(nodes, editor);
      if (el) frag.appendChild(el);
    } catch (err) {
      console.warn('[properties] custom section error:', err);
    }
  });
  return frag;
}

/* ─────────────────────────────────────────────
   Paste-style helpers (copy styles from one node)
───────────────────────────────────────────── */

let _clipboardStyle = null;

export function buildStyleClipboardSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Style clipboard', true);

  const copyStyleBtn = makeButton('Copy style', () => {
    _clipboardStyle = JSON.parse(JSON.stringify(node.style ?? {}));
    showToast('Style copied', 'success');
  }, 'secondary');
  body.appendChild(copyStyleBtn);

  const pasteStyleBtn = makeButton('Paste style', () => {
    if (!_clipboardStyle) {
      showToast('Nothing in style clipboard', 'warning');
      return;
    }
    applyToNodes(nodes, editor, n => {
      n.style = { ...n.style, ..._clipboardStyle };
    });
    showToast('Style pasted', 'success');
  }, 'secondary');
  body.appendChild(pasteStyleBtn);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Search / filter panel
───────────────────────────────────────────── */

export function buildSearchSection(editor) {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('Find & select');

  const searchInput = makeTextInput('', () => {});
  searchInput.placeholder = 'Search by label, ID, or type…';

  const typeFilter = makeSelect(
    [['all','All types'],['text','Text'],['image','Image'],
     ['shape','Shape'],['table','Table'],['code','Code'],
     ['embed','Embed'],['connector','Connector'],
     ['group','Group'],['frame','Frame']],
    'all', () => {}
  );

  const searchBtn = makeButton('Find', () => {
    const q    = searchInput.value.trim();
    const type = typeFilter.value;
    const results = editor.findNodes({ query: q, type: type === 'all' ? undefined : type });
    editor.setSelection(results);
    showToast(`${results.length} element${results.length !== 1 ? 's' : ''} selected`, 'info');
  }, 'primary');

  body.appendChild(makeRow('Query', searchInput));
  body.appendChild(makeRow('Type', typeFilter));
  body.appendChild(searchBtn);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Batch-edit helpers
───────────────────────────────────────────── */

export function buildBatchEditSection(nodes, editor) {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('Batch edit', true);

  // Align
  const alignRow = document.createElement('div');
  alignRow.className = 'props-btn-group';
  [['align-left','Left'],['align-center','Center H'],['align-right','Right'],
   ['align-top','Top'],['align-middle','Center V'],['align-bottom','Bottom']]
    .forEach(([cmd, label]) => {
      alignRow.appendChild(makeButton(label, () => editor.alignNodes(nodes, cmd), 'ghost'));
    });
  body.appendChild(alignRow);

  // Distribute
  const distRow = document.createElement('div');
  distRow.className = 'props-btn-group';
  [['distribute-h','Distribute H'],['distribute-v','Distribute V']]
    .forEach(([cmd, label]) => {
      distRow.appendChild(makeButton(label, () => editor.distributeNodes(nodes, cmd), 'ghost'));
    });
  body.appendChild(distRow);

  // Same size
  const sizeRow = document.createElement('div');
  sizeRow.className = 'props-btn-group';
  [['same-width','Same width'],['same-height','Same height'],['same-size','Same size']]
    .forEach(([cmd, label]) => {
      sizeRow.appendChild(makeButton(label, () => editor.matchSize(nodes, cmd), 'ghost'));
    });
  body.appendChild(sizeRow);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Canvas-level properties
───────────────────────────────────────────── */

export function buildCanvasSection(editor) {
  const frag = document.createDocumentFragment();
  const info = editor.getCanvasInfo?.() ?? {};

  const { section, body } = makeSection('Canvas');

  body.appendChild(makeRow('Title',
    makeTextInput(info.title ?? 'Untitled',
      val => editor.setCanvasTitle?.(val)
    )
  ));

  body.appendChild(makeRow('Description',
    makeTextInput(info.description ?? '',
      val => editor.setCanvasDescription?.(val)
    )
  ));

  body.appendChild(makeRow('Width',
    makeNumberInput(info.width ?? 10000, 100, 100000, 100,
      val => editor.setCanvasSize?.({ width: val })
    )
  ));

  body.appendChild(makeRow('Height',
    makeNumberInput(info.height ?? 10000, 100, 100000, 100,
      val => editor.setCanvasSize?.({ height: val })
    )
  ));

  body.appendChild(makeRow('Zoom',
    makeSlider(
      Math.round((editor.getZoom?.() ?? 1) * 100) / 100,
      0.1, 8, 0.05,
      val => editor.setZoom?.(val)
    )
  ));

  body.appendChild(makeRow('Infinite canvas',
    makeToggle(info.infinite ?? false,
      val => editor.setCanvasInfinite?.(val)
    )
  ));

  const fitBtn = makeButton('Fit to screen', () => editor.fitScreen?.(), 'secondary');
  body.appendChild(fitBtn);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Diagnostics / debug
───────────────────────────────────────────── */

export function buildDiagnosticsSection(editor) {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('Diagnostics', true);

  const refreshBtn = makeButton('Refresh metrics', () => {
    const metrics = editor.getMetrics?.() ?? {};
    pre.textContent = JSON.stringify(metrics, null, 2);
  }, 'ghost');
  body.appendChild(refreshBtn);

  const pre = document.createElement('pre');
  pre.className = 'props-pre';
  pre.textContent = JSON.stringify(editor.getMetrics?.() ?? {}, null, 2);
  body.appendChild(pre);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Color-palette picker (document swatches)
───────────────────────────────────────────── */

export function buildPaletteSection(editor) {
  const frag = document.createDocumentFragment();
  const palette = editor.getPalette?.() ?? [];

  const { section, body } = makeSection('Document palette', true);

  const swatches = document.createElement('div');
  swatches.className = 'props-swatches';

  palette.forEach(color => {
    const btn = document.createElement('button');
    btn.className = 'props-swatch-btn';
    btn.title = color;
    btn.style.background = color;
    btn.addEventListener('click', () => {
      // Apply to selection if any
      const sel = editor.getSelection?.();
      if (sel && !sel.isEmpty()) {
        editor.batch(() => {
          sel.getNodes().forEach(n => { n.fill = color; });
        });
      }
    });
    swatches.appendChild(btn);
  });

  body.appendChild(swatches);

  const addColorInput = makeColorInput('#4f9eff', val => {});
  const addBtn = makeButton('Add to palette', () => {
    const colorInput = addColorInput.querySelector('input[type=color]');
    if (colorInput) {
      editor.addToPalette?.(colorInput.value);
      const btn = document.createElement('button');
      btn.className = 'props-swatch-btn';
      btn.title = colorInput.value;
      btn.style.background = colorInput.value;
      swatches.appendChild(btn);
    }
  }, 'ghost');

  body.appendChild(addColorInput);
  body.appendChild(addBtn);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Gradient editor (for shapes/frames)
───────────────────────────────────────────── */

export function buildGradientSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Gradient fill', true);

  body.appendChild(makeRow('Type',
    makeSelect(
      [['none','None'],['linear','Linear'],['radial','Radial'],
       ['conic','Conic'],['mesh','Mesh']],
      node.gradientType ?? 'none',
      val => applyToNodes(nodes, editor, n => { n.gradientType = val; })
    )
  ));

  body.appendChild(makeRow('Angle (°)',
    makeNumberInput(node.gradientAngle ?? 90, 0, 360, 1,
      val => applyToNodes(nodes, editor, n => { n.gradientAngle = val; })
    )
  ));

  body.appendChild(makeRow('Stop 1 color',
    makeColorInput(node.gradientStop1 ?? '#4f9eff',
      val => applyToNodes(nodes, editor, n => { n.gradientStop1 = val; })
    )
  ));

  body.appendChild(makeRow('Stop 1 pos (%)',
    makeNumberInput(node.gradientStop1Pos ?? 0, 0, 100, 1,
      val => applyToNodes(nodes, editor, n => { n.gradientStop1Pos = val; })
    )
  ));

  body.appendChild(makeRow('Stop 2 color',
    makeColorInput(node.gradientStop2 ?? '#a78bfa',
      val => applyToNodes(nodes, editor, n => { n.gradientStop2 = val; })
    )
  ));

  body.appendChild(makeRow('Stop 2 pos (%)',
    makeNumberInput(node.gradientStop2Pos ?? 100, 0, 100, 1,
      val => applyToNodes(nodes, editor, n => { n.gradientStop2Pos = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Border / outline editor
───────────────────────────────────────────── */

export function buildBorderSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Border');

  body.appendChild(makeRow('Color',
    makeColorInput(node.borderColor ?? '#cccccc',
      val => applyToNodes(nodes, editor, n => { n.borderColor = val; })
    )
  ));

  body.appendChild(makeRow('Width',
    makeNumberInput(node.borderWidth ?? 1, 0, 50, 0.5,
      val => applyToNodes(nodes, editor, n => { n.borderWidth = val; })
    )
  ));

  body.appendChild(makeRow('Style',
    makeSelect(
      [['solid','Solid'],['dashed','Dashed'],['dotted','Dotted'],
       ['double','Double'],['groove','Groove'],['ridge','Ridge'],
       ['inset','Inset'],['outset','Outset'],['none','None']],
      node.borderStyle ?? 'solid',
      val => applyToNodes(nodes, editor, n => { n.borderStyle = val; })
    )
  ));

  // Per-side overrides
  const { section: perSideSec, body: perSideBody } = makeSection('Per-side border', true);
  ['top','right','bottom','left'].forEach(side => {
    perSideBody.appendChild(makeRow(`${side[0].toUpperCase() + side.slice(1)} width`,
      makeNumberInput(node.border?.[side]?.width ?? node.borderWidth ?? 1, 0, 50, 0.5,
        val => applyToNodes(nodes, editor, n => {
          n.border = n.border || {};
          n.border[side] = n.border[side] || {};
          n.border[side].width = val;
        })
      )
    ));
  });
  frag.appendChild(perSideSec);

  body.appendChild(makeRow('Radius (px)',
    makeNumberInput(node.borderRadius ?? 0, 0, 9999, 1,
      val => applyToNodes(nodes, editor, n => { n.borderRadius = val; })
    )
  ));

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Margin / padding box model editor
───────────────────────────────────────────── */

export function buildBoxModelSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Box model', true);

  const sides = ['top','right','bottom','left'];

  const paddingHeader = document.createElement('p');
  paddingHeader.className = 'props-subheader';
  paddingHeader.textContent = 'Padding';
  body.appendChild(paddingHeader);

  sides.forEach(side => {
    body.appendChild(makeRow(side[0].toUpperCase() + side.slice(1),
      makeNumberInput(node.padding?.[side] ?? 0, 0, 500, 1,
        val => applyToNodes(nodes, editor, n => {
          n.padding = n.padding || {};
          n.padding[side] = val;
        })
      )
    ));
  });

  const marginHeader = document.createElement('p');
  marginHeader.className = 'props-subheader';
  marginHeader.textContent = 'Margin';
  body.appendChild(marginHeader);

  sides.forEach(side => {
    body.appendChild(makeRow(side[0].toUpperCase() + side.slice(1),
      makeNumberInput(node.margin?.[side] ?? 0, -500, 500, 1,
        val => applyToNodes(nodes, editor, n => {
          n.margin = n.margin || {};
          n.margin[side] = val;
        })
      )
    ));
  });

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Version stamp
───────────────────────────────────────────── */

export const PROPERTIES_VERSION = '1.15.7';

/* ─────────────────────────────────────────────
   Keyboard-shortcut hint panel
───────────────────────────────────────────── */

export function buildShortcutSection() {
  const frag = document.createDocumentFragment();

  const { section, body } = makeSection('Keyboard shortcuts', true);

  const shortcuts = [
    ['⌘Z / Ctrl+Z', 'Undo'],
    ['⌘⇧Z / Ctrl+Y', 'Redo'],
    ['⌘C', 'Copy'],
    ['⌘V', 'Paste'],
    ['⌘D', 'Duplicate'],
    ['Del / Backspace', 'Delete'],
    ['⌘A', 'Select all'],
    ['⌘G', 'Group'],
    ['⌘⇧G', 'Ungroup'],
    ['⌘[', 'Send backward'],
    ['⌘]', 'Bring forward'],
    ['⌘⇧[', 'Send to back'],
    ['⌘⇧]', 'Bring to front'],
    ['Space + drag', 'Pan'],
    ['⌘ + scroll', 'Zoom'],
    ['F', 'Fit to screen'],
    ['T', 'Text tool'],
    ['R', 'Rectangle tool'],
    ['O', 'Ellipse tool'],
    ['L', 'Line tool'],
    ['P', 'Pen tool'],
    ['I', 'Image tool'],
    ['E', 'Eraser'],
  ];

  const table = document.createElement('table');
  table.className = 'props-shortcut-table';
  shortcuts.forEach(([key, desc]) => {
    const tr = document.createElement('tr');
    const tdKey = document.createElement('td');
    tdKey.className = 'props-shortcut-key';
    tdKey.innerHTML = `<kbd>${key}</kbd>`;
    const tdDesc = document.createElement('td');
    tdDesc.textContent = desc;
    tr.appendChild(tdKey);
    tr.appendChild(tdDesc);
    table.appendChild(tr);
  });
  body.appendChild(table);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   CSS variable / token editor
───────────────────────────────────────────── */

export function buildTokenSection(editor) {
  const frag = document.createDocumentFragment();
  const tokens = editor.getDesignTokens?.() ?? {};

  const { section, body } = makeSection('Design tokens', true);

  Object.entries(tokens).forEach(([key, val]) => {
    const isColor = /color|fill|stroke|bg|background|border|shadow/i.test(key) &&
                    typeof val === 'string' && val.startsWith('#');
    const control = isColor
      ? makeColorInput(val, newVal => editor.setDesignToken?.(key, newVal))
      : makeTextInput(String(val), newVal => editor.setDesignToken?.(key, newVal));
    body.appendChild(makeRow(key, control));
  });

  if (Object.keys(tokens).length === 0) {
    const empty = document.createElement('p');
    empty.className = 'props-summary';
    empty.textContent = 'No design tokens defined.';
    body.appendChild(empty);
  }

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   Prototype / interaction flow
───────────────────────────────────────────── */

export function buildPrototypeSection(nodes, editor) {
  const frag = document.createDocumentFragment();
  const node  = nodes[0];

  const { section, body } = makeSection('Prototype', true);

  body.appendChild(makeRow('Trigger',
    makeSelect(
      [['click','On click'],['hover','On hover'],['focus','On focus'],
       ['blur','On blur'],['keypress','On key press'],['load','On load']],
      node.protoTrigger ?? 'click',
      val => applyToNodes(nodes, editor, n => { n.protoTrigger = val; })
    )
  ));

  body.appendChild(makeRow('Action',
    makeSelect(
      [['none','None'],['navigate','Navigate to'],['scroll','Scroll to'],
       ['open-url','Open URL'],['toggle-visibility','Toggle visibility'],
       ['play-anim','Play animation'],['run-script','Run script']],
      node.protoAction ?? 'none',
      val => applyToNodes(nodes, editor, n => { n.protoAction = val; })
    )
  ));

  body.appendChild(makeRow('Target',
    makeTextInput(node.protoTarget ?? '',
      val => applyToNodes(nodes, editor, n => { n.protoTarget = val; })
    )
  ));

  body.appendChild(makeRow('Transition',
    makeSelect(
      [['none','None'],['fade','Fade'],['slide','Slide'],
       ['push','Push'],['cover','Cover'],['dissolve','Dissolve']],
      node.protoTransition ?? 'none',
      val => applyToNodes(nodes, editor, n => { n.protoTransition = val; })
    )
  ));

  const previewBtn = makeButton('Preview flow', () => {
    editor.previewPrototype?.(node);
  }, 'secondary');
  body.appendChild(previewBtn);

  frag.appendChild(section);
  return frag;
}

/* ─────────────────────────────────────────────
   END OF FILE
───────────────────────────────────────────── */
