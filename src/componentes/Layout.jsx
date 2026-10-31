import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexto/AuthContext'
import Logo from './Logo'
import Campana from './Campana'
import BotonPush from './BotonPush'

export default function Layout() {
  const { perfil, salir } = useAuth()
  const admin = perfil.rol === 'administrador'

  return (
    <>
      <header className="top">
        <Logo alto={38} />
        <nav>
          {admin && <NavLink to="/pedidos">Pedidos</NavLink>}
          {admin && <NavLink to="/catalogo">Catálogo</NavLink>}
          {admin && <NavLink to="/usuarios">Usuarios</NavLink>}
          {admin && <NavLink to="/ganancias">Ganancias</NavLink>}
          {admin && <NavLink to="/clientes">Clientes</NavLink>}
          <NavLink to="/disponibles">Disponibles</NavLink>
          <NavLink to="/mis-pedidos">Mis pedidos</NavLink>
          
        </nav>
        <div className="quien">
          <Campana />
          <NavLink to="/cuenta">{perfil.nombre}</NavLink>
          <button className="link" onClick={salir}>Salir</button>
        </div>
      </header>
      <main className="wrap">
        <BotonPush />
        <Outlet />
      </main>
    </>
  )
}