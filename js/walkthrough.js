// Contextual walkthrough — a first-party, zero-dependency guided tour. One generic tour
// runs for all diagram types; the step set can be filtered per type later if needed.
//
// The overlay uses a semi-transparent backdrop with a rectangular "spotlight" cut-out
// that highlights the target element (via CSS clip-path or SVG mask). Steps are
// declarative: each step names a CSS selector for the target element + a text blurb.
// No third-party libraries are used (no Shepherd, Intro.js, etc.).

const STEPS = [
  {
    target: '#btn-toggle-stencil',
    title: 'Component Library',
    body: 'Open the Stencil to browse and drag ready-made shapes onto the canvas.',
    placement: 'right',
  },
  {
    target: '#toolbar',
    title: 'Toolbar',
    body: 'Undo, redo, zoom, export, and more — all the common diagram actions live here.',
    placement: 'bottom',
  },
  {
    target: '#canvas-container',
    title: 'Canvas',
    body: 'This is your workspace. Drag shapes from the library, connect them with links, and arrange your diagram.',
    placement: 'top',
  },
  {
    target: '#properties-panel',
    title: 'Properties Panel',
    body: 'Click any element to edit its label, colour, and type-specific settings here.',
    placement: 'left',
  },
  {
    target: '#btn-export',
    title: 'Export',
    body: 'Download your diagram as a PNG, SVG, or JSON file whenever you're ready.',
    placement: 'bottom',
  },
];

let _overlay = null;
let _currentStep = 0;
let _active = false;

// ── public API ───────────────────────────────────────────────────────

export function startWalkthrough() {
  if (_active) return;
  _active = true;
  _currentStep = 0;
  _buildOverlay();
  _showStep(_currentStep);
}

export function stopWalkthrough() {
  if (!_active) return;
  _active = false;
  _teardownOverlay();
}

export function isActive() {
  return _active;
}

// ── overlay construction ─────────────────────────────────────────────

function _buildOverlay() {
  _overlay = document.createElement('div');
  _overlay.className = 'df-walkthrough-overlay';
  _overlay.setAttribute('role', 'dialog');
  _overlay.setAttribute('aria-modal', 'true');
  _overlay.setAttribute('aria-label', 'Guided walkthrough');

  // Click on backdrop (outside the popover) → advance / dismiss
  _overlay.addEventListener('click', (e) => {
    if (e.target === _overlay) _advance();
  });

  document.body.appendChild(_overlay);
}

function _teardownOverlay() {
  if (_overlay) { _overlay.remove(); _overlay = null; }
}

// ── step rendering ────────────────────────────────────────────────────

function _showStep(index) {
  if (!_overlay) return;
  _overlay.innerHTML = ''; // clear previous popover

  const step = STEPS[index];
  if (!step) { stopWalkthrough(); return; }

  const targetEl = document.querySelector(step.target);
  const targetRect = targetEl?.getBoundingClientRect();

  // ── spotlight ─────────────────────────────────────────────────────
  if (targetRect) {
    const PAD = 6;
    const spotX = targetRect.left - PAD;
    const spotY = targetRect.top  - PAD;
    const spotW = targetRect.width  + PAD * 2;
    const spotH = targetRect.height + PAD * 2;
    // Using CSS clip-path polygon with a hole isn't broadly supported yet,
    // so we use four absolutely-positioned overlay quadrants instead.
    const quads = [
      { top: 0, left: 0, right: 0,   height: spotY },                                 // top
      { top: spotY, left: 0,  width: spotX, bottom: 0 },                               // left
      { top: spotY, left: spotX + spotW, right: 0, bottom: 0 },                        // right
      { top: spotY + spotH, left: 0, right: 0, bottom: 0 },                            // bottom
    ];
    for (const q of quads) {
      const div = document.createElement('div');
      div.className = 'df-walkthrough-backdrop';
      Object.assign(div.style, { position: 'fixed', background: 'rgba(0,0,0,0.45)' },
        Object.fromEntries(Object.entries(q).map(([k,v]) => [k, typeof v === 'number' ? v+'px' : v])));
      _overlay.appendChild(div);
    }
  } else {
    // No target — full-screen backdrop
    const div = document.createElement('div');
    div.className = 'df-walkthrough-backdrop';
    div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45)';
    _overlay.appendChild(div);
  }

  // ── popover ───────────────────────────────────────────────────────
  const box = document.createElement('div');
  box.className = 'df-walkthrough-box';

  const title = document.createElement('h3');
  title.className = 'df-walkthrough-title';
  title.textContent = step.title;
  box.appendChild(title);

  const body = document.createElement('p');
  body.className = 'df-walkthrough-body';
  body.textContent = step.body;
  box.appendChild(body);

  // ── nav row ───────────────────────────────────────────────────────
  const nav = document.createElement('div');
  nav.className = 'df-walkthrough-nav';

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'df-walkthrough-btn df-walkthrough-btn--skip';
  skip.textContent = 'Skip tour';
  skip.addEventListener('click', stopWalkthrough);
  nav.appendChild(skip);

  const counter = document.createElement('span');
  counter.className = 'df-walkthrough-counter';
  counter.textContent = `${index + 1} / ${STEPS.length}`;
  nav.appendChild(counter);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'df-walkthrough-btn df-walkthrough-btn--next';
  next.textContent = index === STEPS.length - 1 ? 'Finish' : 'Next';
  next.addEventListener('click', _advance);
  nav.appendChild(next);

  box.appendChild(nav);
  _overlay.appendChild(box);

  // ── position the popover beside the target ────────────────────────
  _positionBox(box, targetRect, step.placement);
}

function _advance() {
  _currentStep++;
  if (_currentStep >= STEPS.length) { stopWalkthrough(); return; }
  _showStep(_currentStep);
}

// ── popover positioning ───────────────────────────────────────────────

function _positionBox(box, rect, placement) {
  const GAP = 12;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  // Measure the box first (rendered but off-screen)
  box.style.position = 'fixed';
  box.style.visibility = 'hidden';
  document.body.appendChild(box); // temporary attach for measurement
  const bw = box.offsetWidth  || 280;
  const bh = box.offsetHeight || 120;
  box.remove();
  box.style.visibility = '';

  let top, left;

  if (!rect) {
    // Centre on screen
    top  = vpH / 2 - bh / 2;
    left = vpW / 2 - bw / 2;
  } else {
    switch (placement) {
      case 'right':  left = rect.right + GAP;                  top = rect.top + rect.height/2 - bh/2; break;
      case 'left':   left = rect.left  - bw - GAP;             top = rect.top + rect.height/2 - bh/2; break;
      case 'bottom': top  = rect.bottom + GAP;                 left = rect.left + rect.width/2 - bw/2; break;
      case 'top':    top  = rect.top - bh - GAP;               left = rect.left + rect.width/2 - bw/2; break;
      default:       top  = rect.bottom + GAP;                 left = rect.left;
    }
    // Clamp within viewport
    left = Math.max(8, Math.min(left, vpW - bw - 8));
    top  = Math.max(8, Math.min(top,  vpH - bh - 8));
  }

  box.style.left = left + 'px';
  box.style.top  = top  + 'px';
}
