import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CatalogoMateriales from '../componentes/CatalogoMateriales'

function FilaTipo({ tipo, onCambiar }) {
  const [nombre, setNombre] = useState(tipo.nombre)

  function guardarNombre() {
    const limpio = nombre.trim()
    if (limpio && limpio !== tipo.nombre) onCambiar(tipo.id, { nombre: limpio })
    else setNombre(tipo.nombre)
  }

  return (
    <div className="img-fila" style={{ gridTemplateColumns: '1fr auto', opacity: tipo.activo ? 1 : 0.55 }}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} onBlur={guardarNombre} />
      <button
        type="button"
        className={tipo.activo ? 'link' : 'btn'}
        onClick={() => onCambiar(tipo.id, { activo: !tipo.activo })}
      >
        {tipo.activo ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  )
}

export default function Catalogo() {
  const [tipos, setTipos] = useState([])
  const [nuevo, setNuevo] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('tipos_trabajo').select('*').order('nombre')
    if (error) setError(error.message)
    else setTipos(data)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function agregar(e) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.from('tipos_trabajo').insert({ nombre: nuevo.trim() })
    if (error) setError(error.code === '23505' ? 'Ese tipo de trabajo ya existe' : error.message)
    else { setNuevo(''); cargar() }
  }

  async function cambiar(id, campos) {
    setError('')
    const { error } = await supabase.from('tipos_trabajo').update(campos).eq('id', id)
    if (error) setError(error.code === '23505' ? 'Ya existe un tipo con ese nombre' : error.message)
    cargar()
  }

  return (
    <>
      <h1>Catálogo</h1>
      <p className="mut sub">Estas son las opciones que aparecen al crear un pedido.</p>

      <section className="seccion">
        <h2 className="seccion-titulo">Tipos de trabajo</h2>

        <form onSubmit={agregar} className="fila" style={{ gap: 10, marginBottom: 14 }}>
          <input placeholder="Nuevo tipo de trabajo" value={nuevo} onChange={(e) => setNuevo(e.target.value)} required />
          <button className="btn pri" style={{ whiteSpace: 'nowrap' }}>+ Agregar</button>
        </form>

        {error && <div className="error">{error}</div>}

        {tipos.length === 0 ? (
          <p className="mut">Aún no hay tipos. Agrega el primero arriba.</p>
        ) : (
          tipos.map((t) => <FilaTipo key={`${t.id}-${t.nombre}`} tipo={t} onCambiar={cambiar} />)
        )}
        <p className="mut" style={{ marginTop: 12 }}>
          Los tipos desactivados dejan de aparecer en pedidos nuevos, pero los pedidos anteriores los conservan.
        </p>
      </section>
            <CatalogoMateriales />
    </>
  )
}