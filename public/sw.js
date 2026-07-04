// Service Worker to handle background/offline triggers and notification click focus
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Look for a client window that is open
      for (const client of clientList) {
        if ('focus' in client) {
          // Tell the client to open the reminder popup
          client.postMessage({ type: 'OPEN_REMINDER_POPUP', remId: event.notification.data?.remId });
          return client.focus();
        }
      }
      // If no window is open, open the homepage
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
