import React, { useState, useEffect, useCallback } from 'react';
import { Container, Nav, Tab, Table, Badge, Card, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserShield, faHistory, faUsersGear, faIdCard, faLockOpen,
    faTrash, faEdit, faPlus,
    faDatabase, faCloudUploadAlt, faDownload, faFolderOpen,
    faSync, faStore, faCreditCard, faExclamationTriangle, faBuilding, faPercent
} from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/buttons/button.jsx';
import { useMessage } from '@/context/MessageContext.jsx';
import Loader from '@/components/loader/loader.jsx';

import UsuarioModal from '@/components/modals/user-modal.jsx';
import EmpleadoModal from '@/components/modals/employee-modal.jsx';
import SucursalModal from '@/components/modals/headquater-modal.jsx';
import CategoriaModal from '@/components/modals/category-modal.jsx';
import MetodoModal from '@/components/modals/method-modal.jsx';

export default function Administracion() {
    const [activeTab, setActiveTab] = useState('sucursales');
    const [data, setData] = useState({ 
        usuarios: [], empleados: [], roles: [], bitacora: [], permisos: [], mapeo: [], categorias: [], sucursales: [], metodosPago: [] 
    });
    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [errorData, setErrorData] = useState(null);

    const [nacionalidades, setNacionalidades] = useState([]);
    const [prefijos, setPrefijos] = useState([]);
    const [userForPerms, setUserForPerms] = useState('');
    const [respaldoDriveActivo, setRespaldoDriveActivo] = useState(false);
    const { showMessage, showConfirm } = useMessage();

    const [showUserModal, setShowUserModal] = useState(false);
    const [showEmpModal, setShowEmpModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const [showSucModal, setShowSucModal] = useState(false);
    const [showMetodoModal, setShowMetodoModal] = useState(false);

    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [empleadoEditando, setEmpleadoEditando] = useState(null);
    const [sucursalEditando, setSucurEditando] = useState(null);
    const [categoriaEditando, setCateEditando] = useState(null);
    const [metodoEditando, setMetodoEditando] = useState(null);

    const cargarTodo = useCallback(async (silencioso = false) => {
        if (!silencioso) setCargandoInicial(true);
        else setActualizando(true);

        setErrorData(null);
        const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
        try {
            const [u, e, resCat, r, b, p, n, pr, configRes, sucRes, metodosRes] = await Promise.all([
                axios.get(`${url}/usuarios`, config),
                axios.get(`${url}/empleados`, config),
                axios.get(`${url}/categorias`, config),
                axios.get(`${url}/roles`, config),
                axios.get(`${url}/bitacora`, config),
                axios.get(`${url}/permisos`, config),
                axios.get(`${url}/nacionalidades`, config),
                axios.get(`${url}/prefijos`, config),
                axios.get(`${url}/configuracion`, config),
                axios.get(`${url}/sucursales`, config).catch(() => ({ data: [] })),
                axios.get(`${url}/metodos-pago`, config).catch(() => ({ data: [] }))
            ]);

            setData({
                usuarios: u.data, empleados: e.data, roles: r.data,
                bitacora: b.data, permisos: p.data.todosPermisos, mapeo: p.data.mapeo,
                categorias: resCat.data, sucursales: sucRes.data,
                metodosPago: metodosRes.data
            });
            setNacionalidades(n.data);
            setPrefijos(pr.data);

            if (configRes && configRes.data) {
                setRespaldoDriveActivo(configRes.data.backup_activo === 1);
            }
        } catch (err) {
            console.error("Error cargando los datos de administración:", err);
            setErrorData("Hubo un problema al cargar los datos del sistema. Intenta recargar la página.");
        } finally {
            setCargandoInicial(false);
            setActualizando(false);
        }
    }, []);

    useEffect(() => { cargarTodo(false); }, [cargarTodo]);

    const abrirModalUsuario = (user = null) => { setUsuarioEditando(user); setShowUserModal(true); };
    const abrirModalEmp = (emp = null) => { setEmpleadoEditando(emp); setShowEmpModal(true); };
    const abrirModalSuc = (suc = null) => { setSucurEditando(suc); setShowSucModal(true); };
    const abrirModalCat = (cat = null) => { setCateEditando(cat); setShowCatModal(true); };
    const abrirModalMetodo = (met = null) => { setMetodoEditando(met); setShowMetodoModal(true); };

    const handleLimpiarBitacora = async () => {
        const confirmar = await showConfirm("¿Estás seguro de que deseas vaciar todo el historial de accesos al sistema? Esta acción no se puede deshacer.", "Limpiar Historial");
        if (!confirmar) return;

        setActualizando(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/bitacora`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            showMessage("Historial de Operaciones limpiado exitosamente.", "success");
            cargarTodo(true);
        } catch (err) {
            showMessage(`${err.response?.data?.message || err.message}`, "danger");
            setActualizando(false);
        }
    };

    const ejecutarEliminacion = async (url, mensajeExito) => {
        setActualizando(true);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/${url}`, { 
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
            });
            showMessage(mensajeExito, "success");
            cargarTodo(true);
        } catch (err) {
            showMessage(`${err.response?.data?.message || err.message}`, "danger");
            setActualizando(false);
        }
    };

    const handleEliminarUsuario = async (id) => {
        if (await showConfirm("¿Estás seguro de eliminar este usuario?", "🗑️ Eliminar Usuario")) ejecutarEliminacion(`usuarios/${id}`, "Usuario eliminado exitosamente.");
    };
    const handleEliminarEmpleado = async (id) => {
        if (await showConfirm("¿Estás seguro de eliminar este empleado?", "🗑️ Eliminar Empleado")) ejecutarEliminacion(`empleados/${id}`, "Empleado eliminado exitosamente.");
    };
    const handleEliminarSucursal = async (id) => {
        if (await showConfirm("¿Estás seguro de eliminar esta sucursal?", "🗑️ Eliminar Sucursal")) ejecutarEliminacion(`sucursales/${id}`, "Sucursal eliminada exitosamente.");
    };
    const handleEliminarCategoria = async (id) => {
        if (await showConfirm("¿Estás seguro de eliminar esta categoría?", "🗑️ Eliminar Categoría")) ejecutarEliminacion(`categorias/${id}`, "Categoría eliminada exitosamente.");
    };
    const handleEliminarMetodo = async (id) => {
        if (await showConfirm("¿Estás seguro de eliminar este método de pago?", "🗑️ Eliminar Método")) ejecutarEliminacion(`metodos-pago/${id}`, "Método eliminado exitosamente.");
    };

    const handleDescargarRespaldo = () => {
        const token = localStorage.getItem('token');
        window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/backup/respaldo/descargar?token=${token}`, '_blank');
    };

    const toggleRespaldoDrive = async () => {
        const nuevoEstado = !respaldoDriveActivo;
        setRespaldoDriveActivo(nuevoEstado);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/backup`, { backup_activo: nuevoEstado ? 1 : 0 }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            showMessage(nuevoEstado ? "El respaldo en Google Drive se ha ACTIVADO." : "El respaldo en Google Drive se ha DESACTIVADO.", "info");
        } catch (error) { 
            setRespaldoDriveActivo(!nuevoEstado); 
            showMessage("Error al guardar.", "danger"); 
        }
    };

    const togglePermiso = async (idUsuario, idPermiso) => {
        setActualizando(true);
        try {
            const permisosActuales = data.mapeo
                .filter(m => m.id_usu === idUsuario) 
                .map(m => m.id_permiso);
            const tienePermiso = permisosActuales.includes(idPermiso);
            const nuevosPermisos = tienePermiso ? permisosActuales.filter(id => id !== idPermiso) : [...permisosActuales, idPermiso];

            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/permisos/usuario/asignar`, {
                id_usu: idUsuario, 
                permisos: nuevosPermisos
            }, { 
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
            });

            showMessage("Permiso actualizado correctamente.", "success");
            cargarTodo(true);
        } catch (error) {
            showMessage("Error al actualizar el permiso.", "danger");
            setActualizando(false);
        }
    };

    return (
        <Container fluid className="p-2 p-md-3 d-flex flex-column h-100 alto-fijo-pc" style={{ minHeight: 0 }}>
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2" style={{ flexShrink: 0 }}>
                <h4 className="text-primary fw-bold mb-0">
                    <FontAwesomeIcon icon={faUserShield} className="me-2" />
                    Panel de Administración
                    {actualizando && <Spinner animation="border" size="sm" variant="primary" className="ms-3" />}
                </h4>
                <Button variant="outline-primary" size="sm" className="shadow-sm rounded-pill px-3" onClick={() => cargarTodo(true)} disabled={actualizando} title="Refrescar Datos">
                    <FontAwesomeIcon icon={faSync} className={actualizando ? "fa-spin me-2" : "me-2"} />
                    Actualizar
                </Button>
            </div>

            {errorData && (
                <Alert variant="danger" className="shadow-sm mb-3 d-flex align-items-center rounded" style={{ flexShrink: 0 }}>
                    <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="me-3" />
                    <div>
                        <h6 className="fw-bold mb-1">Fallo de Conexión</h6>
                        <span style={{ fontSize: '0.9rem' }}>{errorData}</span>
                    </div>
                </Alert>
            )}

            <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1 bg-white overflow-hidden" style={{ minHeight: 0 }}>
                <Card.Body className="d-flex flex-column p-0 h-100" style={{ minHeight: 0 }}>
                    {cargandoInicial ? (
                        <div className="d-flex justify-content-center align-items-center h-100">
                            <Loader texto="Cargando módulos de Administración..." />
                        </div>
                    ) : (
                        <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                            <div className="overflow-x-auto px-2 px-md-3 pt-3 bg-light" style={{ whiteSpace: 'nowrap', borderBottom: '1px solid #dee2e6', flexShrink: 0 }}>
                                <Nav variant="tabs" className="border-bottom-0 custom-tabs d-inline-flex flex-nowrap w-100 m-0">
                                    <Nav.Item><Nav.Link eventKey="sucursales" className="text-nowrap"><FontAwesomeIcon icon={faStore} className="me-2" />Sucursales</Nav.Link></Nav.Item>
                                    <Nav.Item><Nav.Link eventKey="empleados" className="text-nowrap"><FontAwesomeIcon icon={faIdCard} className="me-2" /> Empleados</Nav.Link></Nav.Item>
                                    <Nav.Item><Nav.Link eventKey="usuarios" className="text-nowrap"><FontAwesomeIcon icon={faUsersGear} className="me-2" />Accesos</Nav.Link></Nav.Item>
                                    <Nav.Item><Nav.Link eventKey="categorias" className="text-nowrap"><FontAwesomeIcon icon={faFolderOpen} className="me-2" />Categorías</Nav.Link></Nav.Item>
                                    <Nav.Item><Nav.Link eventKey="metodos" className="text-nowrap"><FontAwesomeIcon icon={faCreditCard} className="me-2" /> Métodos de Pago</Nav.Link></Nav.Item>
                                    <Nav.Item><Nav.Link eventKey="base_datos" className="text-nowrap"><FontAwesomeIcon icon={faDatabase} className="me-2" /> Base de Datos</Nav.Link></Nav.Item>
                                    <Nav.Item><Nav.Link eventKey="permisos" className="text-nowrap"><FontAwesomeIcon icon={faLockOpen} className="me-2" /> Permisos</Nav.Link></Nav.Item>
                                    <Nav.Item><Nav.Link eventKey="bitacora" className="text-nowrap"><FontAwesomeIcon icon={faHistory} className="me-2" /> Operaciones</Nav.Link></Nav.Item>
                                </Nav>
                            </div>

                            <Tab.Content className="flex-grow-1" style={{ overflowY: 'auto', minHeight: 0, opacity: actualizando ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                                
                                <Tab.Pane eventKey="sucursales">
                                    <div className="d-flex justify-content-end p-3 pb-0">
                                        <Button variant="success" size="sm" className="fw-bold shadow-sm px-3" onClick={() => abrirModalSuc()} disabled={actualizando}>
                                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nueva Sucursal
                                        </Button>
                                    </div>
                                    <div className="p-3">
                                        <div className="border rounded bg-white shadow-sm overflow-auto">
                                            <Table hover className="align-middle mb-0 custom-table" size="sm" style={{ minWidth: '500px' }}>
                                                <thead className="table-dark sticky-top">
                                                    <tr>
                                                        <th className="text-nowrap ps-3 py-3">Nombre</th>
                                                        <th className="text-nowrap py-3">Dirección / Referencia</th>
                                                        <th className="text-center text-nowrap py-3" style={{ width: '120px' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.sucursales.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="3" className="text-center py-5 text-muted bg-light">
                                                                <FontAwesomeIcon icon={faBuilding} size="4x" className="mb-3 opacity-25" /><br />
                                                                <h5 className="fw-bold text-secondary">Sin registros</h5>
                                                                <p className="mb-0">No hay sucursales registradas.</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        data.sucursales?.map(s => (
                                                            <tr key={s.id_sucursal}>
                                                                <td className="text-nowrap ps-3 py-2 fw-medium text-dark">{s.nombre}</td>
                                                                <td className="text-nowrap py-2 text-muted">{s.direccion}</td>
                                                                <td className="text-center text-nowrap py-2">
                                                                    <div className="d-flex justify-content-center gap-2">
                                                                        <Button variant="warning" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => abrirModalSuc(s)} disabled={actualizando} title="Editar Sucursal">
                                                                            <FontAwesomeIcon icon={faEdit} />
                                                                        </Button>
                                                                        <Button variant="danger" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => handleEliminarSucursal(s.id_sucursal)} disabled={actualizando} title="Eliminar Sucursal">
                                                                            <FontAwesomeIcon icon={faTrash} />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                </Tab.Pane>

                                <Tab.Pane eventKey="empleados">
                                    <div className="d-flex justify-content-end p-3 pb-0">
                                        <Button variant="success" size="sm" className="fw-bold shadow-sm px-3" onClick={() => abrirModalEmp()} disabled={actualizando}>
                                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Empleado
                                        </Button>
                                    </div>
                                    <div className="p-3">
                                        <div className="border rounded bg-white shadow-sm overflow-auto">
                                            <Table hover className="align-middle mb-0 custom-table" size="sm" style={{ minWidth: '600px' }}>
                                                <thead className="table-dark sticky-top">
                                                    <tr>
                                                        <th className="text-nowrap ps-3 py-3">C.I.</th>
                                                        <th className="text-nowrap py-3">Nombre Completo</th>
                                                        <th className="d-none d-md-table-cell text-nowrap py-3">Teléfono</th>
                                                        <th className="text-center text-nowrap py-3" style={{ width: '120px' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.empleados.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="4" className="text-center py-5 text-muted bg-light">
                                                                <FontAwesomeIcon icon={faFolderOpen} size="4x" className="mb-3 opacity-25" /><br />
                                                                <h5 className="fw-bold text-secondary">Sin registros</h5>
                                                                <p className="mb-0">No hay empleados registrados en el sistema.</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        data.empleados?.map(e => {
                                                            const prefijoTexto = prefijos.find(p => p.id_pref == e.pref_tlf_emp)?.pref_tlf || '';
                                                            const nacionalidadTexto = nacionalidades.find(n => n.id_tipo == e.tipo_doc_emp)?.letra_tipo || '';
                                                            return (
                                                                <tr key={e.id_emp}>
                                                                    <td className="text-nowrap ps-3 py-2 fw-medium text-dark">{nacionalidadTexto}-{e.ced_rif_emp}</td>
                                                                    <td className="text-nowrap py-2">{e.nombre_empleado}</td>
                                                                    <td className="d-none d-md-table-cell text-nowrap py-2 text-muted">{prefijoTexto}-{e.num_tlf_emp}</td>
                                                                    <td className="text-center text-nowrap py-2">
                                                                        <div className="d-flex justify-content-center gap-2">
                                                                            <Button variant="warning" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => abrirModalEmp(e)} disabled={actualizando} title="Editar Empleado">
                                                                                <FontAwesomeIcon icon={faEdit} />
                                                                            </Button>
                                                                            <Button variant="danger" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => handleEliminarEmpleado(e.id_emp)} disabled={actualizando} title="Eliminar Empleado">
                                                                                <FontAwesomeIcon icon={faTrash} />
                                                                            </Button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                </Tab.Pane>

                                <Tab.Pane eventKey="usuarios">
                                    <div className="d-flex justify-content-end p-3 pb-0">
                                        <Button variant="success" size="sm" className="fw-bold shadow-sm px-3" onClick={() => abrirModalUsuario()} disabled={actualizando}>
                                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Usuario
                                        </Button>
                                    </div>
                                    <div className="p-3">
                                        <div className="border rounded bg-white shadow-sm overflow-auto">
                                            <Table hover className="align-middle mb-0 custom-table" size="sm" style={{ minWidth: '700px' }}>
                                                <thead className="table-dark sticky-top">
                                                    <tr>
                                                        <th className="text-nowrap ps-3 py-3">Usuario</th>
                                                        <th className="text-nowrap py-3">Empleado</th>
                                                        <th className="text-nowrap text-center py-3">Rol</th>
                                                        <th className="d-none d-md-table-cell text-center text-nowrap py-3">Estatus</th>
                                                        <th className="text-center text-nowrap py-3" style={{ width: '120px' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.usuarios.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" className="text-center py-5 text-muted bg-light">
                                                                <FontAwesomeIcon icon={faUsersGear} size="4x" className="mb-3 opacity-25" /><br />
                                                                <h5 className="fw-bold text-secondary">Sin registros</h5>
                                                                <p className="mb-0">No hay usuarios con acceso al sistema.</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        data.usuarios?.map(u => (
                                                            <tr key={u.id_usu}>
                                                                <td className="text-nowrap ps-3 py-2 fw-bold text-primary">{u.usuario}</td>
                                                                <td className="text-nowrap py-2">{u.nombre_empleado}</td>
                                                                <td className="text-nowrap text-center py-2">
                                                                    <Badge bg="secondary" className="px-3 py-2 shadow-sm rounded-pill fw-medium">{u.nom_rol}</Badge>
                                                                </td>
                                                                <td className="d-none d-md-table-cell text-center text-nowrap py-2">
                                                                    <Badge bg={u.estatus === 'Activo' ? 'success' : 'danger'} className="px-3 py-2 shadow-sm rounded-pill fw-medium">{u.estatus}</Badge>
                                                                </td>
                                                                <td className="text-center text-nowrap py-2">
                                                                    <div className="d-flex justify-content-center gap-2">
                                                                        <Button variant="warning" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => abrirModalUsuario(u)} disabled={actualizando} title="Editar Usuario">
                                                                            <FontAwesomeIcon icon={faEdit} />
                                                                        </Button>
                                                                        <Button variant="danger" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => handleEliminarUsuario(u.id_usu)} disabled={actualizando} title="Eliminar Usuario">
                                                                            <FontAwesomeIcon icon={faTrash} />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                </Tab.Pane>

                                <Tab.Pane eventKey="categorias">
                                    <div className="d-flex justify-content-end p-3 pb-0">
                                        <Button variant="success" size="sm" className="fw-bold shadow-sm px-3" onClick={() => abrirModalCat()} disabled={actualizando}>
                                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nueva Categoría
                                        </Button>
                                    </div>
                                    <div className="p-3">
                                        <div className="border rounded bg-white shadow-sm overflow-auto">
                                            <Table hover className="align-middle mb-0 custom-table" size="sm" style={{ minWidth: '500px' }}>
                                                <thead className="table-dark sticky-top">
                                                    <tr>
                                                        <th className="text-nowrap ps-3 py-3">Nombre</th>
                                                        <th className="text-nowrap py-3">Margen (%)</th>
                                                        <th className="text-center text-nowrap py-3" style={{ width: '120px' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.categorias.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="3" className="text-center py-5 text-muted bg-light">
                                                                <FontAwesomeIcon icon={faPercent} size="4x" className="mb-3 opacity-25" /><br />
                                                                <h5 className="fw-bold text-secondary">Sin registros</h5>
                                                                <p className="mb-0">No hay categorías registradas.</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        data.categorias?.map(c => (
                                                            <tr key={c.id_categ}>
                                                                <td className="text-nowrap ps-3 py-2 fw-medium text-dark">{c.descrip_categ}</td>
                                                                <td className="text-nowrap py-2">
                                                                    <Badge bg="info" className="px-3 py-2 shadow-sm rounded-pill fw-medium text-dark">
                                                                        {c.margen_ganancia_defecto ? `${c.margen_ganancia_defecto}%` : 'No asignado'}
                                                                    </Badge>
                                                                </td>
                                                                <td className="text-center text-nowrap py-2">
                                                                    <div className="d-flex justify-content-center gap-2">
                                                                        <Button variant="warning" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => abrirModalCat(c)} disabled={actualizando} title="Editar Categoría">
                                                                            <FontAwesomeIcon icon={faEdit} />
                                                                        </Button>
                                                                        <Button variant="danger" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => handleEliminarCategoria(c.id_categ)} disabled={actualizando} title="Eliminar Categoría">
                                                                            <FontAwesomeIcon icon={faTrash} />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                </Tab.Pane>

                                <Tab.Pane eventKey="metodos">
                                    <div className="d-flex justify-content-end p-3 pb-0">
                                        <Button variant="success" size="sm" className="fw-bold shadow-sm px-3" onClick={() => abrirModalMetodo()} disabled={actualizando}>
                                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Método
                                        </Button>
                                    </div>
                                    <div className="p-3">
                                        <div className="border rounded bg-white shadow-sm overflow-auto">
                                            <Table hover className="align-middle mb-0 custom-table" size="sm" style={{ minWidth: '500px' }}>
                                                <thead className="table-dark sticky-top">
                                                    <tr>
                                                        <th className="text-nowrap ps-3 py-3">Descripción</th>
                                                        <th className="text-nowrap py-3">Moneda</th>
                                                        <th className="text-center text-nowrap py-3" style={{ width: '120px' }}>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.metodosPago.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="3" className="text-center py-5 text-muted bg-light">
                                                                <FontAwesomeIcon icon={faCreditCard} size="4x" className="mb-3 opacity-25" /><br />
                                                                <h5 className="fw-bold text-secondary">Sin registros</h5>
                                                                <p className="mb-0">No hay métodos registrados.</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        data.metodosPago?.map(m => (
                                                            <tr key={m.id_metodo}>
                                                                <td className="text-nowrap ps-3 py-2 fw-medium text-dark">{m.descripcion}</td>
                                                                <td className="text-nowrap py-2">
                                                                    <Badge bg="secondary" className="px-3 py-2 shadow-sm rounded-pill fw-medium">{m.moneda}</Badge>
                                                                </td>
                                                                <td className="text-center text-nowrap py-2">
                                                                    <div className="d-flex justify-content-center gap-2">
                                                                        <Button variant="warning" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => abrirModalMetodo(m)} disabled={actualizando} title="Editar Método">
                                                                            <FontAwesomeIcon icon={faEdit} />
                                                                        </Button>
                                                                        <Button variant="danger" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => handleEliminarMetodo(m.id_metodo)} disabled={actualizando} title="Eliminar Método">
                                                                            <FontAwesomeIcon icon={faTrash} />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                </Tab.Pane>

                                <Tab.Pane eventKey="base_datos">
                                    <div className="p-3 p-md-4">
                                        <Row className="g-4">
                                            <Col xs={12} md={6}>
                                                <Card className="border-0 shadow-sm h-100 border-start border-primary border-4 hover-elevate">
                                                    <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center py-4 py-md-5">
                                                        <FontAwesomeIcon icon={faDownload} size="3x" className="text-primary mb-3" />
                                                        <h5 className="fw-bold text-dark mb-2">Exportar Base de Datos</h5>
                                                        <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Descarga una copia manual de toda la información actual del sistema (.SQL).</p>
                                                        <Button variant="primary" className="fw-bold w-100 w-md-auto px-4 shadow-sm rounded-pill" onClick={handleDescargarRespaldo}>
                                                            <FontAwesomeIcon icon={faDatabase} className="me-2" /> Descargar
                                                        </Button>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col xs={12} md={6}>
                                                <Card className="border-0 shadow-sm h-100 border-start border-success border-4 hover-elevate">
                                                    <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center py-4 py-md-5">
                                                        <FontAwesomeIcon icon={faCloudUploadAlt} size="3x" className={respaldoDriveActivo ? "text-success mb-3" : "text-secondary mb-3"} />
                                                        <h5 className="fw-bold text-dark mb-2">Respaldo Automático Nube</h5>
                                                        <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Sincronización hacia Google Drive para evitar pérdida de datos.</p>
                                                        <Form.Check 
                                                            type="switch" 
                                                            id="drive-switch" 
                                                            label={<span className="fw-bold fs-5">{respaldoDriveActivo ? 'ACTIVADO' : 'DESACTIVADO'}</span>} 
                                                            checked={respaldoDriveActivo} 
                                                            onChange={toggleRespaldoDrive} 
                                                            className={respaldoDriveActivo ? "text-success" : "text-muted"} 
                                                        />
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        </Row>
                                    </div>
                                </Tab.Pane>

                                <Tab.Pane eventKey="permisos">
                                    <div className="p-3 p-md-4">
                                        <Card className="border-0 bg-light shadow-sm mb-4 hover-elevate">
                                            <Card.Body className="p-3">
                                                <Form.Group>
                                                    <Form.Label className="fw-bold text-secondary mb-2">Seleccionar usuario para gestionar permisos:</Form.Label>
                                                    <Form.Select
                                                        size="lg"
                                                        value={userForPerms}
                                                        onChange={e => setUserForPerms(Number(e.target.value))}
                                                        className="shadow-sm border-primary fw-medium"
                                                    >
                                                        <option value="">-- Selecciona un usuario de la lista --</option>
                                                        {data.usuarios.map(u => (
                                                            <option key={u.id_usu} value={u.id_usu}>
                                                                {u.usuario} - {u.nombre_empleado} ({u.nom_rol})
                                                            </option>
                                                        ))}
                                                    </Form.Select>
                                                </Form.Group>
                                            </Card.Body>
                                        </Card>

                                        {userForPerms ? (
                                            <div className="border rounded bg-white shadow-sm overflow-auto hover-elevate">
                                                <Table hover size="sm" className="align-middle mb-0 custom-table text-center" style={{ minWidth: '500px' }}>
                                                    <thead className="table-dark sticky-top">
                                                        <tr>
                                                            <th className="text-start ps-4 py-3">Funcionalidad / Módulo del Sistema</th>
                                                            <th className="py-3" style={{ width: '180px' }}>Acceso Permitido</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.permisos.map(p => {
                                                            const tienePermiso = data.mapeo.some(m => m.id_usu === userForPerms && m.id_permiso === p.id_permiso);
                                                            const esSuperAdmin = data.usuarios.find(u => u.id_usu === userForPerms)?.rol_usu === 1;

                                                            return (
                                                                <tr key={p.id_permiso} className={esSuperAdmin ? 'bg-light' : ''}>
                                                                    <td className="text-start ps-4 py-3 border-end">
                                                                        <div className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>{p.descripcion}</div>
                                                                        <small className="text-muted font-monospace">{p.cod_permiso}</small>
                                                                    </td>
                                                                    <td className="py-3">
                                                                        <Form.Check
                                                                            type="switch"
                                                                            checked={esSuperAdmin ? true : tienePermiso}
                                                                            onChange={() => togglePermiso(userForPerms, p.id_permiso)}
                                                                            disabled={esSuperAdmin || actualizando}
                                                                            className="d-inline-block m-0 fs-5"
                                                                            title={esSuperAdmin ? "Los Super Administradores tienen todos los permisos" : "Alternar permiso"}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-5 text-muted border rounded bg-white shadow-sm hover-elevate">
                                                <FontAwesomeIcon icon={faLockOpen} size="4x" className="mb-3 opacity-25" />
                                                <h5 className="fw-bold text-secondary mt-3">Control de Accesos</h5>
                                                <p className="mb-0">Selecciona un usuario en el menú superior para comenzar a asignar o revocar permisos.</p>
                                            </div>
                                        )}
                                    </div>
                                </Tab.Pane>

                                <Tab.Pane eventKey="bitacora">
                                    <div className="d-flex justify-content-end p-2 p-md-3 pb-0">
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            className="fw-bold shadow-sm w-100 w-md-auto rounded-pill"
                                            onClick={handleLimpiarBitacora}
                                            disabled={data.bitacora.length === 0 || actualizando}
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="me-1" /> Limpiar Historial
                                        </Button>
                                    </div>
                                    <div className="p-2 p-md-3 pt-2">
                                        <div className="border rounded bg-white shadow-sm overflow-auto">
                                            <Table striped hover responsive size="sm" className="align-middle custom-table text-center mb-0">
                                                <thead className="table-dark sticky-top shadow-sm">
                                                    <tr>
                                                        <th className="text-start ps-3 py-3">Fecha/Hora</th>
                                                        <th className="py-3">Usuario</th>
                                                        <th className="d-none d-md-table-cell py-3">Acción</th>
                                                        <th className="d-none d-sm-table-cell py-3">Módulo</th>
                                                        <th className="text-start py-3">Descripción</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.bitacora.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="5" className="text-center py-5 text-muted">
                                                                <FontAwesomeIcon icon={faHistory} size="3x" className="mb-3 opacity-25" /><br />
                                                                No hay registros en el historial reciente.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        data.bitacora.map(log => (
                                                            <tr key={log.id_log}>
                                                                <td className="text-start ps-3 text-muted" style={{ fontSize: '0.85rem' }}>{new Date(log.fecha).toLocaleString()}</td>
                                                                <td className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>{log.usuario}</td>
                                                                <td className="d-none d-md-table-cell">
                                                                    <Badge bg="primary" className="px-3 py-1 shadow-sm rounded-pill fw-medium">{log.accion}</Badge>
                                                                </td>
                                                                <td className="fw-bold text-secondary d-none d-sm-table-cell" style={{ fontSize: '0.85rem' }}>{log.modulo}</td>
                                                                <td className="text-start text-muted" style={{ fontSize: '0.85rem' }}>
                                                                    <span className="d-md-none fw-bold text-primary me-1">[{log.accion}]</span>
                                                                    {log.descripcion}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>
                                </Tab.Pane>

                            </Tab.Content>
                        </Tab.Container>
                    )}
                </Card.Body>
            </Card>

            <UsuarioModal show={showUserModal} onHide={() => setShowUserModal(false)} usuarioAEditar={usuarioEditando} empleados={data.empleados} roles={data.roles} sucursales={data.sucursales} onGuardado={() => cargarTodo(true)} />
            <EmpleadoModal show={showEmpModal} onHide={() => setShowEmpModal(false)} empleadoAEditar={empleadoEditando} nacionalidades={nacionalidades} prefijos={prefijos} onGuardado={() => cargarTodo(true)} />
            <SucursalModal show={showSucModal} onHide={() => setShowSucModal(false)} sucursalAEditar={sucursalEditando} onGuardado={() => cargarTodo(true)} />
            <CategoriaModal show={showCatModal} onHide={() => setShowCatModal(false)} categoriaAEditar={categoriaEditando} onGuardado={() => cargarTodo(true)} />
            <MetodoModal show={showMetodoModal} onHide={() => setShowMetodoModal(false)} metodoAEditar={metodoEditando} onGuardado={() => cargarTodo(true)} />
            
        </Container>
    );
}