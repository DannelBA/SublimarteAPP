import { supabase } from './supabase'

// Llama a la función del servidor y devuelve un mensaje claro si falla
export async function gestionarUsuarios(cuerpo) {
  const { data, error } = await supabase.functions.invoke('gestionar-usuarios', { body: cuerpo })
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

// Contraseña al azar, fácil de leer (sin letras que se confunden: i, l, o, 0, 1)
export function generarClave(largo = 10) {
  const letras = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint32Array(largo)), (n) => letras[n % letras.length]).join('')
}