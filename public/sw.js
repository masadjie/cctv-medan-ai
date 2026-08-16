/**
 * Medan Traffic Vision Pro — PWA Service Worker
 * Engineered by Adjie Kurniawan (@adjie.apk)
 */

const CACHE_NAME = 'medan-cctv-vision-v2.1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/map.js',
  '/analytics.js',
  '/cctv_medan_data.js',
  '/favicon.svg',
  '/manifest.json'
];

// Install: Cache Static Shell Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Safe caching with scheme validation (Blocks chrome-extension:// errors)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // Only handle standard HTTP and HTTPS requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Exclude video streams, proxies, m3u8 playlists, and ts video segments
  if (
    url.pathname.includes('/stream/') ||
    url.pathname.includes('/proxy') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Static Assets: Cache first with network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Refresh cache in background if online
        fetch(req).then((fresh) => {
          if (fresh && fresh.status === 200 && req.url.startsWith('http')) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, fresh));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((networkRes) => {
        if (!networkRes || networkRes.status !== 200 || networkRes.type !== 'basic' || !req.url.startsWith('http')) {
          return networkRes;
        }
        const responseToCache = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, responseToCache));
        return networkRes;
      });
    })
  );
});
