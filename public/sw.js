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

  event.waitUntil(self.registration.showNotification(data.title || 'Scholaro', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/parent/timeline';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If the app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
