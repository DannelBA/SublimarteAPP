import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// "Boutique  Lúnaris " y "boutique lunaris" se consideran el mismo nombre
const norm = (s) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

export default function CampoCliente({ valor, onCambiar, onElegir, onUnificar }) {
  const [clientes, setClientes] = useState([])
  const [abierta, setAbierta] = useState(false)
  const [activa, setActiva] = useState(-1)
  const tocado = useRef(false)

  // Armar la lista de clientes a partir de los pedidos más recientes
  useEffect(() => {
    supabase
      .from('pedidos')
      .select('cliente_nombre, cliente_telefono')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        const mapa = new Map()
        for (const p of data || []) {
          const clave = norm(p.cliente_nombre)
          if (!clave) continue
          const c = mapa.get(clave)
          if (!c) {
            mapa.set(clave, { clave, nombre: p.cliente_nombre, telefono: p.cliente_telefono || '', pedidos: 1 })
          } else {
            c.pedidos++
            if (!c.telefono && p.cliente_telefono) c.telefono = p.cliente_telefono
          }
        }
        setClientes([...mapa.values()])
      })
  }, [])

  const sugerencias = useMemo(() => {
    const q = norm(valor)
    if (!q) return []
    const digitos = q.replace(/\D/g, '')
    return clientes
      .filter(
        (c) =>
          c.clave.includes(q) ||
          (digitos.length >= 3 && c.telefono.replace(/\D/g, '').includes(digitos))
      )
      .sort((a, b) => {
        const ia = a.clave.startsWith(q) ? 0 : 1
        const ib = b.clave.startsWith(q) ? 0 : 1
        return ia - ib || b.pedidos - a.pedidos
      })
      .slice(0, 6)
  }, [clientes, valor])

  function elegir(c) {
    tocado.current = false
    onElegir(c)
    setAbierta(false)
    setActiva(-1)
  }

  // Al salir del campo: si el nombre ya existe, usar su forma guardada
  function alSalir() {
    setAbierta(false)
    if (!tocado.current) return
    const igual = clientes.find((c) => c.clave === norm(valor))
    if (igual) onUnificar(igual)
    tocado.current = false
  }

  function teclas(e) {
    if (!abierta || sugerencias.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiva((a) => Math.min(a + 1, sugerencias.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiva((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && activa >= 0) {
      e.preventDefault()
      elegir(sugerencias[activa])
    } else if (e.key === 'Escape') {
      setAbierta(false)
    }
  }

  return (
    <div className="sugerencias">
      <span className="etq">Cliente</span>
      <input
        aria-label="Cliente"
        placeholder="Nombre del cliente"
        autoComplete="off"
        value={valor}
        required
        onChange={(e) => {
          tocado.current = true
          onCambiar(e.target.value)
          setAbierta(true)
          setActiva(-1)
        }}
        onFocus={() => setAbierta(true)}
        onBlur={alSalir}
        onKeyDown={teclas}
      />
      {abierta && sugerencias.length > 0 && (
        <div className="lista-sug" onMouseDown={(e) => e.preventDefault()}>
          {sugerencias.map((c, i) => (
            <button type="button" key={c.clave} className={`sug ${i === activa ? 'activa' : ''}`} onClick={() => elegir(c)}>
              <span>
                <b>{c.nombre}</b>
                {c.telefono && <small> · {c.telefono}</small>}
              </span>
              <small>{c.pedidos} pedido{c.pedidos === 1 ? '' : 's'}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}