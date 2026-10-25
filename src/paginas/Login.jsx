import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'
import Logo from '../componentes/Logo'

export default function Login() {
  const { perfil } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Si ya hay alguien conectado, no tiene sentido ver el login
  if (perfil) return <Navigate to="/" replace />

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    setEnviando(false)
  }

  return (
    <div className="login">
      <form onSubmit={enviar}>
        <div className="logo-wrap"><Logo variante="vertical" alto={170} /></div>
        <p className="mut" style={{ textAlign: 'center', margin: 0 }}>Pedidos de DTF</p>
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn pri" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}