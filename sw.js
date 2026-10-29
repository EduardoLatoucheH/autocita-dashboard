// Service worker mínimo y seguro (28/10/2026, Fase 3). Plantilla ÚNICA: build-compartido.py la genera para AutoCita, AutoVentas y la tienda.
// Marcadores de la plantilla (con guiones bajos dobles): CACHE (nombre con versión), CASCARA (archivos estáticos propios, relativos al alcance) y OFFLINE (página sin conexión).
// Reglas de seguridad:
//  1. Cachea SOLO los archivos estáticos de la cáscara (íconos, manifest y la página sin conexión). Nunca páginas, API, pedidos, clientes ni tokens.
//  2. Solo toca peticiones GET del mismo sitio; todo lo demás (la API de Railway, Supabase, fuentes, CDN) pasa directo al navegador.
//  3. Una navegación siempre va a la red (versión nueva garantizada); si no hay internet se muestra la página sin conexión.
//  4. Versión: cambiar PWA_VERSION en build-compartido.py renombra la caché; al activar se borran las anteriores.
// Este archivo no puede usar comillas invertidas ni dólar-llave (en la tienda se incrusta como texto).
const CACHE = 'autocita-panel-2026-10-28.1';
const BASE = self.registration.scope;
const CASCARA = ["manifest.webmanifest", "icon-192.png", "icon-512.png", "offline.html"].map(function (p) { return new URL(p, BASE).href; });
const OFFLINE = new URL('offline.html', BASE).href;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CASCARA); }).then(function () { return self.skipWaiting(); }));
});

function borrarOtras() {
  return caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); });
}
self.addEventListener('activate', function (e) {
  e.waitUntil(borrarOtras().then(function () { return self.clients.claim(); }));
});

// Cierre de sesión: la página pide limpiar. No hay datos de clientes en las cachés, pero se vacía todo lo que no sea la cáscara.
self.addEventListener('message', function (e) {
  if (e.data && e.data.tipo === 'limpiar') e.waitUntil(borrarOtras());
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(function () { return caches.match(OFFLINE).then(function (r) { return r || Response.error(); }); }));
    return;
  }
  // Solo archivos de la cáscara (sin parámetros): cualquier otra cosa se deja pasar sin tocarla.
  if (CASCARA.indexOf(url.origin + url.pathname) !== -1 && !url.search) {
    e.respondWith(caches.match(req).then(function (r) { return r || fetch(req); }));
  }
});
