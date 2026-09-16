// Service Worker for Library Management SaaS (PWA)
const CACHE_NAME = 'library-hub-v3';
const API_CACHE_NAME = 'library-hub-api-v3';

const STATIC_PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge.png',
  '/icons/badge-72x72.png',
  '/icons/badge-96x96.png',
  '/icons/badge-128x128.png',
  '/icons/badge-192x192.png',
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
          if (key !== CACHE_NAME) {
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

  // Live APIs must NEVER be cached by the Service Worker (Zero stale cache on refresh)
  if (url.pathname.startsWith('/api/')) {
    return; // Pass directly to network
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
    badge: '/icons/badge-96x96.png',
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

  // Helper to ensure absolute URLs for Android Chrome background notifications
  const resolveUrl = (path) => {
    if (!path) return undefined;
    if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
      return path;
    }
    try {
      return new URL(path, self.location.origin).href;
    } catch (e) {
      return path;
    }
  };

  const options = {
    body: payload.body,
    icon: resolveUrl(payload.icon || '/icons/icon-192x192.png'),
    badge: resolveUrl(payload.badge || '/icons/badge-96x96.png'),
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

  // Set or increment app badge on device home screen/taskbar if Badging API is supported
  const updateBadge = (async () => {
    if ('setAppBadge' in self.navigator) {
      try {
        await self.navigator.setAppBadge();
      } catch (e) {
        // Badging API ignored if not supported or permitted
      }
    }
  })();

  // Notify any active client windows so in-app toast pops up immediately
  const notifyClients = clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({
        type: 'PUSH_NOTIFICATION_RECEIVED',
        payload,
      });
    });
  });

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, options),
      notifyClients,
      updateBadge,
    ])
  );
});

// Notification Click Handler: Open or focus application window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Clear or decrement badge count
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {});
  }

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
