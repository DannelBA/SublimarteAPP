import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'
import Chip from '../componentes/Chip'
import { ESTADOS, moneda, atrasado } from '../utils'

const TITULOS = {
  todos: 'Todos los pedidos',
  disponibles: 'Pedidos disponibles',
  mios: 'Mis pedidos',
}

export default function ListaPedidos({ modo }) {
  const { user, perfil } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    let consulta = supabase.from('pedidos').select('*').order('fecha_limite')
    if (modo === 'disponibles') consulta = consulta.eq('estado', 'disponible')
    if (modo === 'mios') consulta = consulta.eq('tomado_por', user.id)

    consulta.then(({ data, error }) => {
      if (!vivo) return
      if (error) setError(error.message)
      else { setPedidos(data); setError('') }
      setCargando(false)
    })
    return () => { vivo = false }
  }, [modo, user.id])

  const lista = pedidos.filter(
    (p) =>
      (filtro === 'todos' || p.estado === filtro) &&
      `${p.numero} ${p.cliente_nombre}`.toLowerCase().includes(buscar.toLowerCase())
  )

  return (
    <>
      <div className="cab">
        <h1>{TITULOS[modo]}</h1>
        {perfil.rol === 'administrador' && (
          <Link to="/pedidos/nuevo" className="btn pri">+ Nuevo pedido</Link>
        )}
      </div>

      {modo !== 'disponibles' && (
        <div className="filtros">
          {['todos', ...Object.keys(ESTADOS)].map((k) => (
            <button key={k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>
              {k === 'todos' ? 'Todos' : ESTADOS[k].t}
            </button>
          ))}
        </div>
      )}

      <input
        placeholder="Buscar por cliente o número"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {error && <div className="error">{error}</div>}

      {cargando ? (
        <p className="centro">Cargando…</p>
      ) : lista.length === 0 ? (
        <p className="centro">No hay pedidos aquí.</p>
      ) : (
        <div className="grid">
          {lista.map((p) => (
            <Link key={p.numero} to={`/pedido/${p.numero}`} className="card" style={{ '--c': ESTADOS[p.estado]?.c }}>
              <div className="fila">
                <div>
                  <h3 style={{ margin: 0 }}>Pedido #{p.numero}</h3>
                  <div className="mut">{p.cliente_nombre}</div>
                </div>
                <Chip estado={p.estado} />
              </div>
              <p className="mut" style={{ margin: '10px 0 0' }}>
                Límite:{' '}
                <span className={atrasado(p) ? 'urg' : ''}>
                  {p.fecha_limite}{atrasado(p) ? ' (atrasado)' : ''}
                </span>
                {' · '}
                <span className={p.prioridad === 'urgente' ? 'urg' : ''}>{p.prioridad}</span>
                {' · '}{moneda(p.precio)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}