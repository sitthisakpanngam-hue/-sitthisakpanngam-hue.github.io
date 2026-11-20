/* ไร่หยด — offline support
   page: network first (new versions arrive), cached copy when offline
   libraries / fonts / map tiles: cache first
   weather & elevation: network first, last answer kept for offline */
const V = 'raidrop-v13';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('raidrop-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const LIB = /(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/;
const TILE = /(server\.arcgisonline\.com|tile\.openstreetmap\.org|elevation-tiles-prod)/;
const DATA = /(api\.open-meteo\.com)/;
async function netFirst(req, store) {
  try { const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) { const c = await caches.open(store); c.put(req, r.clone()); } return r; }
  catch (e) { const m = await caches.match(req, { ignoreSearch: req.mode === 'navigate' }); if (m) return m; if (req.mode === 'navigate') return caches.match('./index.html'); throw e; }
}
async function cacheFirst(req, store, max) {
  const m = await caches.match(req); if (m) return m;
  const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) { const c = await caches.open(store); c.put(req, r.clone()); if (max) c.keys().then(ks => { if (ks.length > max) ks.slice(0, ks.length - max).forEach(k => c.delete(k)); }); }
  return r;
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.mode === 'navigate' || (u.origin === location.origin)) return e.respondWith(netFirst(req, V));
  if (LIB.test(u.host)) return e.respondWith(cacheFirst(req, V + '-lib'));
  if (TILE.test(u.host)) return e.respondWith(cacheFirst(req, V + '-tiles', 1500));
  if (DATA.test(u.host)) return e.respondWith(netFirst(req, V + '-data'));
});
