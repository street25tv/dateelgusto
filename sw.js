/* Fogón POS · trabajador de servicio
   Guarda la app para que abra rápido y sin internet.
   Nunca guarda las respuestas de Apps Script: los datos siempre van en vivo. */
const VERSION = 'dge-v11';
const BASE = [
  './',
  './index.html',
  './cliente.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Datos en vivo: Apps Script nunca pasa por la caché
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;

  // Páginas: primero la red (para recibir cambios), si no hay internet la copia guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Íconos, fuentes y librerías: la copia guardada y se actualiza por detrás
  e.respondWith(
    caches.match(req).then(cached => {
      const red = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || red;
    })
  );
});
