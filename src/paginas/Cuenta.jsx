import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'

const ROLES = { operario: 'Operario', administrador: 'Administrador' }

export default function Cuenta() {
  const { user, perfil } = useAuth()
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)

  async function cambiar(e) {
    e.preventDefault()
    setError('')
    setOk(false)

    if (f.nueva.length < 8) return setError('La contraseña nueva debe tener al menos 8 caracteres')
    if (f.nueva !== f.repetir) return setError('Las contraseñas nuevas no coinciden')
    if (f.nueva === f.actual) return setError('La contraseña nueva debe ser distinta de la actual')

    setGuardando(true)
    // Comprobar que sabe la contraseña actual
    const { error: eActual } = await supabase.auth.signInWithPassword({ email: user.email, password: f.actual })
    if (eActual) {
      setError('La contraseña actual no es correcta')
      setGuardando(false)
      return
    }
    const { error: eNueva } = await supabase.auth.updateUser({ password: f.nueva })
    setGuardando(false)
    if (eNueva) return setError(eNueva.message)

    setF({ actual: '', nueva: '', repetir: '' })
    setOk(true)
  }

  const poner = (campo) => (e) => setF({ ...f, [campo]: e.target.value })

  return (
    <>
      <h1>Mi cuenta</h1>

      <section className="seccion">
        <div className="datos">
          <div><span className="mut">Nombre</span><b>{perfil.nombre}</b></div>
          <div><span className="mut">Correo</span><b style={{ fontSize: 14 }}>{user.email}</b></div>
          <div><span className="mut">Rol</span><b>{ROLES[perfil.rol]}</b></div>
        </div>
      </section>

      <section className="seccion">
        <h2 className="seccion-titulo">Cambiar contraseña</h2>
        <form className="form" onSubmit={cambiar}>
          <label className="w">Contraseña actual
            <input type="password" autoComplete="current-password" value={f.actual} onChange={poner('actual')} required />
          </label>
          <label>Contraseña nueva
            <input type="password" autoComplete="new-password" minLength={8} value={f.nueva} onChange={poner('nueva')} required />
          </label>
          <label>Repetir contraseña nueva
            <input type="password" autoComplete="new-password" minLength={8} value={f.repetir} onChange={poner('repetir')} required />
          </label>
          {error && <div className="error w">{error}</div>}
          {ok && <div className="aviso w" style={{ borderColor: 'var(--ok)' }}>Contraseña cambiada correctamente.</div>}
          <button className="btn pri w" disabled={guardando}>{guardando ? 'Guardando…' : 'Cambiar contraseña'}</button>
        </form>
      </section>
    </>
  )
}