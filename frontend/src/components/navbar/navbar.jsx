import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import BootstrapNavbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import logoEmpresa from '@/assets/logo.png';

function Navbar() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const permisos = JSON.parse(localStorage.getItem('permisos') || '[]');

  const tienePermiso = (codigo) => {
    if (usuario.rol_usu === 1) return true;
    return permisos.includes(codigo);
  };

  const handleCloseMenu = () => setExpanded(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('permisos');
    navigate('/');
  };

  const mostrarGestionClientes = tienePermiso('CLIENTES') || tienePermiso('COBRANZAS');
  const mostrarGestionProveedores = tienePermiso('PROVEEDORES');
  const mostrarAlmacen = tienePermiso('ENTRADAS') || tienePermiso('PRODUCTOS');
  const mostrarGerencia = tienePermiso('ADMINISTRACION') || tienePermiso('REPORTES');

  return (
    <BootstrapNavbar
      bg="dark"
      data-bs-theme="dark"
      expand="lg"
      className="py-3 shadow-sm"
      expanded={expanded}
      onToggle={(isExpanded) => setExpanded(isExpanded)}
    >
      <Container>
        <BootstrapNavbar.Brand as={Link} to="/inicio" className="d-flex align-items-center" onClick={handleCloseMenu}>
          <img
            src={logoEmpresa}
            alt="Logo"
            height="70"
            className="d-inline-block align-top me-2"
          />
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto align-items-lg-center">

              <Nav.Link as={Link} to="/inicio" className="fw-bold" onClick={handleCloseMenu}>
                Inicio
              </Nav.Link>

            {mostrarGestionClientes && (
              <NavDropdown title="Clientes" id="nav-dropdown-ventas">
                {tienePermiso('CLIENTES') && (
                  <NavDropdown.Item as={Link} to="/clientes" onClick={handleCloseMenu}>
                    Directorio
                  </NavDropdown.Item>
                )}
                {tienePermiso('COBRANZAS') && (
                  <NavDropdown.Item as={Link} to="/cobranzas" onClick={handleCloseMenu}>
                    Cuentas por Cobrar
                  </NavDropdown.Item>
                )}
              </NavDropdown>
            )}

            {mostrarGestionProveedores && (
              <NavDropdown title="Proveedores" id="nav-dropdown-proveedores">
                {tienePermiso('PROVEEDORES') && (
                  <NavDropdown.Item as={Link} to="/proveedores" onClick={handleCloseMenu}>
                    Directorio
                  </NavDropdown.Item>
                )}
              </NavDropdown>
            )}

            {mostrarAlmacen && (
              <NavDropdown title="Almacén" id="nav-dropdown-almacen">
                {tienePermiso('PRODUCTOS') && (
                  <NavDropdown.Item as={Link} to="/inventario" onClick={handleCloseMenu}>
                    Inventario
                  </NavDropdown.Item>
                )}
                {tienePermiso('ENTRADAS') && (
                  <NavDropdown.Item as={Link} to="/entradas" onClick={handleCloseMenu}>
                    Recepción de Mercancía
                  </NavDropdown.Item>
                )}
              </NavDropdown>
            )}

            {mostrarGerencia && (
              <NavDropdown title={<span>Gerencia</span>} id="nav-dropdown-gerencia">
                {tienePermiso('ADMINISTRACION') && (
                  <NavDropdown.Item as={Link} to="/administracion" onClick={handleCloseMenu}>
                    Administración
                  </NavDropdown.Item>
                )}
                {tienePermiso('REPORTES') && (
                  <NavDropdown.Item as={Link} to="/reportes" onClick={handleCloseMenu}>
                    Reportes
                  </NavDropdown.Item>
                )}
              </NavDropdown>
            )}

            <Nav.Link as={Link} to="/ventas" className="fw-bold" onClick={handleCloseMenu}>
              Ventas
            </Nav.Link>

            <Nav.Link as={Link} to="/configuracion" className="fw-bold d-flex align-items-center gap-1" onClick={handleCloseMenu}>
              <FontAwesomeIcon icon={faGear} /> Configuración
            </Nav.Link>

          </Nav>

          <Nav className="align-items-center mt-3 mt-lg-0 gap-3">
            <span className="text-light fw-bold" style={{ fontSize: '0.9rem' }}>
              👤 {usuario.usuario} | 📍 {usuario.nombre_sucursal || 'Sede Principal'}
            </span>
            <Button variant="danger" onClick={handleLogout} size="sm" className="fw-bold">Salir</Button>
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}

export default Navbar;