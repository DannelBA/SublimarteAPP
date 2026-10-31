import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexto/AuthContext'
import Logo from './Logo'
import Campana from './Campana'
import BotonPush from './BotonPush'
import Icono from './Iconos'

const HERRAMIENTAS = [
  ['/catalogo', 'Catálogo', 'catalogo'],
  ['/clientes', 'Clientes', 'clientes'],
  ['/ganancias', 'Ganancias', 'ganancias'],
  ['/usuarios', 'Usuarios', 'usuarios'],
]
const ROLES = { operario: 'Operario', administrador: 'Administrador' }

export default function Layout() {
  const { perfil, salir } = useAuth()
  const admin = perfil.rol === 'administrador'
  const [mas, setMas] = useState(false)
  const { pathname } = useLocation()

  const enMas = [...HERRAMIENTAS.map((h) => h[0]), '/cuenta'].some((r) => pathname.startsWith(r))
  const cerrar = () => setMas(false)

  return (
    <>
      <header className="top">
        <Logo alto={38} />

        {/* Menú del computador */}
        <nav className="menu-pc">
          {admin && <NavLink to="/pedidos">Pedidos</NavLink>}
          <NavLink to="/disponibles">Disponibles</NavLink>
          <NavLink to="/mis-pedidos">Mis pedidos</NavLink>
          {admin && HERRAMIENTAS.map(([ruta, texto]) => <NavLink key={ruta} to={ruta}>{texto}</NavLink>)}
        </nav>

        <div className="quien">
          <Campana />
          <span className="sobre-pc">
            <NavLink to="/cuenta">{perfil.nombre}</NavLink>
            <button className="link" onClick={salir}>Salir</button>
          </span>
        </div>
      </header>

      <main className="wrap">
        <BotonPush />
        <Outlet />
      </main>

      {/* Menú del celular: barra de abajo */}
      <nav className="tabs">
        {admin && (
          <NavLink to="/pedidos" onClick={cerrar}><Icono n="pedidos" /><span>Pedidos</span></NavLink>
        )}
        <NavLink to="/disponibles" onClick={cerrar}><Icono n="disponibles" /><span>Disponibles</span></NavLink>
        <NavLink to="/mis-pedidos" onClick={cerrar}><Icono n="mios" /><span>Mis pedidos</span></NavLink>
        <button className={mas || enMas ? 'active' : ''} onClick={() => setMas(!mas)}>
          <Icono n="mas" /><span>Más</span>
        </button>
      </nav>

      {mas && (
        <>
          <div className="fondo-hoja" onClick={cerrar} />
          <div className="hoja" role="dialog" aria-label="Más opciones">
            <div className="hoja-nombre">
              <b>{perfil.nombre}</b>
              <span className="mut">{ROLES[perfil.rol]}</span>
            </div>
            {admin && HERRAMIENTAS.map(([ruta, texto, icono]) => (
              <NavLink key={ruta} to={ruta} className="hoja-item" onClick={cerrar}>
                <Icono n={icono} /> {texto}
              </NavLink>
            ))}
            <NavLink to="/cuenta" className="hoja-item" onClick={cerrar}><Icono n="cuenta" /> Mi cuenta</NavLink>
            <button className="hoja-item rojo" onClick={salir}><Icono n="salir" /> Cerrar sesión</button>
          </div>
        </>
      )}
    </>
  )
}