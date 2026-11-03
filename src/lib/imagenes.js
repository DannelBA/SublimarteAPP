import { supabase } from './supabase'
import { borrarArchivos, subirArchivo } from './archivos'

// Sube las imágenes nuevas de un diseño a R2 y guarda su ruta. Devuelve cuántas fallaron.
export async function subirImagenes(pedidoNumero, itemId, imagenes) {
  let fallidas = 0
  for (const img of imagenes) {
    let ruta
    try {
      ruta = await subirArchivo(pedidoNumero, img.archivo)
    } catch {
      fallidas++
      continue
    }

    const { error } = await supabase.from('imagenes_item').insert({
      item_id: itemId,
      archivo: ruta,
      descripcion: img.descripcion || null,
    })
    if (error) {
      fallidas++
      await borrarArchivos([ruta])
    }
  }
  return fallidas
}