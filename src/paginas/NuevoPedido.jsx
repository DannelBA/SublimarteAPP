import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { subirImagenes } from '../lib/imagenes'
import { useAuth } from '../contexto/AuthContext'
import FormularioPedido from '../componentes/FormularioPedido'

export default function NuevoPedido() {
  const { user } = useAuth()
  const navegar = useNavigate()
  const [error, setError] = useState('')

  async function crear({ p, disenos }) {
    setError('')

    // 1. El pedido
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
    if (e1) { setError(e1.message); return }

    const irAEditar = (aviso) => navegar(`/pedido/${pedido.numero}/editar`, { state: { aviso } })

    // 2. Sus diseños
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
      irAEditar(`El pedido #${pedido.numero} se creó, pero fallaron los diseños: ${e2.message}`)
      return
    }

    // 3. Sus imágenes
    let fallidas = 0
    for (let i = 0; i < disenos.length; i++) {
      fallidas += await subirImagenes(pedido.numero, items[i].id, disenos[i].imagenes)
    }
    if (fallidas > 0) {
      irAEditar(`El pedido #${pedido.numero} se creó, pero ${fallidas} imagen(es) no se pudieron subir. Agrégalas de nuevo aquí.`)
      return
    }

    navegar(`/pedido/${pedido.numero}`)
  }

  return (
    <FormularioPedido
      titulo="Nuevo pedido"
      subtitulo="Completa los datos del cliente y agrega uno o varios diseños."
      textoBoton="Crear pedido"
      error={error}
      onGuardar={crear}
    />
  )
}