const CACHE_NAME = 'blood-pressure-journal-v1';
const APP_FILES = [
  './',
  './index.html',
  './styles.css?v=20260808-6',
  './app.js?v=20260808-9',
  './cloud.js?v=20260808-9',
  './liff-init.js?v=20260808-6',
  './supabase-config.js?v=20260808-6',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
