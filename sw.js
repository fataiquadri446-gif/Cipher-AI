
// Cipher service worker -- minimal pass-through.
// Its only job is to satisfy Chrome's install requirement;
// it doesn't cache anything, so it never risks serving
// stale chat data, auth state, or API responses.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
