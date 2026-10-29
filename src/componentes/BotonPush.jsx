import { useEffect, useState } from 'react'
import { useAuth } from '../contexto/AuthContext'
import { activarPush, estadoPush } from '../lib/push'

export default function BotonPush() {
  const { user } = useAuth()
  const [estado, setEstado] = useState(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    estadoPush().then(async (e) => {
      // Si ya había dado permiso antes, se reactiva sola
      if (e === 'inactivo' && Notification.permission === 'granted') {
        try { await activarPush(user.id) } catch { /* se mostrará el botón */ }
        e = await estadoPush()
      }
      setEstado(e)
    })
  }, [user.id])

  async function activar() {
    setOcupado(true)
    setError('')
    try {
      await activarPush(user.id)
    } catch (e) {
      setError(e.message)
    }
    setEstado(await estadoPush())
    setOcupado(false)
  }

  if (!estado || estado === 'activo' || estado === 'no-soportado') return null

  return (
    <div className="aviso">
      {estado === 'inactivo' && (
        <>
          <span>Activa las notificaciones para enterarte de los pedidos aunque no tengas la página abierta.</span>
          <button className="btn pri" disabled={ocupado} onClick={activar}>
            {ocupado ? 'Activando…' : 'Activar notificaciones'}
          </button>
        </>
      )}
      {estado === 'instalar' && (
        <span>
          Para recibir notificaciones en tu iPhone, instala la página: toca el botón <b>Compartir</b> del navegador,
          elige <b>Añadir a pantalla de inicio</b> y luego ábrela desde el ícono nuevo.
        </span>
      )}
      {estado === 'denegado' && (
        <span>
          Bloqueaste las notificaciones de esta página. Para activarlas, toca el candado junto a la dirección,
          permite las notificaciones y recarga.
        </span>
      )}
      {error && <span className="urg">{error}</span>}
    </div>
  )
}