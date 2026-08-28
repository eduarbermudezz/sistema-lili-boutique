import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/layout.jsx';
import { MessageProvider } from './context/MessageContext.jsx';
import RutaConPermiso from '@/components/layout/RutaConPermiso.jsx';
import Loader from '@/components/loader/loader.jsx';

const Login = lazy(() => import('@/views/Login/login.jsx'));
const Home = lazy(() => import('@/views/home.jsx'));
const Productos = lazy(() => import('@/views/Pages/productos.jsx'));
const Clientes = lazy(() => import('@/views/Pages/clientes.jsx'));
const Proveedores = lazy(() => import('@/views/Pages/proveedores.jsx'));
const Entradas = lazy(() => import('@/views/Pages/entradas.jsx'));
const CuentasPorCobrar = lazy(() => import('@/views/Pages/cuentas-por-cobrar.jsx'));
const Administracion = lazy(() => import('@/views/Pages/administracion.jsx'));
const Ventas = lazy(() => import('@/views/Pages/ventas.jsx'));
const Reportes = lazy(() => import('@/views/Pages/reportes.jsx'));
const Configuracion = lazy(() => import('@/views/Pages/configuracion.jsx'));

const NotFound = () => <div className="text-center mt-5"><h2>404</h2><p>Página no encontrada</p></div>;

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const TabTitleUpdater = () => {
  const location = useLocation();
  useEffect(() => {
    const titulos = {
      '/': 'Login | Lili Boutique',
      '/inicio': 'Inicio | Lili Boutique',
      '/inventario': 'Inventario | Lili Boutique',
      '/clientes': 'Clientes | Lili Boutique',
      '/proveedores': 'Proveedores | Lili Boutique',
      '/entradas': 'Entradas | Lili Boutique',
      '/cobranzas': 'Cuentas por Cobrar | Lili Boutique',
      '/ventas': 'Historial de Ventas | Lili Boutique',
      '/administracion': 'Administración | Lili Boutique',
      '/reportes': 'Reportes Gerenciales | Lili Boutique',
      '/configuracion': 'Configuración | Lili Boutique'
    };
    document.title = titulos[location.pathname] || 'Lili Boutique | Sistema de Ventas';
  }, [location.pathname]);
  return null;
};

const RestriccionesNavegacion = () => {
  const location = useLocation();

  useEffect(() => {
    window.history.pushState(null, null, window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    let canal = null;

    canal = new BroadcastChannel('lili_boutique_lock');

    canal.postMessage('nueva_pestana_abierta');

    canal.onmessage = (evento) => {
      if (evento.data === 'nueva_pestana_abierta') {
        canal.postMessage('sistema_ya_activo');
      }
      if (evento.data === 'sistema_ya_activo') {
        alert('El sistema ya se encuentra abierto en otra pestaña o ventana.');
        window.location.replace('about:blank');
      }
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (canal) canal.close();
    };
  }, [location.pathname]);

  return null;
};

const App = () => {
  return (
    <MessageProvider>
      <Router>
        <TabTitleUpdater />
        <RestriccionesNavegacion />
        <Suspense fallback={<Loader pantallaCompleta={true} texto="Cargando módulo..." />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/inicio" element={
                    <Home />
                } />
                <Route path="/inventario" element={
                  <RutaConPermiso permisoRequerido="PRODUCTOS">
                    <Productos />
                  </RutaConPermiso>
                } />
                <Route path="/clientes" element={
                  <RutaConPermiso permisoRequerido="CLIENTES">
                    <Clientes />
                  </RutaConPermiso>
                } />
                <Route path="/proveedores" element={
                  <RutaConPermiso permisoRequerido="PROVEEDORES">
                    <Proveedores />
                  </RutaConPermiso>
                } />
                <Route path="/entradas" element={
                  <RutaConPermiso permisoRequerido="ENTRADAS">
                    <Entradas />
                  </RutaConPermiso>
                } />
                <Route path="/cobranzas" element={
                  <RutaConPermiso permisoRequerido="COBRANZAS">
                    <CuentasPorCobrar />
                  </RutaConPermiso>
                } />
                <Route path="/ventas" element={
                    <Ventas />
                } />
                <Route path="/administracion" element={
                  <RutaConPermiso permisoRequerido="ADMINISTRACION">
                    <Administracion />
                  </RutaConPermiso>
                } />
                <Route path="/reportes" element={
                  <RutaConPermiso permisoRequerido="REPORTES">
                    <Reportes />
                  </RutaConPermiso>
                } />
               <Route path="/configuracion" element={<Configuracion />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </MessageProvider>
  );
};

export default App;