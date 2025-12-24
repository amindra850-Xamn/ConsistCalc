// ConsistCalc Service Worker - Optimized for GitHub Pages
const CACHE_NAME = 'consistcalc-v2.4';

// Core assets to cache on install
const CORE_ASSETS = [
    './',
    './consistcalc.html',
    './manifest.json',
    './service-worker.js',
    './icon-16x16.png',
    './icon-32x32.png',
    './icon-72x72.png',
    './icon-180x180.png',
    './icon-192x192.png',
    './icon-512x512.png',
    // External Libraries
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

// Install - Cache core assets
self.addEventListener('install', event => {
    console.log('[SW] Installing version:', CACHE_NAME);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching core app shell');
                return Promise.allSettled(
                    CORE_ASSETS.map(url => {
                        return cache.add(url).catch(error => {
                            console.warn('[SW] Failed to cache:', url);
                            return null;
                        });
                    })
                );
            })
            .then(() => {
                console.log('[SW] Installation complete, skipping waiting');
                return self.skipWaiting();
            })
    );
});

// Activate - Clean old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating version:', CACHE_NAME);
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete, claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch - Advanced caching strategy
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension, blob, and data URLs
    if (requestUrl.protocol === 'chrome-extension:' || 
        requestUrl.protocol === 'blob:' ||
        requestUrl.protocol === 'data:') {
        return;
    }
    
    // Skip external domains (except CDNs we want to cache)
    const isCDN = requestUrl.hostname.includes('cdnjs.cloudflare.com') ||
                  requestUrl.hostname.includes('fonts.googleapis.com') ||
                  requestUrl.hostname.includes('fonts.gstatic.com');
    
    const isExternal = !requestUrl.href.includes(location.hostname);
    
    if (isExternal && !isCDN) {
        return;
    }
    
    event.respondWith(
        caches.match(requestUrl)
            .then(cached => {
                if (cached) {
                    return cached;
                }
                
                return fetch(requestUrl)
                    .then(response => {
                        // Cache successful responses
                        if (response && response.status === 200) {
                            const cache = caches.open(CACHE_NAME);
                            cache.then(c => c.put(requestUrl, response.clone()));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for HTML requests
                        if (requestUrl.pathname.endsWith('.html')) {
                            return caches.match('./consistcalc.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});
