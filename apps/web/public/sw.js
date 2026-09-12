// Service Worker for Library Management SaaS (PWA)
const CACHE_NAME = 'library-hub-v1';
const API_CACHE_NAME = 'library-hub-api-v1';

const STATIC_PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install Event: Pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[SW] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Event: Cache-First for static assets, Network-First for APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // SECURITY GUARD (ADR-005): Confidential KYC Identity Documents must NEVER be cached in the browser SW cache!
  if (
    url.pathname.includes('/storage/kyc') ||
    url.pathname.includes('/kyc-document') ||
    url.hostname.includes('res.cloudinary.com')
  ) {
    return; // Pass directly to network with zero caching
  }

  // Admin and API GET requests: Network-First with fallback to API Cache
  if (
    event.request.method === 'GET' &&
    (url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/api/v1/admin'))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'Offline / Network unavailable' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // Cache-First for Next.js static bundles and icons
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
        );
      })
    );
    return;
  }

  // Network-First with Cache Fallback for general navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
  }
});

// Web Push Event Handler
self.addEventListener('push', (event) => {
  let payload = {
    title: 'seeLibrary SaaS',
    body: 'New alert from your study center',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    url: '/',
    tag: 'seelibrary-alert',
  };

  try {
    if (event.data) {
      const data = event.data.json();
      payload = { ...payload, ...data };
    }
  } catch (err) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    vibrate: payload.vibrate || [100, 50, 100],
    tag: payload.tag || 'seelibrary-alert',
    renotify: true,
    data: {
      url: payload.url || payload.data?.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'open', title: 'Open seeLibrary' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Notification Click Handler: Open or focus application window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl) || targetUrl === '/') {
            return client.focus();
          }
          if ('navigate' in client) {
            return client.navigate(targetUrl).then((c) => c.focus());
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
