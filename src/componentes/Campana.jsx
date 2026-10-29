import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'
import { fechaHora } from '../utils'

const COLOR_TIPO = {
  pedido_nuevo: '#00a6c8',
  cambio_estado: '#fe6c17',
  fecha_proxima: '#fdc405',
  fecha_vencida: '#d71a6c',
}

export default function Campana() {
  const { user } = useAuth()
  const navegar = useNavigate()
  const [lista, setLista] = useState([])
  const [abierta, setAbierta] = useState(false)
  const caja = useRef(null)

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setLista(data || [])
  }, [])

  // Cargar al entrar y escuchar avisos nuevos en tiempo real
  useEffect(() => {
    cargar()
    const canal = supabase
      .channel(`notificaciones-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` },
        () => cargar()
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [user.id, cargar])

  // Cerrar el panel al tocar fuera de él
  useEffect(() => {
    if (!abierta) return
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierta(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierta])

  const sinLeer = lista.filter((n) => !n.leida).length

  // Mostrar la cantidad en el título de la pestaña
  useEffect(() => {
    document.title = sinLeer ? `(${sinLeer}) SublimArte · Pedidos` : 'SublimArte · Pedidos'
  }, [sinLeer])

  async function abrir(n) {
    setAbierta(false)
    if (!n.leida) {
      await supabase.from('notificaciones').update({ leida: true }).eq('id', n.id)
      cargar()
    }
    if (n.pedido_numero) navegar(`/pedido/${n.pedido_numero}`)
  }

  async function marcarTodas() {
    await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', user.id).eq('leida', false)
    cargar()
  }

  return (
    <div className="campana" ref={caja}>
      <button className="campana-btn" onClick={() => setAbierta(!abierta)} aria-label="Notificaciones">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {sinLeer > 0 && <span className="campana-num">{sinLeer > 9 ? '9+' : sinLeer}</span>}
      </button>

      {abierta && (
        <div className="panel-notif">
          <div className="notif-cab">
            <b>Notificaciones</b>
            {sinLeer > 0 && <button className="link" onClick={marcarTodas}>Marcar todas como leídas</button>}
          </div>
          {lista.length === 0 && <p className="centro" style={{ padding: 28 }}>No tienes notificaciones.</p>}
          {lista.map((n) => (
            <button key={n.id} className={`notif ${n.leida ? 'leida' : ''}`} onClick={() => abrir(n)}>
              <span className="punto" style={{ '--c': COLOR_TIPO[n.tipo] || '#888' }} />
              <span>
                {n.mensaje}
                <span className="mut" style={{ display: 'block' }}>{fechaHora(n.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}