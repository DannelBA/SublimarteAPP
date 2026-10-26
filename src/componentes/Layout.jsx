import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexto/AuthContext'
import Logo from './Logo'

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
          <NavLink to="/disponibles">Disponibles</NavLink>
          <NavLink to="/mis-pedidos">Mis pedidos</NavLink>
          
        </nav>
        <div className="quien">
          {perfil.nombre}
          <button className="link" onClick={salir}>Salir</button>
        </div>
      </header>
      <main className="wrap">
        <Outlet />
      </main>
    </>
  )
}