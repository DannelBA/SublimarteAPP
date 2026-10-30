import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Ejecuta `alCambiar` cuando cambian los pedidos (o uno solo, si se da `numero`).
// Además lo ejecuta al volver a la pestaña y cada 20 segundos, como respaldo.
export default function useActualizacionPedidos(alCambiar, numero = null) {
  const funcion = useRef(alCambiar)
  useEffect(() => { funcion.current = alCambiar })

  useEffect(() => {
    const filtro = numero ? { filter: `numero=eq.${numero}` } : {}
    const canal = supabase
      .channel(`pedidos-${numero ?? 'todos'}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos', ...filtro }, () => funcion.current())
      .subscribe()

    const refrescar = () => {
      if (document.visibilityState === 'visible') funcion.current()
    }
    document.addEventListener('visibilitychange', refrescar)
    const reloj = setInterval(refrescar, 20000)

    return () => {
      supabase.removeChannel(canal)
      document.removeEventListener('visibilitychange', refrescar)
      clearInterval(reloj)
    }
  }, [numero])
}