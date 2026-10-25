import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexto/AuthContext'
import Layout from './componentes/Layout'
import Login from './paginas/Login'
import ListaPedidos from './paginas/ListaPedidos'
import NuevoPedido from './paginas/NuevoPedido'

// Deja pasar solo a quien tiene sesión (y, si se indica, el rol correcto)
function Protegida({ roles, children }) {
  const { perfil, cargando } = useAuth()
  if (cargando) return <p className="centro">Cargando…</p>
  if (!perfil) return <Navigate to="/login" replace />
  if (roles && !roles.includes(perfil.rol)) return <Navigate to="/" replace />
  return children
}

// Envía a cada persona a su pantalla de inicio según su rol
function Inicio() {
  const { perfil, cargando } = useAuth()
  if (cargando) return <p className="centro">Cargando…</p>
  if (!perfil) return <Navigate to="/login" replace />
  return <Navigate to={perfil.rol === 'administrador' ? '/pedidos' : '/disponibles'} replace />
}


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Inicio />} />

          <Route element={<Protegida><Layout /></Protegida>}>
              <Route path="/pedidos" element={<Protegida roles={['administrador']}><ListaPedidos modo="todos" /></Protegida>} />
              <Route path="/disponibles" element={<ListaPedidos modo="disponibles" />} />
              <Route path="/mis-pedidos" element={<ListaPedidos modo="mios" />} />
                          <Route path="/pedidos/nuevo" element={<Protegida roles={['administrador']}><NuevoPedido /></Protegida>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}