const CACHE = 'msa-hris-v2';
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './dashboard.html',
  './css/app.css',
  './js/config.js',
  './js/api.js',
  './js/auth.js',
  './js/store.js',
  './js/app.js',
  './js/dashboard.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (isSameOrigin && r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
