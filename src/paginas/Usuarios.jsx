import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexto/AuthContext'
import { gestionarUsuarios, generarClave } from '../lib/usuarios'
import Segmentado from '../componentes/Segmentado'

const ROLES = { operario: 'Operario', administrador: 'Administrador' }

export default function Usuarios() {
  const { user } = useAuth()
  const [lista, setLista] = useState([])
  const [error, setError] = useState('')
  const [nuevo, setNuevo] = useState({ nombre: '', correo: '', clave: generarClave(), rol: 'operario' })
  const [creando, setCreando] = useState(false)
  const [creado, setCreado] = useState(null)
  const [claveDe, setClaveDe] = useState(null)
  const [claveNueva, setClaveNueva] = useState('')
  const [copiado, setCopiado] = useState(false)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('perfiles').select('*').order('nombre')
    if (error) setError(error.message)
    else setLista(data)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function crear(e) {
    e.preventDefault()
    setError('')
    setCreando(true)
    try {
      await gestionarUsuarios({ accion: 'crear', ...nuevo })
      setCreado({ ...nuevo })
      setCopiado(false)
      setNuevo({ nombre: '', correo: '', clave: generarClave(), rol: 'operario' })
      await cargar()
    } catch (err) {
      setError(err.message)
    }
    setCreando(false)
  }

  async function cambiar(id, campos) {
    setError('')
    const { error } = await supabase.from('perfiles').update(campos).eq('id', id)
    if (error) setError(error.message)
    await cargar()
  }

  async function guardarClave(e) {
    e.preventDefault()
    setError('')
    try {
      await gestionarUsuarios({ accion: 'cambiar_clave', id: claveDe.id, clave: claveNueva })
      setCreado({ nombre: claveDe.nombre, correo: claveDe.correo, clave: claveNueva, cambio: true })
      setCopiado(false)
      setClaveDe(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function copiar() {
    const texto = `Página: ${window.location.origin}\nCorreo: ${creado.correo}\nContraseña: ${creado.clave}`
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
  }

  return (
    <>
      <h1>Usuarios</h1>
      <p className="mut sub">Crea cuentas para tu equipo, cambia contraseñas o desactiva a quien ya no trabaje contigo.</p>

      {error && <div className="error">{error}</div>}

      {creado && (
        <section className="seccion" style={{ borderColor: 'var(--ok)' }}>
          <h2 className="seccion-titulo">{creado.cambio ? 'Contraseña cambiada' : 'Usuario creado'}</h2>
          <p style={{ margin: '0 0 6px' }}><b>{creado.nombre}</b></p>
          <p className="mut" style={{ margin: 0 }}>Correo: {creado.correo}</p>
          <p className="mut" style={{ margin: '0 0 12px' }}>Contraseña: <b style={{ color: 'var(--tx)' }}>{creado.clave}</b></p>
          <p className="mut">Esta es la única vez que se muestra la contraseña. Cópiala y envíasela a la persona.</p>
          <div className="acciones">
            <button className="btn pri" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar datos de acceso'}</button>
            <button className="btn" onClick={() => setCreado(null)}>Cerrar</button>
          </div>
        </section>
      )}

      <section className="seccion">
        <h2 className="seccion-titulo">Nuevo usuario</h2>
        <form className="form" onSubmit={crear}>
          <label>Nombre
            <input placeholder="Nombre de la persona" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
          </label>
          <label>Correo
            <input type="email" placeholder="correo@ejemplo.com" value={nuevo.correo} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} required />
          </label>
          <label>Contraseña inicial
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} minLength={8} required />
              <button type="button" className="btn" onClick={() => setNuevo({ ...nuevo, clave: generarClave() })}>Generar</button>
            </div>
          </label>
          <div>
            <span className="etq">Rol</span>
            <Segmentado opciones={['operario', 'administrador']} etiquetas={ROLES} valor={nuevo.rol} onChange={(v) => setNuevo({ ...nuevo, rol: v })} />
          </div>
          <button className="btn pri w" disabled={creando}>{creando ? 'Creando…' : 'Crear usuario'}</button>
        </form>
      </section>

      <h2>Equipo</h2>
      {lista.map((u) => {
        const yo = u.id === user.id
        return (
          <section key={u.id} className="seccion" style={{ opacity: u.activo ? 1 : 0.55 }}>
            <div className="fila">
              <div>
                <b>{u.nombre}</b>{yo && <span className="mut"> (tú)</span>}
                <div className="mut">{u.correo}</div>
              </div>
              <span className="chip" style={{ '--c': u.activo ? '#3ecf8e' : '#a39f95' }}>
                {u.activo ? 'Activo' : 'Desactivado'}
              </span>
            </div>

            <div className="acciones">
              <select
                value={u.rol}
                disabled={yo}
                onChange={(e) => cambiar(u.id, { rol: e.target.value })}
                style={{ width: 'auto' }}
                aria-label="Rol"
              >
                <option value="operario">Operario</option>
                <option value="administrador">Administrador</option>
              </select>
              <button className="btn" onClick={() => { setClaveDe(u); setClaveNueva(generarClave()) }}>
                Cambiar contraseña
              </button>
              {!yo && (
                <button className={u.activo ? 'btn rojo' : 'btn'} onClick={() => cambiar(u.id, { activo: !u.activo })}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </div>

            {claveDe?.id === u.id && (
              <form className="mat-linea" style={{ gridTemplateColumns: '1fr auto auto auto' }} onSubmit={guardarClave}>
                <input value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} minLength={8} required aria-label="Contraseña nueva" />
                <button type="button" className="btn" onClick={() => setClaveNueva(generarClave())}>Generar</button>
                <button className="btn pri">Guardar</button>
                <button type="button" className="link" onClick={() => setClaveDe(null)}>Cancelar</button>
              </form>
            )}
          </section>
        )
      })}
    </>
  )
}