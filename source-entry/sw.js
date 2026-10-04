const CACHE = 'estudio-source-v15';
const CACHE_PREFIX = 'estudio-source-v';
const PRECACHE = ['./', './estudio.html', './manifest.webmanifest', './icon.svg'];
const APP_ROOT = new URL('./', self.location.href);
const INDEX_URL = new URL('./estudio.html', APP_ROOT).href;
const APP_RESOURCES = new Set(PRECACHE.map(path => new URL(path, APP_ROOT).href));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function navigationResponse(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(INDEX_URL, response.clone());
      return response;
    }
    return (await cache.match(INDEX_URL)) || response;
  } catch (error) {
    return (await cache.match(INDEX_URL)) || new Response(
      'No hay conexión. Abrí Estudio con internet una vez para usarlo sin conexión.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== APP_ROOT.origin || !APP_RESOURCES.has(url.origin + url.pathname)) return;

  if (request.mode === 'navigate') {
    // A direct visit to the SVG or manifest must never replace the cached app.
    if (url.origin + url.pathname !== APP_ROOT.href && url.origin + url.pathname !== INDEX_URL) return;
    event.respondWith(navigationResponse(request));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
