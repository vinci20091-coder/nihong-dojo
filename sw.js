// Service Worker per Nihongo Dojo — permette all'app di aprirsi anche offline.
// Strategia: "rete prima, cache come riserva" per l'app stessa, così quando sei
// online vedi sempre l'ultima versione pubblicata; quando sei offline, l'app
// si apre comunque mostrando l'ultima versione salvata.
// Le chiamate a Gemini NON vengono mai toccate: richiedono sempre una rete vera.

const CACHE_NAME = 'nihongo-dojo-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './offline-pack.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => { /* se un file manca, non blocchiamo l'installazione */ })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Mai intercettare le chiamate all'API di Gemini: devono sempre passare dalla rete vera
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // Gestiamo solo richieste GET dello stesso dominio dell'app
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
