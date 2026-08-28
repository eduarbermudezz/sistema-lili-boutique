import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Row, Col, Table, Alert, Form, Card, InputGroup } from 'react-bootstrap';
import Button from '@/components/buttons/button.jsx';
import Modal from '@/components/modals/provider-modal';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUsers, faPlus, faSearch, faEdit, faTrash, faAddressBook, 
    faExclamationTriangle, faXmark
} from '@fortawesome/free-solid-svg-icons';

import { useMessage } from '@/context/MessageContext.jsx';
import Loader from '@/components/loader/loader.jsx';

export default function TableProvider() {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [proveedores, setProveedores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [inicializando, setInicializando] = useState(true);
    const [error, setError] = useState(null);

    const [busqueda, setBusqueda] = useState('');
    const buscadorRef = useRef(null);

    const [proveedorEditando, setProveedorEditando] = useState(null);

    const { showMessage, showConfirm } = useMessage();

    const obtenerProveedores = async (reintentar = false) => {
        if (reintentar) {
            setError(null);
            setInicializando(true);
        }
        setCargando(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const respuesta = await axios.get(`${apiUrl}/api/proveedores`);
            const proveedoresReales = Array.isArray(respuesta.data) ? respuesta.data : [];
            setProveedores(proveedoresReales);
        } catch (error) {
            console.error("Error en la petición:", error);
            setError(error.response?.data?.message || error.message);
        } finally {
            setInicializando(false);
            setCargando(false);
        }
    };

    useEffect(() => {
        obtenerProveedores();
    }, []);

    const agregarProveedorALista = () => {
        obtenerProveedores();
        showMessage('Proveedor registrado exitosamente.', 'success');
    };

    const actualizarProveedorEnLista = () => {
        obtenerProveedores();
        showMessage('Proveedor actualizado exitosamente.', 'success');
    };

    const proveedoresFiltrados = useMemo(() => {
        const termino = busqueda.toLowerCase().trim();
        let resultado = proveedores;

        if (termino) {
            resultado = proveedores.filter((proveedor) => {
                const nombre = proveedor.nombre ? String(proveedor.nombre).toLowerCase() : '';
                return nombre.includes(termino);
            });
        }

        return resultado.slice(0, 50);
    }, [proveedores, busqueda]);

    const handleEditar = (id) => {
        const proveedorSeleccionado = proveedores.find((proveedor) => proveedor.id_prov === id);
        setProveedorEditando(proveedorSeleccionado);
        handleShow();
    };

    const handleAgregarNuevo = () => {
        setProveedorEditando(null);
        handleShow();
    };

    const handleEliminar = async (id) => {
        const confirmar = await showConfirm(
            "¿Estás seguro de que deseas eliminar este proveedor del sistema?",
            "🗑️ Eliminar Proveedor"
        );

        if (confirmar) {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                await axios.delete(`${apiUrl}/api/proveedores/${id}`);
                setProveedores(proveedores.filter((proveedor) => proveedor.id_prov !== id));
                showMessage('Proveedor eliminado exitosamente.', 'success');
            } catch (error) {
                const mensajeError = error.response?.data?.message || 'Error al eliminar el proveedor.';
                showMessage(mensajeError, 'danger');
            }
        }
    };

    return (
        <>
            <Container fluid className="p-2 p-md-3 d-flex flex-column flex-grow-1 alto-fijo-pc" style={{ minHeight: 0 }}>
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2" style={{ flexShrink: 0 }}>
                    <h4 className="text-primary fw-bold mb-0">
                        <FontAwesomeIcon icon={faUsers} className="me-2" />
                        Directorio de Proveedores
                    </h4>

                    <div>
                        <Button
                            variant="success"
                            onClick={handleAgregarNuevo}
                            className="fw-bold shadow-sm w-100"
                            disabled={inicializando}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Proveedor
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                    <Card.Body className="d-flex flex-column p-3 p-md-4 h-100" style={{ minHeight: 0 }}>
                        {error ? (
                            <Alert variant="danger" className="text-center py-5 shadow-sm border-0 bg-light text-danger m-auto w-100">
                                <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="mb-3" />
                                <h4 className="fw-bold">Error al cargar proveedores</h4>
                                <p>{error}</p>
                                <Button variant="outline-danger" onClick={() => obtenerProveedores(true)} className="mt-2">
                                    Reintentar
                                </Button>
                            </Alert>
                        ) : inicializando ? (
                            <div className="text-center py-5 m-auto">
                                <Loader texto="Cargando directorio de proveedores..." />
                            </div>
                        ) : (
                            <>
                                <Row className="mb-4" style={{ flexShrink: 0 }}>
                                    <Col xs={12} md={10} lg={8}>
                                        <Form.Label className="fw-bold text-secondary">Buscar en el Directorio</Form.Label>
                                        <InputGroup size="lg" className="shadow-sm">
                                            <Form.Control
                                                type="text"
                                                placeholder={"🔍 Buscar por Nombre..."}
                                                value={busqueda}
                                                onChange={(e) => setBusqueda(e.target.value)}
                                                disabled={cargando}
                                                className="fs-6 border-primary"
                                                ref={buscadorRef}
                                                onPaste={(e) => e.preventDefault()}
                                                onCopy={(e) => e.preventDefault()}
                                                onCut={(e) => e.preventDefault()}
                                            />
                                            {!busqueda ? (
                                                <Button variant="primary" disabled={cargando} style={{ pointerEvents: 'none' }}>
                                                    <FontAwesomeIcon icon={faSearch} />
                                                </Button>
                                            ) : (
                                                <Button variant="danger" onClick={() => { setBusqueda(''); buscadorRef.current?.focus(); }}>
                                                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Limpiar
                                                </Button>
                                            )}
                                        </InputGroup>
                                    </Col>
                                </Row>

                                <div className="flex-grow-1 border rounded bg-white shadow-sm" style={{ overflow: 'auto', minHeight: 0 }}>
                                    <Table hover className="align-middle mb-0 custom-table" size="sm" style={{ minWidth: '600px' }}>
                                        <thead className="table-dark sticky-top" style={{ zIndex: 1 }}>
                                            <tr>
                                                <th className="text-nowrap ps-3 py-3">Nombre</th>
                                                <th className="text-center text-nowrap py-3" style={{ width: '120px' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {proveedoresFiltrados.length === 0 ? (
                                                <tr>
                                                    <td colSpan="2" className="text-center py-5 text-muted bg-light">
                                                        <FontAwesomeIcon icon={faAddressBook} size="4x" className="mb-3 opacity-25" /><br />
                                                        <h5 className="fw-bold text-secondary">Sin resultados</h5>
                                                        <p className="mb-0">No se encontraron proveedores que coincidan con "{busqueda}".</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                proveedoresFiltrados.map((proveedor) => (
                                                    <tr key={proveedor.id_prov}>
                                                        <td className="text-nowrap ps-3 py-2" style={{ fontSize: '0.95rem' }}>
                                                            {proveedor.nombre}
                                                        </td>
                                                        <td className="text-center text-nowrap py-2">
                                                            <div className="d-flex justify-content-center gap-2">
                                                                <Button
                                                                    variant="warning"
                                                                    size="sm"
                                                                    className="fw-bold p-1 px-3 shadow-sm"
                                                                    onClick={() => handleEditar(proveedor.id_prov)}
                                                                    title="Editar proveedor"
                                                                >
                                                                    <FontAwesomeIcon icon={faEdit} />
                                                                </Button>
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    className="fw-bold p-1 px-3 shadow-sm"
                                                                    onClick={() => handleEliminar(proveedor.id_prov)}
                                                                    title="Eliminar proveedor"
                                                                >
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
                            </>
                        )} 
                    </Card.Body>
                </Card>
            </Container>

            <Modal
                show={show}
                onHide={handleClose}
                onProviderAdded={agregarProveedorALista}
                onProviderUpdated={actualizarProveedorEnLista}
                proveedorAEditar={proveedorEditando}
            />
        </>
    );
}