/* Abrora service worker.
   - Everything is cached on first load, so the app opens with no connection.
   - A new version is installed in the background but NOT activated until the
     person taps "Update" (the page sends SKIP_WAITING). Their data lives in
     localStorage, which service workers never touch, so updating cannot erase it.
   - The version number comes from js/version.js (edit it there, not here).
   - Articles (/content/) are different: they are fetched fresh when there is a connection and kept in their own
     cache, so new articles reach phones WITHOUT an app update, and old ones still open offline. */
importScripts('js/version.js');

const VERSION = 'abrora-v' + self.ABRORA_RELEASE.version;
const CONTENT = 'abrora-content';   // survives app updates on purpose
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css', 'js/version.js', 'js/calendar.js', 'js/engine.js', 'js/i18n.js', 'js/content.js', 'js/lock.js',
  'content/index.json', 'js/update.js', 'js/sync.js', 'js/config.js', 'js/app.js',
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
    // Keep the bundled articles too, so the very first offline launch already has them (best effort).
    try {
      const idx = await (await cache.match('content/index.json')).json();
      const files = (idx.articles || []).map(a => 'content/' + (a.file || ('articles/' + a.id + '.json')));
      await cache.addAll(files.map(u => new Request(u, { cache: 'reload' })));
    } catch (e) { /* the page fetches them later */ }
    // No skipWaiting() here on purpose: the person decides when to switch.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION && k !== CONTENT && k.startsWith('abrora-')).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const d = event.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d.type === 'GET_RELEASE' && event.ports && event.ports[0]) event.ports[0].postMessage(self.ABRORA_RELEASE);
});

/* Articles: network first (short wait), then the last copy we saw, then the copy that shipped with the app. */
async function contentFetch(req) {
  const cc = await caches.open(CONTENT);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))]);
    if (res && res.ok) { cc.put(req.url, res.clone()); return res; }
    throw new Error('bad response');
  } catch (err) {
    const hit = (await cc.match(req.url)) || (await (await caches.open(VERSION)).match(req, { ignoreSearch: true }));
    return hit || new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/content/')) { event.respondWith(contentFetch(req)); return; }
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
