import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Chip from '../componentes/Chip'
import { moneda } from '../utils'

const norm = (s) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const soloDigitos = (s) => (s ?? '').replace(/\D/g, '')

// Enlace para escribirle por WhatsApp (números colombianos de 10 dígitos)
function enlaceWhatsApp(telefono) {
  const d = soloDigitos(telefono)
  if (d.length === 10) return `https://wa.me/57${d}`
  if (d.length === 12 && d.startsWith('57')) return `https://wa.me/${d}`
  return null
}

// Trae todos los pedidos, de a 1.000 (el máximo que entrega Supabase por consulta)
async function traerPedidos() {
  const todos = []
  for (let desde = 0; desde < 20000; desde += 1000) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('numero, cliente_nombre, cliente_telefono, precio, estado, fecha_limite, created_at')
      .order('created_at', { ascending: false })
      .range(desde, desde + 999)
    if (error) throw error
    todos.push(...data)
    if (data.length < 1000) break
  }
  return todos
}

const ORDENES = {
  compras: 'Más compras',
  recientes: 'Más recientes',
  pedidos: 'Más pedidos',
  nombre: 'Nombre',
}

export default function Clientes() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [buscar, setBuscar] = useState('')
  const [orden, setOrden] = useState('compras')
  const [abierto, setAbierto] = useState(null)

  useEffect(() => {
    traerPedidos()
      .then(setPedidos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  // Agrupar los pedidos por cliente (llegan del más nuevo al más viejo)
  const clientes = useMemo(() => {
    const mapa = new Map()
    for (const p of pedidos) {
      const clave = norm(p.cliente_nombre)
      if (!clave) continue
      let c = mapa.get(clave)
      if (!c) {
        c = {
          clave, nombre: p.cliente_nombre, telefono: p.cliente_telefono || '',
          pedidos: [], comprado: 0, enCurso: 0, ultimo: p.created_at,
        }
        mapa.set(clave, c)
      }
      if (!c.telefono && p.cliente_telefono) c.telefono = p.cliente_telefono
      c.pedidos.push(p)
      if (p.estado === 'entregado') c.comprado += Number(p.precio)
      if (['disponible', 'en_produccion', 'despachado'].includes(p.estado)) c.enCurso++
    }
    return [...mapa.values()].map((c) => ({
      ...c,
      cantidad: c.pedidos.filter((p) => p.estado !== 'cancelado').length,
    }))
  }, [pedidos])

  // Teléfonos que comparten más de un "cliente": probablemente es la misma persona escrita distinto
  const repetidos = useMemo(() => {
    const cuenta = new Map()
    for (const c of clientes) {
      const d = soloDigitos(c.telefono)
      if (d.length >= 7) cuenta.set(d, (cuenta.get(d) ?? 0) + 1)
    }
    return cuenta
  }, [clientes])

  const lista = useMemo(() => {
    const q = norm(buscar)
    const digitos = q.replace(/\D/g, '')
    return clientes
      .filter((c) => !q || c.clave.includes(q) || (digitos.length >= 3 && soloDigitos(c.telefono).includes(digitos)))
      .sort((a, b) => {
        if (orden === 'nombre') return a.nombre.localeCompare(b.nombre, 'es')
        if (orden === 'recientes') return b.ultimo.localeCompare(a.ultimo)
        if (orden === 'pedidos') return b.cantidad - a.cantidad
        return b.comprado - a.comprado
      })
  }, [clientes, buscar, orden])

  const totalComprado = clientes.reduce((s, c) => s + c.comprado, 0)
  const totalPedidos = clientes.reduce((s, c) => s + c.cantidad, 0)

  return (
    <>
      <h1>Clientes</h1>
      <p className="mut sub">Se arma con los datos de los pedidos. “Comprado” suma solo los pedidos entregados.</p>

      {error && <div className="error">{error}</div>}

      <div className="cifras">
        <div className="cifra" style={{ '--c': '#00a6c8' }}><span className="mut">Clientes</span><b>{clientes.length}</b></div>
        <div className="cifra" style={{ '--c': '#fe6c17' }}><span className="mut">Pedidos</span><b>{totalPedidos}</b></div>
        <div className="cifra" style={{ '--c': '#3ecf8e' }}><span className="mut">Comprado en total</span><b>{moneda(totalComprado)}</b></div>
      </div>

      <div className="filtros">
        {Object.entries(ORDENES).map(([k, texto]) => (
          <button key={k} className={orden === k ? 'on' : ''} onClick={() => setOrden(k)}>{texto}</button>
        ))}
      </div>

      <input
        placeholder="Buscar por nombre o teléfono"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {cargando ? (
        <p className="centro">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="centro">No hay clientes que coincidan.</p>
      ) : (
        lista.map((c) => {
          const wa = enlaceWhatsApp(c.telefono)
          const repetido = repetidos.get(soloDigitos(c.telefono)) > 1
          return (
            <section key={c.clave} className="seccion">
              <div className="fila">
                <div>
                  <b>{c.nombre}</b>
                  <div className="mut">{c.telefono || 'Sin teléfono'}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {c.enCurso > 0 && <span className="chip" style={{ '--c': '#fe6c17' }}>{c.enCurso} en curso</span>}
                    {repetido && <span className="chip" style={{ '--c': '#fdc405' }}>Mismo teléfono que otro cliente</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b style={{ color: 'var(--ok)' }}>{moneda(c.comprado)}</b>
                  <div className="mut">{c.cantidad} pedido{c.cantidad === 1 ? '' : 's'}</div>
                  <div className="mut">Último: {new Date(c.ultimo).toLocaleDateString('es-CO', { dateStyle: 'medium' })}</div>
                </div>
              </div>

              <div className="acciones">
                <button className="btn" onClick={() => setAbierto(abierto === c.clave ? null : c.clave)}>
                  {abierto === c.clave ? 'Ocultar pedidos' : 'Ver pedidos'}
                </button>
                {wa && <a className="btn" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
              </div>

              {abierto === c.clave &&
                c.pedidos.map((p) => (
                  <Link
                    key={p.numero}
                    to={`/pedido/${p.numero}`}
                    className="fila"
                    style={{ padding: '10px 0', borderTop: '1px solid var(--line)', alignItems: 'center' }}
                  >
                    <span><b>#{p.numero}</b> <span className="mut">· límite {p.fecha_limite}</span></span>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="mut">{moneda(p.precio)}</span>
                      <Chip estado={p.estado} />
                    </span>
                  </Link>
                ))}
            </section>
          )
        })
      )}
    </>
  )
}