self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Llega un aviso: mostrarlo en la barra de notificaciones
self.addEventListener('push', (event) => {
  let datos = {}
  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    datos = { cuerpo: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(datos.titulo || 'SublimArte', {
      body: datos.cuerpo || '',
      icon: '/icon-192.png',
      badge: '/favicon.png',
      tag: datos.tag,
      data: { url: datos.url || '/' },
    })
  )
})

// La persona toca el aviso: abrir la página en el pedido
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const abierta = ventanas[0]
      if (abierta) {
        await abierta.focus()
        if ('navigate' in abierta) return abierta.navigate(destino)
        return
      }
      return self.clients.openWindow(destino)
    })()
  )
})