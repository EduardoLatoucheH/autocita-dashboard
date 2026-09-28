// Service worker de AutoCita (27/09/2026).
// Solo hace dos cosas: (1) que el panel abra aunque no haya internet en ese
// momento (muestra la última versión guardada de la pantalla), y (2) que
// Android/iPhone lo reconozcan como app instalable. NUNCA guarda respuestas de
// la API (Railway): pacientes, citas, pedidos y clientes siempre van en vivo,
// así que no queda ningún dato sensible guardado en el teléfono por esto.
const CACHE = 'autocita-panel-v1';
const CASCARA = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCARA)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Todo lo que no es de este mismo sitio (la API, fuentes, CDNs) pasa derecho.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Red primero: siempre la versión nueva del panel; la copia guardada solo
  // se usa si no hay conexión.
  e.respondWith(
    fetch(req).then((resp) => {
      if (resp.ok && (req.mode === 'navigate' || CASCARA.some((p) => url.pathname.endsWith(p.replace('./', '/'))))) {
        const copia = resp.clone();
        caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './' : req, copia));
      }
      return resp;
    }).catch(() => caches.match(req.mode === 'navigate' ? './' : req).then((r) => r || caches.match('./')))
  );
});
