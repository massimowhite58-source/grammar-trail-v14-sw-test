/* Grammar Trail PWA — bounded app-shell cache.
   Test candidate: uses an isolated cache namespace and never deletes
   legacy caches that may belong to another app on the same origin. */
const CACHE_NAME = "grammar-trail-v14-sw-test-v2-1";
const CACHE_PREFIX = "grammar-trail-v14-sw-test-";

const APP_SHELL = [
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

const INDEX_URL = new URL("./index.html", self.registration.scope).href;
const ROOT_PATH = new URL("./", self.registration.scope).pathname;
const APP_SHELL_PATHS = new Set([
  ROOT_PATH,
  ...APP_SHELL.map(path => new URL(path, self.registration.scope).pathname)
]);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(name => {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) {
        return caches.delete(name);
      }
      return Promise.resolve(false);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search) return;
  if (!APP_SHELL_PATHS.has(url.pathname)) return;

  const isNavigation = request.mode === "navigate";
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (isNavigation) {
      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === "basic") {
          await cache.put(INDEX_URL, response.clone());
        }
        return response;
      } catch (_) {
        return (await cache.match(request)) ||
          (await cache.match(INDEX_URL)) ||
          Response.error();
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
