/* Diagramforce service worker — offline app cache.
 *
 * The app is fully static. We use a cache-first strategy keyed on APP_VERSION
 * so that a version bump (changing APP_VERSION + all `?v=` query strings) lands
 * in a fresh cache and the old cache is purged on activation.
 *
 * IMPORTANT: keep APP_VERSION in lockstep with js/persistence.js — the manual
 * version bump documented in CLAUDE.md must update this file too.
 */

const APP_VERSION = '1.15.7';
const CACHE_NAME = `diagramforce-v${APP_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  `./css/variables.css?v=${APP_VERSION}`,
  `./css/theme.css?v=${APP_VERSION}`,
  `./css/layout.css?v=${APP_VERSION}`,
  `./css/toolbar.css?v=${APP_VERSION}`,
  `./css/stencil.css?v=${APP_VERSION}`,
  `./css/properties.css?v=${APP_VERSION}`,
  `./css/tabs.css?v=${APP_VERSION}`,
  `./css/canvas.css?v=${APP_VERSION}`,
  `./css/modals.css?v=${APP_VERSION}`,
  `./js/app.js?v=${APP_VERSION}`,
  `./assets/vendor/joint.min.js?v=${APP_VERSION}`,
  `./assets/vendor/pako.min.js?v=${APP_VERSION}`,
  './assets/logo.png',
  './assets/favicon.png',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('diagramforce-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const response = await fetch(req);
      if (response && response.ok && response.type !== 'opaque') {
        cache.put(req, response.clone()).catch(() => {});
      }
      return response;
    } catch (err) {
      return new Response('Offline and not cached', { status: 504, statusText: 'Gateway Timeout' });
    }
  })());
});
