const CACHE_NAME = 'finance-assistant-v1';
const ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'js/main.js',
    'js/ui.js',
    'js/state.js',
    'js/utils.js',
    'js/charts.js',
    'js/assistant.js',
    'logo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
