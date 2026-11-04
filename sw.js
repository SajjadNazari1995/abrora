/* Abrora service worker.
   - Everything is cached on first load, so the app opens with no connection.
   - A new version is installed in the background but NOT activated until the
     person taps "Update" (the page sends SKIP_WAITING). Their data lives in
     localStorage, which service workers never touch, so updating cannot erase it.
   - The version number comes from js/version.js (edit it there, not here). */
importScripts('js/version.js');

const VERSION = 'abrora-v' + self.ABRORA_RELEASE.version;
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css', 'js/version.js', 'js/engine.js', 'js/i18n.js', 'js/update.js', 'js/sync.js', 'js/config.js', 'js/app.js',
  'icons/logo.svg', 'icons/splash-bg.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon.png',
  'fonts/Vazir-Regular.woff2', 'fonts/Vazir-Medium.woff2', 'fonts/Vazir-Bold.woff2',
  'fonts/IRANSans-Regular.woff2', 'fonts/IRANSans-Regular.woff'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // cache:'reload' skips the browser's HTTP cache so a new version never installs stale files.
    await cache.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
    // No skipWaiting() here on purpose: the person decides when to switch.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION && k.startsWith('abrora-')).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const d = event.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d.type === 'GET_RELEASE' && event.ports && event.ports[0]) event.ports[0].postMessage(self.ABRORA_RELEASE);
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return (await cache.match('index.html')) || (await cache.match('./'));
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
