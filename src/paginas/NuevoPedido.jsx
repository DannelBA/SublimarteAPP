import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'
import Segmentado from '../componentes/Segmentado'


const MAX_MB = 25
const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const ETQ_PRIORIDAD = { normal: 'Normal', urgente: 'Urgente' }

const disenoVacio = (tipoId = '') => ({
  tipo_trabajo_id: tipoId,
  descripcion: '',
  ancho_cm: '',
  alto_cm: '',
  cantidad: '1',
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
  const [tipos, setTipos] = useState([])

  useEffect(() => {
    supabase
      .from('tipos_trabajo')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => {
        const lista = data || []
        setTipos(lista)
        if (lista.length) {
          setDisenos((ds) => ds.map((d) => (d.tipo_trabajo_id ? d : { ...d, tipo_trabajo_id: String(lista[0].id) })))
        }
      })
  }, [])

  const cambiarP = (campo) => (e) => setP({ ...p, [campo]: e.target.value })
  const cambiarDiseno = (i, campo) => (e) =>
    setDisenos(disenos.map((d, j) => (j === i ? { ...d, [campo]: e.target.value } : d)))
  const fijarDiseno = (i, campo) => (valor) =>
    setDisenos(disenos.map((d, j) => (j === i ? { ...d, [campo]: valor } : d)))

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
          tipo_trabajo_id: Number(d.tipo_trabajo_id),
          descripcion: d.descripcion,
          ancho_cm: Number(d.ancho_cm),
          alto_cm: Number(d.alto_cm),
          cantidad: Number(d.cantidad),
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
      <p className="mut sub">Completa los datos del cliente y agrega uno o varios diseños.</p>

      <section className="seccion">
        <h2 className="seccion-titulo"><span className="num">1</span>Cliente y entrega</h2>
        <div className="form">
          <label>Cliente
            <input placeholder="Nombre del cliente" value={p.cliente_nombre} onChange={cambiarP('cliente_nombre')} required />
          </label>
          <label>Teléfono
            <input placeholder="300 000 0000" value={p.cliente_telefono} onChange={cambiarP('cliente_telefono')} inputMode="tel" />
          </label>
          <label>Fecha límite
            <input type="date" value={p.fecha_limite} onChange={cambiarP('fecha_limite')} required />
          </label>
          <label>Precio
            <div className="unidad">
              <span className="pre">$</span>
              <input type="number" min="0" placeholder="0" value={p.precio} onChange={cambiarP('precio')} required />
            </div>
          </label>
          <div className="w">
            <span className="etq">Prioridad</span>
            <Segmentado
              opciones={['normal', 'urgente']}
              etiquetas={ETQ_PRIORIDAD}
              colores={{ urgente: '#d71a6c' }}
              valor={p.prioridad}
              onChange={(v) => setP({ ...p, prioridad: v })}
            />
          </div>
          <label className="w">Observaciones
            <textarea placeholder="Notas para el operario (opcional)" value={p.observaciones} onChange={cambiarP('observaciones')} />
          </label>
        </div>
      </section>

      {disenos.map((d, i) => (
        <section key={i} className="seccion">
          <div className="seccion-cab">
            <h2 className="seccion-titulo"><span className="num">{i + 2}</span>Diseño {i + 1}</h2>
            {disenos.length > 1 && (
              <button type="button" className="link" onClick={() => setDisenos(disenos.filter((_, j) => j !== i))}>
                Quitar diseño
              </button>
            )}
          </div>

          <div className="form">
            <div className="w">
              <span className="etq">Tipo de trabajo</span>
              <Segmentado
                opciones={tipos.map((t) => String(t.id))}
                etiquetas={Object.fromEntries(tipos.map((t) => [String(t.id), t.nombre]))}
                valor={d.tipo_trabajo_id}
                onChange={fijarDiseno(i, 'tipo_trabajo_id')}
              />
              {tipos.length === 0 && (
                <p className="mut">No hay tipos de trabajo activos. Créalos primero en Catálogo.</p>
              )}
            </div>
            <label className="w">Descripción
              <textarea
                placeholder="Qué se imprime, colores, posición, acabado y cualquier detalle importante"
                value={d.descripcion}
                onChange={cambiarDiseno(i, 'descripcion')}
                required
              />
            </label>

            <div className="w form tres">
              <label>Ancho
                <div className="unidad cm">
                  <input type="number" min="0" step="0.1" placeholder="0" value={d.ancho_cm} onChange={cambiarDiseno(i, 'ancho_cm')} required />
                  <span className="suf">cm</span>
                </div>
              </label>
              <label>Alto
                <div className="unidad cm">
                  <input type="number" min="0" step="0.1" placeholder="0" value={d.alto_cm} onChange={cambiarDiseno(i, 'alto_cm')} required />
                  <span className="suf">cm</span>
                </div>
              </label>
              <label>Cantidad
                <input type="number" min="1" value={d.cantidad} onChange={cambiarDiseno(i, 'cantidad')} required />
              </label>
            </div>

            <div className="w">
              <span className="etq">Imágenes del diseño</span>
              <div className="zona-archivos">
                <input
                  type="file"
                  multiple
                  accept={TIPOS.join(',')}
                  onChange={(e) => {
                    agregarArchivos(i, Array.from(e.target.files))
                    e.target.value = ''
                  }}
                />
                <strong>Toca para elegir imágenes</strong>
                <span className="mut">o arrástralas aquí · PNG, JPG, WEBP o PDF · hasta {MAX_MB} MB cada una</span>
              </div>
              {d.imagenes.map((img, k) => (
                <div key={k} className="img-fila">
                  <div className="img-nombre">
                    <b>{img.archivo.name}</b>
                    <span className="mut">{(img.archivo.size / 1048576).toFixed(1)} MB</span>
                  </div>
                  <input
                    placeholder="¿Qué muestra esta imagen? (opcional)"
                    value={img.descripcion}
                    onChange={cambiarDescImagen(i, k)}
                  />
                  <button type="button" className="link" onClick={() => quitarImagen(i, k)}>Quitar</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <button type="button" className="btn-anadir" onClick={() => setDisenos([...disenos, disenoVacio()])}>
        + Agregar otro diseño
      </button>

      <div className="barra-guardar">
        {error && <div className="error">{error}</div>}
        <button className="btn pri grande" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Crear pedido'}
        </button>
      </div>
    </form>
  )
}