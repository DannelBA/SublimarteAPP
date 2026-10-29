import { supabase } from './supabase'

const CLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY

// La llave pública viene en texto y el navegador la pide en bytes
function aBytes(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const limpio = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(limpio), (c) => c.charCodeAt(0))
}

const esIphone = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const estaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

function nombreDispositivo() {
  const ua = navigator.userAgent
  if (/iphone|ipad/i.test(ua)) return 'iPhone o iPad'
  if (/android/i.test(ua)) return 'Android'
  if (/windows/i.test(ua)) return 'Computador Windows'
  if (/mac/i.test(ua)) return 'Mac'
  return 'Dispositivo'
}

// Devuelve: 'instalar' | 'no-soportado' | 'denegado' | 'activo' | 'inactivo'
export async function estadoPush() {
  if (esIphone() && !estaInstalada()) return 'instalar'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'no-soportado'
  }
  if (Notification.permission === 'denied') return 'denegado'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'activo' : 'inactivo'
}

export async function activarPush(userId) {
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('No diste permiso para las notificaciones')

  await navigator.serviceWorker.register('/sw.js')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: aBytes(CLAVE_PUBLICA),
    })
  }

  const datos = sub.toJSON()
  // Si este dispositivo ya estaba guardado, se reemplaza para no duplicarlo
  await supabase.from('dispositivos_push').delete().eq('datos_suscripcion->>endpoint', datos.endpoint)
  const { error } = await supabase.from('dispositivos_push').insert({
    usuario_id: userId,
    nombre_dispositivo: nombreDispositivo(),
    datos_suscripcion: datos,
  })
  if (error) throw error
}

// Al cerrar sesión, este dispositivo deja de recibir los avisos de esa cuenta
export async function quitarPush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await supabase.from('dispositivos_push').delete().eq('datos_suscripcion->>endpoint', sub.endpoint)
    await sub.unsubscribe()
  } catch {
    // si algo falla, igual se cierra la sesión
  }
}