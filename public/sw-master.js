// Master Service Worker — combines Angular NGSW + custom push handling
// NGSW handles caching/offline; we add a reliable push display layer.
// Both handlers fire on push; using the same tag prevents duplicate notifications.

// Import Angular's ngsw-worker for caching/updates
importScripts('./ngsw-worker.js');

// ─── Push Notification Handler ───
// NGSW may silently swallow push events after deploys or when in degraded state.
// This listener always shows the notification. Same tag = no visible duplicates.
self.addEventListener('push', function (event) {
  if (!event.data) return;

  var raw;
  try {
    raw = event.data.json();
  } catch (e) {
    return;
  }

  var data = raw.notification || raw;
  if (!data.title) return;

  var options = {
    body: data.body || '',
    icon: data.icon || '/icons/scholaro-192.png',
    badge: data.badge || '/icons/scholaro-192.png',
    vibrate: data.vibrate || [100, 50, 100],
    tag: data.tag || 'scholaro-update',
    renotify: true,
    data: {
      url: (data.data && data.data.onActionClick && data.data.onActionClick.default && data.data.onActionClick.default.url)
        || data.url
        || '/parent/timeline',
    },
    actions: [{ action: 'open', title: 'View' }],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(function () {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then(function (clientList) {
        clientList.forEach(function (client) {
          client.postMessage({ type: 'PUSH_RECEIVED', payload: data });
        });
      })
  );
});

// ─── Notification Click Handler ───
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var targetPath = (event.notification.data && event.notification.data.url) || '/parent/timeline';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf('scholaro.app') !== -1 && 'navigate' in client) {
          return client.focus().then(function () {
            return client.navigate(targetPath);
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('https://scholaro.app' + targetPath);
      }
    })
  );
});
