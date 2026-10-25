import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'

const MAX_MB = 25
const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

const disenoVacio = () => ({
  tipo_trabajo: 'DTF textil',
  descripcion: '',
  ancho_cm: '',
  alto_cm: '',
  cantidad: '1',
  acabado: 'Mate',
  imagenes: [],
})

export default function NuevoPedido() {
  const { user } = useAuth()
  const navegar = useNavigate()
  const [p, setP] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    fecha_limite: '',
    prioridad: 'normal',
    precio: '',
    observaciones: '',
  })
  const [disenos, setDisenos] = useState([disenoVacio()])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cambiarP = (campo) => (e) => setP({ ...p, [campo]: e.target.value })
  const cambiarDiseno = (i, campo) => (e) =>
    setDisenos(disenos.map((d, j) => (j === i ? { ...d, [campo]: e.target.value } : d)))

  // Revisa los archivos elegidos y los agrega al diseño i
  function agregarArchivos(i, lista) {
    setError('')
    const nuevos = []
    for (const f of lista) {
      if (!TIPOS.includes(f.type)) {
        setError(`"${f.name}" no es PNG, JPG, WEBP ni PDF`)
        continue
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`"${f.name}" pesa más de ${MAX_MB} MB`)
        continue
      }
      nuevos.push({ archivo: f, descripcion: '' })
    }
    setDisenos(disenos.map((d, j) => (j === i ? { ...d, imagenes: [...d.imagenes, ...nuevos] } : d)))
  }

  const cambiarDescImagen = (i, k) => (e) =>
    setDisenos(disenos.map((d, j) => j !== i ? d : {
      ...d,
      imagenes: d.imagenes.map((img, m) => (m === k ? { ...img, descripcion: e.target.value } : img)),
    }))

  const quitarImagen = (i, k) =>
    setDisenos(disenos.map((d, j) => j !== i ? d : { ...d, imagenes: d.imagenes.filter((_, m) => m !== k) }))

  async function guardar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)

    // 1. Crear el pedido
    const { data: pedido, error: e1 } = await supabase
      .from('pedidos')
      .insert({
        cliente_nombre: p.cliente_nombre,
        cliente_telefono: p.cliente_telefono || null,
        fecha_limite: p.fecha_limite,
        prioridad: p.prioridad,
        precio: Number(p.precio || 0),
        observaciones: p.observaciones || null,
        creado_por: user.id,
      })
      .select('numero')
      .single()

    if (e1) { setError(e1.message); setEnviando(false); return }

    // 2. Crear los diseños y recuperar el id de cada uno
    const { data: items, error: e2 } = await supabase
      .from('items_pedido')
      .insert(
        disenos.map((d) => ({
          pedido_numero: pedido.numero,
          tipo_trabajo: d.tipo_trabajo,
          descripcion: d.descripcion,
          ancho_cm: Number(d.ancho_cm),
          alto_cm: Number(d.alto_cm),
          cantidad: Number(d.cantidad),
          acabado: d.acabado,
        }))
      )
      .select('id')

    if (e2) {
      setError(`El pedido #${pedido.numero} se creó, pero fallaron los diseños: ${e2.message}`)
      setEnviando(false)
      return
    }

    // 3. Subir las imágenes de cada diseño
    let fallidas = 0
    for (let i = 0; i < disenos.length; i++) {
      for (const img of disenos[i].imagenes) {
        const extension = img.archivo.name.split('.').pop().toLowerCase()
        const ruta = `pedidos/${pedido.numero}/${crypto.randomUUID()}.${extension}`

        const { error: eSubir } = await supabase.storage
          .from('disenos')
          .upload(ruta, img.archivo, { contentType: img.archivo.type })
        if (eSubir) { fallidas++; continue }

        const { error: eFila } = await supabase.from('imagenes_item').insert({
          item_id: items[i].id,
          archivo: ruta,
          descripcion: img.descripcion || null,
        })
        if (eFila) {
          fallidas++
          await supabase.storage.from('disenos').remove([ruta])
        }
      }
    }

    if (fallidas > 0) {
      setError(`El pedido #${pedido.numero} se creó, pero ${fallidas} imagen(es) no se pudieron subir`)
      setEnviando(false)
      return
    }

    navegar(`/pedido/${pedido.numero}`)
  }

  return (
    <form onSubmit={guardar}>
      <h1>Nuevo pedido</h1>

      <div className="card panel form">
        <label>Cliente
          <input value={p.cliente_nombre} onChange={cambiarP('cliente_nombre')} required />
        </label>
        <label>Teléfono
          <input value={p.cliente_telefono} onChange={cambiarP('cliente_telefono')} inputMode="tel" />
        </label>
        <label>Fecha límite
          <input type="date" value={p.fecha_limite} onChange={cambiarP('fecha_limite')} required />
        </label>
        <label>Prioridad
          <select value={p.prioridad} onChange={cambiarP('prioridad')}>
            <option>normal</option>
            <option>urgente</option>
          </select>
        </label>
        <label>Precio (COP)
          <input type="number" min="0" value={p.precio} onChange={cambiarP('precio')} required />
        </label>
        <label className="w">Observaciones
          <textarea value={p.observaciones} onChange={cambiarP('observaciones')} />
        </label>
      </div>

      {disenos.map((d, i) => (
        <div key={i} className="card panel form">
          <div className="w fila">
            <h3>Diseño {i + 1}</h3>
            {disenos.length > 1 && (
              <button type="button" className="link" onClick={() => setDisenos(disenos.filter((_, j) => j !== i))}>
                Quitar
              </button>
            )}
          </div>
          <label>Tipo de trabajo
            <select value={d.tipo_trabajo} onChange={cambiarDiseno(i, 'tipo_trabajo')}>
              <option>DTF textil</option>
              <option>UV DTF</option>
              <option>DTF por metro</option>
            </select>
          </label>
          <label>Acabado
            <select value={d.acabado} onChange={cambiarDiseno(i, 'acabado')}>
              <option>Mate</option>
              <option>Brillante</option>
            </select>
          </label>
          <label className="w">Descripción
            <textarea value={d.descripcion} onChange={cambiarDiseno(i, 'descripcion')} required />
          </label>
          <label>Ancho (cm)
            <input type="number" min="0" step="0.1" value={d.ancho_cm} onChange={cambiarDiseno(i, 'ancho_cm')} required />
          </label>
          <label>Alto (cm)
            <input type="number" min="0" step="0.1" value={d.alto_cm} onChange={cambiarDiseno(i, 'alto_cm')} required />
          </label>
          <label>Cantidad
            <input type="number" min="1" value={d.cantidad} onChange={cambiarDiseno(i, 'cantidad')} required />
          </label>

          <div className="w">
            <label>Imágenes del diseño (PNG, JPG, WEBP o PDF, hasta {MAX_MB} MB cada una)
              <input
                type="file"
                multiple
                accept={TIPOS.join(',')}
                onChange={(e) => {
                  agregarArchivos(i, Array.from(e.target.files))
                  e.target.value = ''
                }}
              />
            </label>
            {d.imagenes.map((img, k) => (
              <div key={k} className="fila" style={{ marginTop: 8, alignItems: 'center' }}>
                <span className="mut" style={{ flex: '0 0 38%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {img.archivo.name} ({(img.archivo.size / 1048576).toFixed(1)} MB)
                </span>
                <input
                  placeholder="Descripción de esta imagen (opcional)"
                  value={img.descripcion}
                  onChange={cambiarDescImagen(i, k)}
                />
                <button type="button" className="link" onClick={() => quitarImagen(i, k)}>Quitar</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="acciones">
        <button type="button" className="btn" onClick={() => setDisenos([...disenos, disenoVacio()])}>
          + Agregar otro diseño
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      <button className="btn pri" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Crear pedido'}
      </button>
    </form>
  )
}