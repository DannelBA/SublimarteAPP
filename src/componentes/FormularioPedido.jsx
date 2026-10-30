import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Segmentado from './Segmentado'

const MAX_MB = 25
const TIPOS_ARCHIVO = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const ETQ_PRIORIDAD = { normal: 'Normal', urgente: 'Urgente' }

const PEDIDO_VACIO = {
  cliente_nombre: '',
  cliente_telefono: '',
  fecha_limite: '',
  prioridad: 'normal',
  precio: '',
  observaciones: '',
}

const disenoVacio = (tipoId = '') => ({
  id: null,
  tipo_trabajo_id: tipoId,
  descripcion: '',
  ancho_cm: '',
  alto_cm: '',
  cantidad: '1',
  imagenes: [],            // imágenes nuevas, aún sin subir
  existentes: [],          // imágenes que el diseño ya tiene guardadas
  existentesQuitadas: [],  // imágenes guardadas que se van a borrar
})

export default function FormularioPedido({ titulo, subtitulo, textoBoton, inicial, error, onGuardar }) {
  const [p, setP] = useState(inicial?.p ?? PEDIDO_VACIO)
  const [disenos, setDisenos] = useState(inicial?.disenos ?? [disenoVacio()])
  const [quitados, setQuitados] = useState([])
  const [tipos, setTipos] = useState([])
  const [errorLocal, setErrorLocal] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Cargar los tipos de trabajo y dejar marcado el primero activo en los diseños nuevos
  useEffect(() => {
    supabase.from('tipos_trabajo').select('id, nombre, activo').order('nombre').then(({ data }) => {
      const lista = data || []
      setTipos(lista)
      const primero = lista.find((t) => t.activo)
      if (primero) {
        setDisenos((ds) => ds.map((d) => (d.tipo_trabajo_id ? d : { ...d, tipo_trabajo_id: String(primero.id) })))
      }
    })
  }, [])

  // Un tipo desactivado se sigue mostrando si algún diseño de este pedido ya lo usa
  const usados = new Set(disenos.map((d) => d.tipo_trabajo_id))
  const opciones = tipos.filter((t) => t.activo || usados.has(String(t.id)))
  const etiquetasTipo = Object.fromEntries(
    opciones.map((t) => [String(t.id), t.activo ? t.nombre : `${t.nombre} (inactivo)`])
  )
  const primeroActivo = tipos.find((t) => t.activo)

  const cambiarP = (campo) => (e) => setP({ ...p, [campo]: e.target.value })
  const cambiarDiseno = (i, campo) => (e) =>
    setDisenos(disenos.map((d, j) => (j === i ? { ...d, [campo]: e.target.value } : d)))
  const fijarDiseno = (i, campo) => (valor) =>
    setDisenos(disenos.map((d, j) => (j === i ? { ...d, [campo]: valor } : d)))

  function quitarDiseno(i) {
    const d = disenos[i]
    if (d.id) setQuitados([...quitados, d])
    setDisenos(disenos.filter((_, j) => j !== i))
  }

  function agregarArchivos(i, lista) {
    setErrorLocal('')
    const nuevos = []
    for (const f of lista) {
      if (!TIPOS_ARCHIVO.includes(f.type)) {
        setErrorLocal(`"${f.name}" no es PNG, JPG, WEBP ni PDF`)
        continue
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setErrorLocal(`"${f.name}" pesa más de ${MAX_MB} MB`)
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

  const quitarExistente = (i, im) =>
    setDisenos(disenos.map((d, j) => j !== i ? d : {
      ...d,
      existentes: d.existentes.filter((x) => x.id !== im.id),
      existentesQuitadas: [...d.existentesQuitadas, im],
    }))

  async function guardar(e) {
    e.preventDefault()
    setErrorLocal('')
    if (disenos.length === 0) { setErrorLocal('El pedido necesita al menos un diseño'); return }
    setEnviando(true)
    await onGuardar({ p, disenos, quitados })
    setEnviando(false)
  }

  return (
    <form onSubmit={guardar}>
      <h1>{titulo}</h1>
      <p className="mut sub">{subtitulo}</p>

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
        <section key={d.id ?? `nuevo-${i}`} className="seccion">
          <div className="seccion-cab">
            <h2 className="seccion-titulo"><span className="num">{i + 2}</span>Diseño {i + 1}</h2>
            {disenos.length > 1 && (
              <button type="button" className="link" onClick={() => quitarDiseno(i)}>Quitar diseño</button>
            )}
          </div>

          <div className="form">
            <div className="w">
              <span className="etq">Tipo de trabajo</span>
              <Segmentado
                opciones={opciones.map((t) => String(t.id))}
                etiquetas={etiquetasTipo}
                valor={d.tipo_trabajo_id}
                onChange={fijarDiseno(i, 'tipo_trabajo_id')}
              />
              {tipos.length > 0 && !primeroActivo && (
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

              {d.existentes.map((im) => (
                <div key={im.id} className="img-fila" style={{ gridTemplateColumns: '1fr auto' }}>
                  <div className="img-nombre">
                    <b>{im.descripcion || 'Imagen guardada'}</b>
                    <span className="mut">Ya guardada · {im.archivo.split('.').pop().toUpperCase()}</span>
                  </div>
                  <button type="button" className="link" onClick={() => quitarExistente(i, im)}>Quitar</button>
                </div>
              ))}

              <div className="zona-archivos" style={{ marginTop: d.existentes.length ? 10 : 0 }}>
                <input
                  type="file"
                  multiple
                  accept={TIPOS_ARCHIVO.join(',')}
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
                    <span className="mut">{(img.archivo.size / 1048576).toFixed(1)} MB · nueva</span>
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

      <button
        type="button"
        className="btn-anadir"
        onClick={() => setDisenos([...disenos, disenoVacio(primeroActivo ? String(primeroActivo.id) : '')])}
      >
        + Agregar otro diseño
      </button>

      <div className="barra-guardar">
        {(errorLocal || error) && <div className="error">{errorLocal || error}</div>}
        <button className="btn pri grande" disabled={enviando || !primeroActivo}>
          {enviando ? 'Guardando…' : textoBoton}
        </button>
      </div>
    </form>
  )
}