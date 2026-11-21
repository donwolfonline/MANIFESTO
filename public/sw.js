/* ==========================================================================
   WORKING_COPY.md — Service Worker (sw.js)
   - Cache-First strategy for static assets (hashed JS/CSS bundles, WOFF2 fonts,
     icons, WebP/PNG images).
   - Network-First strategy for content (HTML navigations, /api/* endpoints,
     markdown/JSON data, web app manifest).
   - Offline fallback to /offline.html (styled like the 404 build-failure page)
     when a navigation request fails offline and the page is not cached.
   - Controlled update flow: waits when a new version installs over an active
     controller so the UI shows the "Update available" toast, and activates
     immediately on { type: 'SKIP_WAITING' }.
   ========================================================================== */

const SW_VERSION = 'v1.0.0';
const STATIC_CACHE = `working-copy-static-${SW_VERSION}`;
const CONTENT_CACHE = `working-copy-content-${SW_VERSION}`;
const OFFLINE_FALLBACK_URL = '/offline.html';

const PRECACHE_STATIC_URLS = [
  '/',
  '/index.html',
  OFFLINE_FALLBACK_URL,
  '/offline.js',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/fonts/instrument-serif-latin-400-normal.woff2',
  '/fonts/jetbrains-mono-latin-400-normal.woff2',
];

const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image']);
const STATIC_PATH_PREFIXES = ['/assets/', '/fonts/', '/icons/'];
const STATIC_EXACT_PATHS = new Set([
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/og-image.png',
  '/offline.js',
]);
const STATIC_EXTENSIONS_RE =
  /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|gif|svg|ico)$/i;

function isStaticAssetRequest(url, request) {
  if (url.pathname === '/sw.js') return false;
  if (STATIC_EXACT_PATHS.has(url.pathname)) return true;
  if (STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return true;
  }
  if (STATIC_DESTINATIONS.has(request.destination)) {
    return true;
  }
  if (
    request.mode !== 'navigate' &&
    !url.pathname.startsWith('/api/') &&
    STATIC_EXTENSIONS_RE.test(url.pathname)
  ) {
    return true;
  }
  return false;
}

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  if (request.destination === 'document') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      for (const url of PRECACHE_STATIC_URLS) {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch {
          // Ignore individual optional asset failure during precache
        }
      }
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== CONTENT_CACHE) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (
    response &&
    response.status === 200 &&
    (response.type === 'basic' || response.type === 'default')
  ) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstContent(request) {
  const contentCache = await caches.open(CONTENT_CACHE);
  try {
    const networkResponse = await fetch(request);
    if (
      networkResponse &&
      networkResponse.status === 200 &&
      (networkResponse.type === 'basic' || networkResponse.type === 'default')
    ) {
      contentCache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedContent = await contentCache.match(request);
    if (cachedContent) {
      return cachedContent;
    }

    const staticCache = await caches.open(STATIC_CACHE);
    const cachedStatic = await staticCache.match(request);
    if (cachedStatic) {
      return cachedStatic;
    }

    if (isNavigationRequest(request)) {
      const offlineFallback = await staticCache.match(OFFLINE_FALLBACK_URL);
      if (offlineFallback) {
        return offlineFallback;
      }
    }

    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'Network connection unavailable and content is not in cache.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  if (isStaticAssetRequest(url, request)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  event.respondWith(networkFirstContent(request));
});
