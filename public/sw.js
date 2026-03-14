// public/sw.js — PsikoPanel Service Worker
// Push bildirimleri + offline caching (temel)

const CACHE_NAME = 'psikopanel-v1'

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Push Bildirimi ────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'PsikoPanel', body: 'Randevunuz yaklaşıyor.', url: '/' }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icon-192.png',   // varsa
      badge:   '/icon-72.png',    // varsa
      tag:     'psikopanel-reminder',
      renotify: true,
      data:    { url: data.url },
    })
  )
})

// ── Bildirime tıklama ─────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
