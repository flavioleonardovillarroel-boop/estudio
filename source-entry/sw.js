const CACHE = 'estudio-source-v45';
const CACHE_PREFIX = 'estudio-source-v';
const PRECACHE = ["./", "./estudio.html", "./manifest.webmanifest", "./icon.svg", "./materiales/logistica-repaso-final.docx", "./materiales/mecanica-automotriz-16-preguntas.docx", "./materiales/logistica-repaso-dirigido.pdf", "./materiales/final-logistica-repaso.docx", "./materiales/sre-2218-solicitud-interna.docx", "./pjt.js", "./pjt.css", "./materiales/pjt/manual.pdf", "./materiales/pjt/presentacion.pdf", "./materiales/pjt/guia.docx", "./materiales/pjt/lamina-acronimos.webp", "./materiales/pjt/lamina-orden.webp", "./materiales/pjt/lamina-planeamiento.webp", "./materiales/pjt/lamina-procedimiento.webp", "./materiales/pjt/lamina-tipos.webp", "./materiales/pjt/video-regla.mp4", "./materiales/pjt/video-planeamiento.mp4", "./materiales/pjt/video-orden.mp4", "./materiales/finales/etica-y-mando-final.docx", "./materiales/finales/teoria-general-seis-temas.docx"];
const APP_ROOT = new URL('./', self.location.href);
const INDEX_URL = new URL('./estudio.html', APP_ROOT).href;
const APP_RESOURCES = new Set(PRECACHE.map(path => new URL(path, APP_ROOT).href));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(path => new Request(new URL(path, APP_ROOT).href, { cache: 'reload' })))).then(() => self.skipWaiting())
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
    if (url.origin + url.pathname !== APP_ROOT.href && url.origin + url.pathname !== INDEX_URL) {
      if (/\.(pdf|docx)$/i.test(url.pathname)) event.respondWith(cachedResourceResponse(request));
      return;
    }
    event.respondWith(navigationResponse(request));
    return;
  }

  event.respondWith(cachedResourceResponse(request));
});


async function cachedResourceResponse(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    const range = request.headers.get('Range');
    if (range && /\.(mp4|pdf)$/i.test(new URL(request.url).pathname)) return rangedResponse(cached, range);
    return cached;
  }
  const response = await fetch(request);
  if (response.ok && response.status === 200) await cache.put(request, response.clone());
  return response;
}

async function rangedResponse(response, range) {
  const blob = await response.blob(), size = blob.size;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (!match[1] && !match[2])) return new Response(null, {status:416,headers:{'Content-Range':'bytes */'+size}});
  let start, end;
  if (!match[1]) { start=Math.max(0,size-Number(match[2]));end=size-1; }
  else {start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start) return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
  const headers = new Headers(response.headers);
  headers.set('Content-Range','bytes '+start+'-'+end+'/'+size);
  headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
  headers.delete('Content-Encoding');
  return new Response(blob.slice(start,end+1),{status:206,statusText:'Partial Content',headers});
}

self.addEventListener('message',event=>{
  if(!event.data||event.data.type!=='PJT_OFFLINE_STATUS'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE),missing=[];
    for(const resource of PRECACHE){if(!await cache.match(new URL(resource,APP_ROOT).href,{ignoreSearch:true}))missing.push(resource);}
    event.ports[0].postMessage({pjtVersion:'pjt-20261028',cache:CACHE,ready:missing.length===0,missing});
  })());
});
