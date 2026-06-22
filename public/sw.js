// Bump CACHE_NAME when updating texlyre-busytex (package.json version)
const CACHE_NAME = 'busytex-v1';
const BUSYTEX_PREFIX = '/core/busytex/';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('busytex-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { pathname } = new URL(event.request.url);
  if (!pathname.startsWith(BUSYTEX_PREFIX)) return;
  // texlive-extra.data (324 MB) is already cached in IndexedDB by Emscripten's
  // EM_PRELOAD_CACHE — caching it here too would waste an identical 324 MB in
  // Cache API storage. Let the IndexedDB path handle it.
  if (pathname.endsWith('/texlive-extra.data')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) {
        cache.put(event.request, response.clone());
      }
      return response;
    })
  );
});
