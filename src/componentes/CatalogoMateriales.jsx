import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function FilaMaterial({ m, onCambiar }) {
  const [nombre, setNombre] = useState(m.nombre)
  const [unidad, setUnidad] = useState(m.unidad)
  const [costo, setCosto] = useState(String(m.costo_unitario))

  // Guarda solo lo que cambió, al salir de cada campo
  function guardar() {
    const cambios = {}
    if (nombre.trim() && nombre.trim() !== m.nombre) cambios.nombre = nombre.trim()
    if (unidad.trim() && unidad.trim() !== m.unidad) cambios.unidad = unidad.trim()
    if (costo !== '' && Number(costo) >= 0 && Number(costo) !== Number(m.costo_unitario)) {
      cambios.costo_unitario = Number(costo)
    }
    if (Object.keys(cambios).length) onCambiar(m.id, cambios)
  }

  return (
    <div className="mat-fila" style={{ opacity: m.activo ? 1 : 0.55 }}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} onBlur={guardar} aria-label="Nombre" />
      <input value={unidad} onChange={(e) => setUnidad(e.target.value)} onBlur={guardar} aria-label="Unidad" />
      <div className="unidad">
        <span className="pre">$</span>
        <input type="number" min="0" step="any" value={costo} onChange={(e) => setCosto(e.target.value)} onBlur={guardar} aria-label="Costo por unidad" />
      </div>
      <button type="button" className={m.activo ? 'link' : 'btn'} onClick={() => onCambiar(m.id, { activo: !m.activo })}>
        {m.activo ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  )
}

export default function CatalogoMateriales() {
  const [materiales, setMateriales] = useState([])
  const [nuevo, setNuevo] = useState({ nombre: '', unidad: '', costo: '' })
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('materiales').select('*').order('nombre')
    if (error) setError(error.message)
    else setMateriales(data)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function agregar(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('materiales').insert({
      nombre: nuevo.nombre.trim(),
      unidad: nuevo.unidad.trim(),
      costo_unitario: Number(nuevo.costo),
    })
    if (error) setError(error.code === '23505' ? 'Ese material ya existe' : error.message)
    else { setNuevo({ nombre: '', unidad: '', costo: '' }); cargar() }
  }

  async function cambiar(id, campos) {
    setError('')
    const { error } = await supabase.from('materiales').update(campos).eq('id', id)
    if (error) {
      setError(error.code === '23505' ? 'Ya existe un material con ese nombre' : error.message)
      setVersion((v) => v + 1) // vuelve a dibujar las filas con lo guardado
    }
    cargar()
  }

  return (
    <section className="seccion">
      <h2 className="seccion-titulo">Materiales</h2>
      <p className="mut sub">Lo que se gasta al producir. El costo por unidad se usa para calcular la ganancia.</p>

      <form onSubmit={agregar} className="mat-fila">
        <input placeholder="Material (ej. Film DTF)" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
        <input placeholder="Unidad (ej. metro)" value={nuevo.unidad} onChange={(e) => setNuevo({ ...nuevo, unidad: e.target.value })} required />
        <div className="unidad">
          <span className="pre">$</span>
          <input type="number" min="0" step="any" placeholder="Costo por unidad" value={nuevo.costo} onChange={(e) => setNuevo({ ...nuevo, costo: e.target.value })} required />
        </div>
        <button className="btn pri">+ Agregar</button>
      </form>

      {error && <div className="error">{error}</div>}

      {materiales.length > 0 && (
        <div className="mat-fila titulos" style={{ marginTop: 18 }}>
          <span>Material</span><span>Unidad</span><span>Costo por unidad</span><span />
        </div>
      )}
      {materiales.map((m) => <FilaMaterial key={`${m.id}-${version}`} m={m} onCambiar={cambiar} />)}
      {materiales.length === 0 && <p className="mut">Aún no hay materiales. Agrega el primero arriba.</p>}

      <p className="mut" style={{ marginTop: 12 }}>
        Si cambias un costo, los pedidos ya despachados conservan el costo con el que se hicieron.
      </p>
    </section>
  )
}