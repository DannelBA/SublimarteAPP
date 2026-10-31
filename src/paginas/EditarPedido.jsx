import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { subirImagenes } from '../lib/imagenes'
import FormularioPedido from '../componentes/FormularioPedido'

export default function EditarPedido() {
  const { numero } = useParams()
  const { state } = useLocation()
  const navegar = useNavigate()
  const [inicial, setInicial] = useState(null)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState(state?.aviso ?? '')
  const originales = useRef({})

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, items_pedido(*, imagenes_item(*))')
      .eq('numero', numero)
      .maybeSingle()
    if (error) { setError(error.message); return }
    if (!data) { setError('No se encontró el pedido'); return }

    const items = [...data.items_pedido].sort((a, b) => a.id - b.id)
    originales.current = Object.fromEntries(items.map((it) => [it.id, it]))
    setInicial({
      p: {
        cliente_nombre: data.cliente_nombre,
        cliente_telefono: data.cliente_telefono ?? '',
        fecha_limite: data.fecha_limite,
        prioridad: data.prioridad,
        precio: String(data.precio),
        observaciones: data.observaciones ?? '',
      },
      disenos: items.map((it) => ({
        id: it.id,
        tipo_trabajo_id: String(it.tipo_trabajo_id),
        descripcion: it.descripcion,
        ancho_cm: String(it.ancho_cm),
        alto_cm: String(it.alto_cm),
        cantidad: String(it.cantidad),
        imagenes: [],
        existentes: it.imagenes_item,
        existentesQuitadas: [],
      })),
    })
    setVersion((v) => v + 1)
  }, [numero])

  useEffect(() => { cargar() }, [cargar])

  async function guardar({ p, disenos, quitados }) {
    setError('')
    const n = Number(numero)
    const resumen = { agregados: 0, modificados: 0, eliminados: 0, imgNuevas: 0, imgQuitadas: 0 }
    let fallidas = 0

    // 1. Datos generales (el historial lo anota solo, con el detalle de qué cambió)
    const { error: e1 } = await supabase
      .from('pedidos')
      .update({
        cliente_nombre: p.cliente_nombre,
        cliente_telefono: p.cliente_telefono || null,
        fecha_limite: p.fecha_limite,
        prioridad: p.prioridad,
        precio: Number(p.precio || 0),
        observaciones: p.observaciones || null,
      })
      .eq('numero', n)
    if (e1) { setError(e1.message); return }

    // 2. Diseños eliminados (con sus archivos)
    for (const d of quitados) {
      const rutas = d.existentes.map((im) => im.archivo)
      const { error } = await supabase.from('items_pedido').delete().eq('id', d.id)
      if (error) { setError(error.message); await cargar(); return }
      if (rutas.length) await supabase.storage.from('disenos').remove(rutas)
      resumen.eliminados++
    }

    // 3. Diseños nuevos o modificados, y sus imágenes
    for (const d of disenos) {
      const campos = {
        tipo_trabajo_id: Number(d.tipo_trabajo_id),
        descripcion: d.descripcion,
        ancho_cm: Number(d.ancho_cm),
        alto_cm: Number(d.alto_cm),
        cantidad: Number(d.cantidad),
      }
      let itemId = d.id

      if (itemId) {
        const o = originales.current[itemId]
        const cambio =
          o.tipo_trabajo_id !== campos.tipo_trabajo_id || o.descripcion !== campos.descripcion ||
          Number(o.ancho_cm) !== campos.ancho_cm || Number(o.alto_cm) !== campos.alto_cm ||
          o.cantidad !== campos.cantidad
        if (cambio) {
          const { error } = await supabase.from('items_pedido').update(campos).eq('id', itemId)
          if (error) { setError(error.message); await cargar(); return }
          resumen.modificados++
        }
      } else {
        const { data, error } = await supabase
          .from('items_pedido')
          .insert({ pedido_numero: n, ...campos })
          .select('id')
          .single()
        if (error) { setError(error.message); await cargar(); return }
        itemId = data.id
        resumen.agregados++
      }

      for (const im of d.existentesQuitadas) {
        const { error } = await supabase.from('imagenes_item').delete().eq('id', im.id)
        if (!error) {
          await supabase.storage.from('disenos').remove([im.archivo])
          resumen.imgQuitadas++
        }
      }

      const falladas = await subirImagenes(n, itemId, d.imagenes)
      fallidas += falladas
      resumen.imgNuevas += d.imagenes.length - falladas
    }

    // 4. Dejar constancia en la trazabilidad
    const partes = []
    if (resumen.agregados) partes.push(`${resumen.agregados} diseño(s) agregado(s)`)
    if (resumen.modificados) partes.push(`${resumen.modificados} diseño(s) modificado(s)`)
    if (resumen.eliminados) partes.push(`${resumen.eliminados} diseño(s) eliminado(s)`)
    if (resumen.imgNuevas) partes.push(`${resumen.imgNuevas} imagen(es) agregada(s)`)
    if (resumen.imgQuitadas) partes.push(`${resumen.imgQuitadas} imagen(es) quitada(s)`)
    if (partes.length) await supabase.rpc('registrar_edicion', { p_numero: n, p_nota: partes.join(', ') })

    if (fallidas > 0) {
      setError(`Se guardaron los cambios, pero ${fallidas} imagen(es) no se pudieron subir. Vuelve a agregarlas.`)
      await cargar()
      return
    }
    navegar(`/pedido/${n}`)
  }

  if (!inicial) return error ? <div className="error">{error}</div> : <p className="centro">Cargando…</p>

  return (
    <FormularioPedido
      key={version}
      titulo={`Editar pedido #${numero}`}
      subtitulo="Cambia lo que necesites. Los cambios quedan registrados en la trazabilidad."
      textoBoton="Guardar cambios"
      inicial={inicial}
      error={error}
      onGuardar={guardar}
    />
  )
}