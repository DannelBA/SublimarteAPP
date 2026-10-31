import { supabase } from './supabase'

// Sube las imágenes nuevas de un diseño y guarda su ruta. Devuelve cuántas fallaron.
export async function subirImagenes(pedidoNumero, itemId, imagenes) {
  let fallidas = 0
  for (const img of imagenes) {
    const extension = img.archivo.name.split('.').pop().toLowerCase()
    const ruta = `pedidos/${pedidoNumero}/${crypto.randomUUID()}.${extension}`

    const { error: eSubir } = await supabase.storage
      .from('disenos')
      .upload(ruta, img.archivo, { contentType: img.archivo.type })
    if (eSubir) { fallidas++; continue }

    const { error: eFila } = await supabase.from('imagenes_item').insert({
      item_id: itemId,
      archivo: ruta,
      descripcion: img.descripcion || null,
    })
    if (eFila) {
      fallidas++
      await supabase.storage.from('disenos').remove([ruta])
    }
  }
  return fallidas
}