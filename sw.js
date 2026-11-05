const CACHE = 'disha-shell-v4.5.0';
const SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/main.js',
  './js/map.js',
  './js/commands.js',
  './js/config.js',
  './js/geo.js',
  './js/i18n.js',
  './js/nav.js',
  './js/places.js',
  './js/speech.js',
  './js/store.js',
  './js/transcription.js',
  './js/ui.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        if (new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match('./index.html')),
    ),
  );
});
