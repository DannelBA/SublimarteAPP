import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { moneda } from '../utils'

const PERIODOS = {
  mes: 'Este mes',
  mes_pasado: 'Mes pasado',
  '7dias': 'Últimos 7 días',
  anio: 'Este año',
  otro: 'Elegir fechas',
}

const dia = (d) => d.toLocaleDateString('en-CA') // AAAA-MM-DD en hora local

function intervalo(tipo, desde, hhasta) {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = hoy.getMonth()
  if (tipo === 'mes') return [new Date(y, m, 1), new Date(y, m + 1, 1)]
  if (tipo === 'mes_pasado') return [new Date(y, m - 1, 1), new Date(y, m, 1)]
  if (tipo === '7dias') return [new Date(y, m, hoy.getDate() - 6), new Date(y, m, hoy.getDate() + 1)]
  if (tipo === 'anio') return [new Date(y, 0, 1), new Date(y + 1, 0, 1)]
  if (!desde || !hasta) return null
  const ini = new Date(`${desde}T00:00:00`)
  const fin = new Date(`${hasta}T00:00:00`)
  fin.setDate(fin.getDate() + 1)
  return fin > ini ? [ini, fin] : null
}

export default function Ganancias() {
  const [tipo, setTipo] = useState('mes')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const rango = useMemo(() => intervalo(tipo, desde, hasta), [tipo, desde, hasta])

  const cargar = useCallback(async () => {
    if (!rango) { setDatos([]); setCargando(false); return }
    setCargando(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('numero, cliente_nombre, precio, fecha_entregado, reportes_produccion(materiales_usados(cantidad, costo_aplicado))')
      .eq('estado', 'entregado')
      .gte('fecha_entregado', rango[0].toISOString())
      .lt('fecha_entregado', rango[1].toISOString())
      .order('fecha_entregado', { ascending: false })

    if (error) setError(error.message)
    else { setError(''); setDatos(data) }
    setCargando(false)
  }, [rango])

  useEffect(() => { cargar() }, [cargar])

  // Venta, costo y ganancia de cada pedido
  const filas = useMemo(() => datos.map((p) => {
    const rep = Array.isArray(p.reportes_produccion) ? p.reportes_produccion[0] : p.reportes_produccion
    const costo = rep ? rep.materiales_usados.reduce((s, m) => s + m.cantidad * m.costo_aplicado, 0) : 0
    return { ...p, venta: Number(p.precio), costo, neta: Number(p.precio) - costo, sinReporte: !rep }
  }), [datos])

  const total = useMemo(() => ({
    pedidos: filas.length,
    venta: filas.reduce((s, f) => s + f.venta, 0),
    costo: filas.reduce((s, f) => s + f.costo, 0),
    sinReporte: filas.filter((f) => f.sinReporte).length,
  }), [filas])

  // Agrupar por día (periodos cortos) o por mes (periodos largos)
  const grupos = useMemo(() => {
    if (!rango) return []
    const dias = (rango[1] - rango[0]) / 86400000
    const porMes = dias > 35
    const mapa = new Map()
    for (const f of filas) {
      const d = dia(new Date(f.fecha_entregado))
      const clave = porMes ? d.slice(0, 7) : d
      const g = mapa.get(clave) ?? { clave, venta: 0, costo: 0 }
      g.venta += f.venta
      g.costo += f.costo
      mapa.set(clave, g)
    }
    return [...mapa.values()]
      .sort((a, b) => a.clave.localeCompare(b.clave))
      .map((g) => ({ ...g, etiqueta: porMes ? g.clave : g.clave.slice(8) + '/' + g.clave.slice(5, 7) }))
  }, [filas, rango])

  const maximo = Math.max(1, ...grupos.map((g) => g.venta))
  const neta = total.venta - total.costo

  return (
    <>
      <h1>Ganancias</h1>
      <p className="mut sub">Se cuentan los pedidos según el día en que se entregaron.</p>

      <div className="filtros">
        {Object.entries(PERIODOS).map(([k, texto]) => (
          <button key={k} className={tipo === k ? 'on' : ''} onClick={() => setTipo(k)}>{texto}</button>
        ))}
      </div>

      {tipo === 'otro' && (
        <div className="form" style={{ marginBottom: 16 }}>
          <label>Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label>Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="cifras">
        <div className="cifra" style={{ '--c': '#00a6c8' }}><span className="mut">Pedidos entregados</span><b>{total.pedidos}</b></div>
        <div className="cifra" style={{ '--c': '#fe6c17' }}><span className="mut">Ganancia bruta</span><b>{moneda(total.venta)}</b></div>
        <div className="cifra" style={{ '--c': '#a39f95' }}><span className="mut">Costo de materiales</span><b>{moneda(total.costo)}</b></div>
        <div className="cifra" style={{ '--c': '#3ecf8e' }}><span className="mut">Ganancia neta</span><b>{moneda(neta)}</b></div>
      </div>

      {total.sinReporte > 0 && (
        <div className="aviso" style={{ borderColor: 'var(--yel)' }}>
          {total.sinReporte} pedido(s) entregado(s) no tienen reporte de materiales. Su costo se cuenta como $0,
          así que la ganancia neta puede verse más alta de lo real.
        </div>
      )}

      {cargando ? (
        <p className="centro">Calculando…</p>
      ) : filas.length === 0 ? (
        <p className="centro">No hay pedidos entregados en este periodo.</p>
      ) : (
        <>
          <section className="seccion">
            <h2 className="seccion-titulo">Evolución</h2>
            {grupos.map((g) => {
              const n = g.venta - g.costo
              return (
                <div key={g.clave} className="barra-fila">
                  <span className="mut">{g.etiqueta}</span>
                  <div className="barra" title={`Bruta ${moneda(g.venta)} · Neta ${moneda(n)}`}>
                    <div className="barra-ventas" style={{ width: `${(g.venta / maximo) * 100}%` }}>
                      <div className="barra-neta" style={{ width: `${g.venta > 0 ? Math.max(n, 0) / g.venta * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span style={{ textAlign: 'right' }}>{moneda(n)}</span>
                </div>
              )
            })}
            <div className="leyenda">
              <span><i style={{ background: 'color-mix(in srgb, var(--org) 40%, transparent)' }} />Ganancia bruta</span>
              <span><i style={{ background: 'var(--grad)' }} />Ganancia neta (el valor de la derecha)</span>
            </div>
          </section>

          <h2>Pedidos del periodo</h2>
          {filas.map((f) => (
            <Link key={f.numero} to={`/pedido/${f.numero}`} className="seccion" style={{ display: 'block' }}>
              <div className="fila">
                <div>
                  <b>Pedido #{f.numero}</b> <span className="mut">· {f.cliente_nombre}</span>
                  <div className="mut">
                    Entregado el {new Date(f.fecha_entregado).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                    {f.sinReporte && <span className="urg"> · sin reporte de materiales</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b style={{ color: 'var(--ok)' }}>{moneda(f.neta)}</b>
                  <div className="mut">Bruta {moneda(f.venta)} · Costo {moneda(f.costo)}</div>
                </div>
              </div>
            </Link>
          ))}
        </>
      )}
    </>
  )
}