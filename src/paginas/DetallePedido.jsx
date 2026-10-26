import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'
import Chip from '../componentes/Chip'
import { ACCIONES, ESTADOS, moneda, fechaHora, atrasado } from '../utils'

const TEXTO_ATRAS = {
  en_produccion: 'Devolver al mercadito',
  despachado: 'Volver a producción',
  entregado: 'Volver a despachado',
}

export default function DetallePedido() {
  const { numero } = useParams()
  const navegar = useNavigate()
  const { user, perfil } = useAuth()
  const admin = perfil.rol === 'administrador'

  const [p, setP] = useState(null)
  const [urls, setUrls] = useState({})
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        items_pedido(*, tipos_trabajo(nombre), imagenes_item(*)),
        historial_pedido(*, perfiles(nombre))
      `)
      .eq('numero', numero)
      .maybeSingle()

    if (error) { setError(error.message); return }
    if (!data) { setError('No se encontró el pedido o no tienes acceso a él'); return }
    setError('')
    setP(data)

    // Las imágenes son privadas: se piden enlaces temporales (1 hora)
    const rutas = data.items_pedido.flatMap((it) => it.imagenes_item.map((im) => im.archivo))
    if (rutas.length) {
      const { data: firmadas } = await supabase.storage.from('disenos').createSignedUrls(rutas, 3600)
      setUrls(Object.fromEntries((firmadas || []).filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl])))
    }
  }, [numero])

  useEffect(() => { cargar() }, [cargar])

  // Ejecuta una acción, muestra el error si lo hay y vuelve a cargar el pedido
  async function ejecutar(operacion) {
    setError('')
    setOcupado(true)
    const { error } = await operacion()
    if (error) setError(error.message)
    await cargar()
    setOcupado(false)
  }

  const rpc = (nombre) => ejecutar(() => supabase.rpc(nombre, { p_numero: p.numero }))

  function cancelar() {
    if (!confirm('¿Cancelar este pedido?')) return
    ejecutar(() => supabase.from('pedidos').update({ estado: 'cancelado' }).eq('numero', p.numero))
  }

  if (!p) return error ? <div className="error">{error}</div> : <p className="centro">Cargando…</p>

  const mio = p.tomado_por === user.id
  const puede = admin || mio
  const items = [...p.items_pedido].sort((a, b) => a.id - b.id)
  const historial = [...p.historial_pedido].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <>
      <button className="link" onClick={() => navegar(-1)}>← Volver</button>
      <div className="cab" style={{ marginTop: 8 }}>
        <h1>Pedido #{p.numero}</h1>
        <Chip estado={p.estado} />
      </div>

      {error && <div className="error">{error}</div>}

      <section className="seccion">
        <div className="datos">
          <div><span className="mut">Cliente</span><b>{p.cliente_nombre}</b></div>
          <div><span className="mut">Teléfono</span><b>{p.cliente_telefono || '—'}</b></div>
          <div>
            <span className="mut">Fecha límite</span>
            <b className={atrasado(p) ? 'urg' : ''}>{p.fecha_limite}{atrasado(p) ? ' (atrasado)' : ''}</b>
          </div>
          <div>
            <span className="mut">Prioridad</span>
            <b className={p.prioridad === 'urgente' ? 'urg' : ''}>{p.prioridad}</b>
          </div>
          <div><span className="mut">Precio</span><b>{moneda(p.precio)}</b></div>
        </div>
        {p.observaciones && <p style={{ marginBottom: 0 }}>{p.observaciones}</p>}
      </section>

      <div className="acciones">
        {p.estado === 'disponible' && (
          <button className="btn pri" disabled={ocupado} onClick={() => rpc('tomar_pedido')}>Tomar pedido</button>
        )}
        {p.estado === 'despachado' && puede && (
          <button className="btn pri" disabled={ocupado} onClick={() => rpc('entregar_pedido')}>Marcar entregado</button>
        )}
        {TEXTO_ATRAS[p.estado] && puede && (
          <button className="btn" disabled={ocupado} onClick={() => rpc('retroceder_pedido')}>{TEXTO_ATRAS[p.estado]}</button>
        )}
        {admin && p.estado !== 'cancelado' && (
          <button className="btn rojo" disabled={ocupado} onClick={cancelar}>Cancelar pedido</button>
        )}
      </div>

      <h2>Diseños</h2>
      {items.map((it, i) => (
        <section key={it.id} className="seccion">
          <h3 style={{ margin: '0 0 8px' }}>Diseño {i + 1} · {it.tipos_trabajo?.nombre}</h3>
          <p style={{ margin: '0 0 6px' }}>{it.descripcion}</p>
          <span className="mut">{it.ancho_cm} x {it.alto_cm} cm · {it.cantidad} unidades</span>

          {it.imagenes_item.length > 0 && (
            <div className="miniaturas">
              {it.imagenes_item.map((im) => {
                const pdf = im.archivo.toLowerCase().endsWith('.pdf')
                return (
                  <a key={im.id} className="mini" href={urls[im.archivo]} target="_blank" rel="noreferrer">
                    {pdf ? <div className="pdf">PDF</div> : <img src={urls[im.archivo]} alt={im.descripcion || 'Diseño'} />}
                    <div className="pie">{im.descripcion || (pdf ? 'Abrir PDF' : 'Abrir imagen')}</div>
                  </a>
                )
              })}
            </div>
          )}
        </section>
      ))}

      <h2>Trazabilidad</h2>
      <ul className="tl">
        {historial.map((h) => (
          <li key={h.id}>
            <b>{ACCIONES[h.accion] || h.accion}</b>
            {h.estado_anterior && (
              <span className="mut"> · {ESTADOS[h.estado_anterior]?.t} → {ESTADOS[h.estado_nuevo]?.t}</span>
            )}
            {h.nota && <div className="mut">{h.nota}</div>}
            <div className="mut">{fechaHora(h.created_at)} · {h.perfiles?.nombre ?? 'Otro usuario'}</div>
          </li>
        ))}
      </ul>
    </>
  )
}