import { supabase } from './supabase'
import { crearXlsx } from './excel.js'
import { armarHojas } from './respaldoHojas.js'

const POR_TANDA = 300
const CLAVE = 'sublimarte_ultimo_respaldo'

// Trae todos los pedidos de a 300, con diseños, historial y reporte de materiales
async function traerPedidos() {
  const todos = []
  for (let desde = 0; desde < 50000; desde += POR_TANDA) {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        items_pedido(*, tipos_trabajo(nombre)),
        historial_pedido(*),
        reportes_produccion(*, materiales_usados(*, materiales(nombre, unidad)))
      `)
      .order('numero')
      .range(desde, desde + POR_TANDA - 1)
    if (error) throw error
    todos.push(...data)
    if (data.length < POR_TANDA) break
  }
  return todos
}

export async function descargarRespaldo() {
  const [pedidos, perfiles] = await Promise.all([
    traerPedidos(),
    supabase.from('perfiles').select('id, nombre'),
  ])
  if (perfiles.error) throw perfiles.error

  const bytes = crearXlsx(armarHojas(pedidos, perfiles.data))
  const archivo = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const direccion = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = direccion
  enlace.download = `sublimarte-respaldo-${new Date().toLocaleDateString('en-CA')}.xlsx`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(direccion), 10000)

  try { localStorage.setItem(CLAVE, new Date().toISOString()) } catch { /* sin guardar la fecha */ }
  return pedidos.length
}

export function ultimoRespaldo() {
  try { return localStorage.getItem(CLAVE) } catch { return null }
}