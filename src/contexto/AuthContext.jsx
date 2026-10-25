import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  // 1. Ver si ya hay una sesión abierta y escuchar cuando alguien entra o sale
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      if (!data.session) setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setUser(sesion?.user ?? null)
      if (!sesion) {
        setPerfil(null)
        setCargando(false)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // 2. Cuando hay un usuario, traer su perfil (nombre y rol)
  useEffect(() => {
    if (!user) return
    supabase
      .from('perfiles')
      .select('nombre, rol, activo')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data || !data.activo) {
          supabase.auth.signOut()
          setPerfil(null)
        } else {
          setPerfil(data)
        }
        setCargando(false)
      })
  }, [user])

  const salir = () => supabase.auth.signOut()

  return (
    <Ctx.Provider value={{ user, perfil, cargando, salir }}>
      {children}
    </Ctx.Provider>
  )
}