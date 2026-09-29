// Hexora offline cache: everything is stored on first visit, then the game runs without internet.
const CACHE = 'hexora-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'music/waves.mp3', 'music/natural-world-bass.mp3', 'music/cosmic-earth.mp3'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // audio uses range requests on iPhone: answer them from the cached full file
  if (req.headers.get('range') && req.url.includes('/music/')) {
    e.respondWith((async () => {
      const cached = await caches.match(req.url);
      const res = cached || await fetch(req.url);
      const buf = await res.clone().arrayBuffer();
      const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range'));
      const start = +m[1], end = m[2] ? +m[2] : buf.byteLength - 1;
      return new Response(buf.slice(start, end + 1), { status: 206, headers: {
        'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
        'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
    })());
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok && new URL(req.url).origin === location.origin) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
