import { supabase } from './supabase'

// Llama a la función y devuelve un mensaje claro si falla
async function llamar(cuerpo) {
  const { data, error } = await supabase.functions.invoke('archivos', { body: cuerpo })
  if (error) {
    let mensaje = error.message
    try {
      const respuesta = await error.context.json()
      if (respuesta?.error) mensaje = respuesta.error
    } catch {
      // se deja el mensaje general
    }
    throw new Error(mensaje)
  }
  return data
}

// Sube un archivo directo a R2 y devuelve su ruta
export async function subirArchivo(pedido, archivo) {
  const { ruta, url } = await llamar({ accion: 'subir', pedido, tipo: archivo.type })
  const respuesta = await fetch(url, {
    method: 'PUT',
    body: archivo,
    headers: { 'Content-Type': archivo.type },
  })
  if (!respuesta.ok) throw new Error(`No se pudo subir el archivo (${respuesta.status})`)
  return ruta
}

// Devuelve { ruta: enlaceTemporal } de las imágenes que esta persona puede ver
export async function urlsParaVer(rutas) {
  const { urls } = await llamar({ accion: 'ver', rutas })
  return urls
}

// Borra archivos. Si falla queda un archivo suelto en R2, pero el pedido no se afecta.
export async function borrarArchivos(rutas) {
  try {
    await llamar({ accion: 'borrar', rutas })
  } catch {
    // no se interrumpe lo que la persona estaba haciendo
  }
}