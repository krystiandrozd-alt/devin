// Contextual walkthrough — a first-party, zero-dependency guided tour. One generic tour
// runs for first-time users; diagram-type–specific tours can be registered and triggered
// from the relevant modules.  The walkthrough is fully keyboard-navigable.
//
// Public API
//   init()                           — wire up global listeners (call once)
//   startTour(tourId)                — start a named tour (or 'default')
//   registerTour(id, steps)          — add a custom tour
//   endTour()                        — dismiss current tour
//   onTourEnd(fn)                    — subscribe to tour-end events

const STORAGE_KEY = 'sf_diagram_walkthrough';

// ---------------------------------------------------------------------------
// Built-in default tour
// ---------------------------------------------------------------------------

const DEFAULT_TOUR = [
  {
    target: '#stencil-panel',
    title: 'Component Library',
    body: 'Drag shapes from the panel on the left onto the canvas to build your diagram.',
    position: 'right',
  },
  {
    target: '#toolbar',
    title: 'Toolbar',
    body: 'Use the toolbar to undo/redo, zoom, export, and switch diagram types.',
    position: 'bottom',
  },
  {
    target: '#canvas',
    title: 'Canvas',
    body: 'Click a shape to select it.  Drag between connector ports to draw links.',
    position: 'center',
  },
  {
    target: '#properties-panel',
    title: 'Properties',
    body: 'Select any element to edit its label, colour, and other attributes here.',
    position: 'left',
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const tours = new Map([['default', DEFAULT_TOUR]]);
let activeTour   = null;  // tour id string
let activeSteps  = [];    // step array
let activeIndex  = 0;     // current step index
let cardEl       = null;  // floating card DOM element
let overlayEl    = null;  // backdrop element
const endListeners = new Set();

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function init() {
  document.addEventListener('keydown', (e) => {
    if (!activeTour) return;
    if (e.key === 'Escape')           { endTour(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { nextStep(); return; }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { prevStep(); return; }
  });

  // Auto-start default tour for first-time visitors
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!state.defaultCompleted) {
      // Defer until DOM is fully ready
      requestAnimationFrame(() => startTour('default'));
    }
  } catch {
    // localStorage unavailable
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function registerTour(id, steps) {
  tours.set(id, steps);
}

export function startTour(tourId = 'default') {
  const steps = tours.get(tourId);
  if (!steps || steps.length === 0) return;

  // Clean up any running tour first
  if (activeTour) teardown();

  activeTour  = tourId;
  activeSteps = steps;
  activeIndex = 0;

  buildOverlay();
  renderStep(activeIndex);
}

export function endTour() {
  if (!activeTour) return;
  const id = activeTour;
  teardown();
  // Mark tour complete
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state[`${id}Completed`] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
  endListeners.forEach(fn => fn(id));
}

export function onTourEnd(fn) {
  endListeners.add(fn);
  return () => endListeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Step navigation
// ---------------------------------------------------------------------------

function nextStep() {
  if (activeIndex < activeSteps.length - 1) {
    activeIndex++;
    renderStep(activeIndex);
  } else {
    endTour();
  }
}

function prevStep() {
  if (activeIndex > 0) {
    activeIndex--;
    renderStep(activeIndex);
  }
}

// ---------------------------------------------------------------------------
// DOM building
// ---------------------------------------------------------------------------

function buildOverlay() {
  overlayEl = document.createElement('div');
  overlayEl.className = 'walkthrough-overlay';
  overlayEl.addEventListener('click', (e) => {
    // Click outside the card closes the tour
    if (!cardEl.contains(e.target)) endTour();
  });
  document.body.appendChild(overlayEl);
}

function renderStep(index) {
  const step = activeSteps[index];
  if (!step) return;

  // Remove old card
  if (cardEl) cardEl.remove();

  cardEl = document.createElement('div');
  cardEl.className = 'walkthrough-card';
  cardEl.setAttribute('role', 'dialog');
  cardEl.setAttribute('aria-modal', 'true');
  cardEl.setAttribute('aria-label', step.title);

  // Progress dots
  const dots = document.createElement('div');
  dots.className = 'walkthrough-dots';
  activeSteps.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'walkthrough-dot' + (i === index ? ' active' : '');
    dots.appendChild(dot);
  });

  // Title
  const title = document.createElement('h3');
  title.className = 'walkthrough-title';
  title.textContent = step.title;

  // Body
  const body = document.createElement('p');
  body.className = 'walkthrough-body';
  body.textContent = step.body;

  // Buttons
  const btnRow = document.createElement('div');
  btnRow.className = 'walkthrough-btn-row';

  const skipBtn = document.createElement('button');
  skipBtn.className = 'walkthrough-btn walkthrough-skip';
  skipBtn.textContent = 'Skip tour';
  skipBtn.addEventListener('click', endTour);

  const prevBtn = document.createElement('button');
  prevBtn.className = 'walkthrough-btn walkthrough-prev';
  prevBtn.textContent = '← Back';
  prevBtn.disabled = index === 0;
  prevBtn.addEventListener('click', prevStep);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'walkthrough-btn walkthrough-next';
  nextBtn.textContent = index === activeSteps.length - 1 ? 'Finish ✓' : 'Next →';
  nextBtn.addEventListener('click', nextStep);

  btnRow.appendChild(skipBtn);
  btnRow.appendChild(prevBtn);
  btnRow.appendChild(nextBtn);

  cardEl.appendChild(dots);
  cardEl.appendChild(title);
  cardEl.appendChild(body);
  cardEl.appendChild(btnRow);

  document.body.appendChild(cardEl);

  positionCard(step);

  // Focus the Next button for keyboard users
  nextBtn.focus();
}

// ---------------------------------------------------------------------------
// Card positioning
// ---------------------------------------------------------------------------

function positionCard(step) {
  if (!cardEl) return;

  const target = step.target ? document.querySelector(step.target) : null;

  if (!target || step.position === 'center') {
    // Centre on screen
    cardEl.style.top  = '50%';
    cardEl.style.left = '50%';
    cardEl.style.transform = 'translate(-50%, -50%)';
    return;
  }

  const rect = target.getBoundingClientRect();
  const cw = cardEl.offsetWidth  || 280;
  const ch = cardEl.offsetHeight || 160;
  const M  = 12; // margin from target
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top, left;

  switch (step.position) {
    case 'right':
      top  = rect.top + rect.height / 2 - ch / 2;
      left = rect.right + M;
      break;
    case 'left':
      top  = rect.top + rect.height / 2 - ch / 2;
      left = rect.left - cw - M;
      break;
    case 'bottom':
      top  = rect.bottom + M;
      left = rect.left + rect.width / 2 - cw / 2;
      break;
    case 'top':
    default:
      top  = rect.top - ch - M;
      left = rect.left + rect.width / 2 - cw / 2;
  }

  // Clamp to viewport
  cardEl.style.position = 'fixed';
  cardEl.style.left = `${Math.round(Math.max(M, Math.min(left, vw - cw - M)))}px`;
  cardEl.style.top  = `${Math.round(Math.max(M, Math.min(top, vh - ch - M)))}px`;
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

function teardown() {
  if (cardEl)    { cardEl.remove();    cardEl    = null; }
  if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  activeTour  = null;
  activeSteps = [];
  activeIndex = 0;
}
