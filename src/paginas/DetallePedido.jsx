import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'
import Chip from '../componentes/Chip'
import FormDespacho from '../componentes/FormDespacho'
import { ACCIONES, ESTADOS, moneda, fechaHora, atrasado } from '../utils'
import useActualizacionPedidos from '../lib/useActualizacionPedidos'


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
  const [materiales, setMateriales] = useState([])
  const [despachando, setDespachando] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const urlsRef = useRef({})

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        items_pedido(*, tipos_trabajo(nombre), imagenes_item(*)),
        historial_pedido(*, perfiles(nombre)),
        reportes_produccion(*, materiales_usados(*, materiales(nombre, unidad)))
      `)
      .eq('numero', numero)
      .maybeSingle()

    if (error) { setError(error.message); return }
        if (!data) { setError('Este pedido ya no está disponible para ti: puede que otra persona lo haya tomado'); return }
    setError('')
    setP(data)

        // Solo se piden enlaces para imágenes nuevas, así las que ya se ven no parpadean
    const rutas = data.items_pedido
      .flatMap((it) => it.imagenes_item.map((im) => im.archivo))
      .filter((r) => !urlsRef.current[r])
    if (rutas.length) {
      const { data: firmadas } = await supabase.storage.from('disenos').createSignedUrls(rutas, 3600)
      const nuevas = Object.fromEntries((firmadas || []).filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl]))
      urlsRef.current = { ...urlsRef.current, ...nuevas }
      setUrls(urlsRef.current)
    }
  }, [numero])

  useEffect(() => { cargar() }, [cargar])
  useActualizacionPedidos(cargar, numero)

  useEffect(() => {
    supabase.from('materiales').select('id, nombre, unidad').eq('activo', true).order('nombre')
      .then(({ data }) => setMateriales(data || []))
  }, [])

  async function ejecutar(operacion) {
    setError('')
    setOcupado(true)
    const { error } = await operacion()
    if (error) setError(error.message)
    await cargar()
    setOcupado(false)
    return !error
  }

  const rpc = (nombre) => ejecutar(() => supabase.rpc(nombre, { p_numero: p.numero }))

  async function despachar(inconvenientes, listaMateriales) {
    const ok = await ejecutar(() =>
      supabase.rpc('despachar_pedido', {
        p_numero: p.numero,
        p_inconvenientes: inconvenientes,
        p_materiales: listaMateriales,
      })
    )
    if (ok) setDespachando(false)
  }

  function cancelar() {
    if (!confirm('¿Cancelar este pedido?')) return
    ejecutar(() => supabase.from('pedidos').update({ estado: 'cancelado' }).eq('numero', p.numero))
  }

  if (!p) return error ? <div className="error">{error}</div> : <p className="centro">Cargando…</p>

  const mio = p.tomado_por === user.id
  const puede = admin || mio
  const puedeDespachar = (p.estado === 'en_produccion' && puede) || (admin && p.estado === 'disponible')
  const items = [...p.items_pedido].sort((a, b) => a.id - b.id)
  const historial = [...p.historial_pedido].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const reporte = Array.isArray(p.reportes_produccion) ? p.reportes_produccion[0] : p.reportes_produccion
  const costo = reporte ? reporte.materiales_usados.reduce((s, mu) => s + mu.cantidad * mu.costo_aplicado, 0) : 0

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
        {puedeDespachar && !despachando && (
          <button className="btn pri" disabled={ocupado} onClick={() => setDespachando(true)}>Despachar</button>
        )}
        {p.estado === 'despachado' && puede && (
          <button className="btn pri" disabled={ocupado} onClick={() => rpc('entregar_pedido')}>Marcar entregado</button>
        )}
        {TEXTO_ATRAS[p.estado] && puede && (
          <button className="btn" disabled={ocupado} onClick={() => rpc('retroceder_pedido')}>{TEXTO_ATRAS[p.estado]}</button>
        )}
        {admin && p.estado !== 'cancelado' && (
          <Link to={`/pedido/${p.numero}/editar`} className="btn">Editar pedido</Link>
        )}
        {admin && p.estado !== 'cancelado' && (
          <button className="btn rojo" disabled={ocupado} onClick={cancelar}>Cancelar pedido</button>
        )}
      </div>

      {despachando && (
        <FormDespacho
          materiales={materiales}
          enviando={ocupado}
          onEnviar={despachar}
          onCancelar={() => setDespachando(false)}
        />
      )}

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

      {reporte && (
        <>
          <h2>Reporte de producción</h2>
          <section className="seccion">
            {reporte.materiales_usados.map((mu) => (
              <div key={mu.id} className="fila" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{mu.materiales?.nombre}</span>
                <span className="mut">
                  {mu.cantidad} {mu.materiales?.unidad}
                  {admin && ` · ${moneda(mu.cantidad * mu.costo_aplicado)}`}
                </span>
              </div>
            ))}
            {reporte.inconvenientes && <p><b>Inconvenientes:</b> {reporte.inconvenientes}</p>}
            {admin && (
              <p className="mut" style={{ marginBottom: 0 }}>
                Costo de materiales: <b>{moneda(costo)}</b> · Ganancia del pedido: <b>{moneda(p.precio - costo)}</b>
              </p>
            )}
          </section>
        </>
      )}

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