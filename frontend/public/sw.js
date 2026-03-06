const CACHE_NAME = "ping-sentinel-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json", "/sw.js", "/icon-512x512.png"];

// Install — cache the app shell
self.addEventListener("install", (event) => {
    console.log("[Service Worker] Installed. Caching static assets...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).catch((err) => {
            console.error("[Service Worker] Pre-caching failed:", err);
        })
    );
    self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
    console.log("[Service Worker] Activated. Cleaning up old caches...");
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch — network-first strategy for API calls, cache-first for static assets
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== "GET") return;

    // API calls: network-first (always try to get fresh data)
    if (url.pathname.startsWith("/api")) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    // Static assets: cache-first, fallback to network
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                return cached;
            }
            
            return fetch(request).then((response) => {
                // Ensure response is valid before caching
                if (!response || response.status !== 200 || response.type !== "basic") {
                    return response;
                }
                
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                
                return response;
            }).catch((err) => {
                console.error("[Service Worker] Fetch failed:", request.url, err);
            });
        })
    );
});
