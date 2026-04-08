// Service Worker for Push Notifications — Scholaro Preschool
// Fallback handler: Angular's ngsw-worker.js is the primary SW,
// but this handles push if ngsw is not active (e.g., dev mode)

self.addEventListener('push', function (event) {
  if (!event.data) return;

  const raw = event.data.json();
  // Support both NGSW nested format { notification: { title, body } }
  // and flat format { title, body }
  const data = raw.notification || raw;

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/scholaro-192.png',
    badge: '/icons/scholaro-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.data?.onActionClick?.default?.url || data.url || '/parent/timeline' },
    actions: [{ action: 'open', title: 'View' }],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Scholaro', options)
      .then(function () {
        // Notify all open app windows so they can auto-refresh
        return clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then(function (clientList) {
        clientList.forEach(function (client) {
          client.postMessage({ type: 'PUSH_RECEIVED', payload: data });
        });
      })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetPath = event.notification.data?.url || '/parent/timeline';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // 1. Check if any window is already open on scholaro.app
      for (const client of clientList) {
        if (client.url.includes('scholaro.app') && 'navigate' in client) {
          // Focus the existing window and navigate to the target page
          return client.focus().then(function () {
            return client.navigate(targetPath);
          });
        }
      }
      // 2. No existing window — open a new one
      if (clients.openWindow) {
        return clients.openWindow('https://scholaro.app' + targetPath);
      }
    }),
  );
});
