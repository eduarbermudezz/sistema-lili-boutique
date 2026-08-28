import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Row, Col, Table, Alert, Form, Card, InputGroup, Badge } from 'react-bootstrap';
import Button from '@/components/buttons/button.jsx';
import Modal from '@/components/modals/product-modal.jsx';
import PrintModal from '@/components/modals/print-modal.jsx';
import axios from 'axios';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBoxesStacked, faPlus, faSearch, faEdit, faTrash,
    faBarcode, faXmark, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

import { useMessage } from '@/context/MessageContext.jsx';
import Loader from '@/components/loader/loader.jsx';
import { Currency } from '@/utils/Currency.js';

export default function TableProduct() {
    const [show, setShow] = useState(false);
    const [productoAEditar, setProductoAEditar] = useState(null);

    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const buscadorRef = useRef(null);

    const [codigoEscaneadoParaModal, setCodigoEscaneadoParaModal] = useState('');
    const [mostrarEnBs, setMostrarEnBs] = useState(true);
    const [tasaBcv, setTasaBcv] = useState(1);

    const [showModalEtiqueta, setShowModalEtiqueta] = useState(false);
    const [prodParaEtiqueta, setProdParaEtiqueta] = useState(null);

    const { showMessage, showConfirm } = useMessage();

    const cargarDatosIniciales = async (reintentar = false) => {
        if (reintentar) setError(null);
        try {
            setCargando(true);
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const [resProductos, resConfig] = await Promise.all([
                axios.get(`${apiUrl}/api/productos`),
                axios.get(`${apiUrl}/api/configuracion`)
            ]);
            setProductos(resProductos.data);
            setTasaBcv(Number(resConfig.data.tasa_bcv) || 36.50);
        } catch (error) {
            setError(error.response?.data?.message || error.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargarDatosIniciales(); }, []);

    const bufferEscaneo = useRef('');
    const timerEscaneo = useRef(null);
    const accionEscaneoRef = useRef();

    useEffect(() => {
        accionEscaneoRef.current = (codigo) => {
            setBusqueda(codigo);
        };
    });

    useEffect(() => {
        const manejarEscaneoFondo = (e) => {
            if (show || showModalEtiqueta) return;

            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'textarea' || activeTag === 'select') return;

            if (e.key === 'Enter') {
                if (bufferEscaneo.current.length >= 3) {
                    e.preventDefault();
                    const codigoEscaneado = bufferEscaneo.current;

                    const activeEl = document.activeElement;
                    if (activeEl && activeEl.tagName === 'INPUT' && activeEl.id !== 'buscador_principal') {
                        let valActual = activeEl.value;
                        if (valActual.endsWith(codigoEscaneado)) {
                            const valorLimpio = valActual.slice(0, -codigoEscaneado.length);
                            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                            if (nativeSetter) {
                                nativeSetter.call(activeEl, valorLimpio);
                                activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }
                    }
                    accionEscaneoRef.current(codigoEscaneado);
                }
                bufferEscaneo.current = '';
                if (timerEscaneo.current) clearTimeout(timerEscaneo.current);
                return;
            }

            if (e.key.length === 1) {
                bufferEscaneo.current += e.key;
                if (timerEscaneo.current) clearTimeout(timerEscaneo.current);
                timerEscaneo.current = setTimeout(() => {
                    bufferEscaneo.current = '';
                }, 150);
            }
        };

        window.addEventListener('keydown', manejarEscaneoFondo);
        return () => {
            window.removeEventListener('keydown', manejarEscaneoFondo);
            if (timerEscaneo.current) clearTimeout(timerEscaneo.current);
        };
    }, [show, showModalEtiqueta]);

    const handleClose = () => { setShow(false); setProductoAEditar(null); };
    const handleAgregarNuevo = () => { setProductoAEditar(null); setShow(true); };

    const cargarSoloProductos = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const respuesta = await axios.get(`${apiUrl}/api/productos`);
            if (respuesta.status === 200) setProductos(respuesta.data);
        } catch (error) { console.error("Error recargando tabla:", error); }
    };

    const agregarProductoALista = () => { cargarSoloProductos(); showMessage('Artículo registrado exitosamente.', 'success'); };
    const actualizarProductoEnLista = () => { cargarSoloProductos(); showMessage('Artículo actualizado exitosamente.', 'success'); };

    const productosFiltrados = useMemo(() => {
        const termino = busqueda.toLowerCase().trim();
        let resultado = productos;

        if (termino) {
            resultado = productos.filter((producto) => {
                const nombre = producto.nombre_base ? String(producto.nombre_base).toLowerCase() : '';
                const categoria = producto.categoria ? String(producto.categoria).toLowerCase() : '';
                const skus = producto.codigos_sku ? String(producto.codigos_sku).toLowerCase() : '';
                return nombre.includes(termino) || skus.includes(termino) || categoria.includes(termino);
            });
        }

        return resultado.slice(0, 50);
    }, [productos, busqueda]);

    const handleEditar = (id) => {
        const prod = productos.find(p => p.id_prod === id);
        setProductoAEditar(prod);
        setShow(true);
    };

    const handleEliminar = async (id) => {
        const confirmar = await showConfirm("¿Estás seguro de que deseas eliminar este artículo y todas sus variantes?", "🗑️ Eliminar Artículo");
        if (confirmar) {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                await axios.delete(`${apiUrl}/api/productos/${id}`);
                setProductos(productos.filter((producto) => producto.id_prod !== id));
                showMessage('Artículo eliminado exitosamente.', 'success');
            } catch (error) {
                showMessage(error.response?.data?.message || 'Problema al eliminar en el servidor.', 'danger');
            }
        }
    };

    const abrirModalEtiqueta = (producto) => {
        setProdParaEtiqueta(producto);
        setShowModalEtiqueta(true);
    };

    return (
        <>
            <Container fluid className="p-2 p-md-3 d-flex flex-column flex-grow-1 alto-fijo-pc" style={{ minHeight: 0 }}>
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-3 gap-2" style={{ flexShrink: 0 }}>
                    <h4 className="text-primary fw-bold mb-0">
                        <FontAwesomeIcon icon={faBoxesStacked} className="me-2" />
                        Inventario de Tienda
                    </h4>

                    <div className="d-flex flex-column flex-md-row align-items-md-center gap-2 mt-2 mt-lg-0 w-100" style={{ maxWidth: '100%', width: 'auto' }}>
                        <Card className="p-2 bg-light border-0 shadow-sm mb-0 flex-grow-1 flex-md-grow-0 w-100 w-md-auto">
                            <div className="d-flex align-items-center justify-content-between gap-3">
                                <span className="badge bg-secondary py-2 px-3 fs-6 text-nowrap">
                                    {cargando ? 'Cargando tasa...' : `Tasa: ${tasaBcv} Bs`}
                                </span>
                                <Form.Check
                                    type="switch"
                                    id="moneda-switch"
                                    label={<span className="fw-bold text-secondary small text-nowrap">{mostrarEnBs ? 'Bs' : 'USD'}</span>}
                                    checked={mostrarEnBs}
                                    onChange={(e) => setMostrarEnBs(e.target.checked)}
                                    className="mb-0"
                                    disabled={cargando}
                                />
                            </div>
                        </Card>
                        <Button
                            variant="success"
                            onClick={handleAgregarNuevo}
                            className="fw-bold shadow-sm w-100 w-md-auto px-4"
                            disabled={cargando}
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Artículo
                        </Button>
                    </div>
                </div>

                <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                    <Card.Body className="d-flex flex-column p-3 p-md-4 h-100" style={{ minHeight: 0 }}>
                        {error ? (
                            <Alert variant="danger" className="text-center py-5 shadow-sm border-0 bg-light text-danger m-auto w-100">
                                <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="mb-3" />
                                <h4 className="fw-bold">Error al cargar inventario</h4>
                                <p>{error}</p>
                                <Button variant="outline-danger" onClick={() => cargarDatosIniciales(true)} className="mt-2">
                                    Reintentar
                                </Button>
                            </Alert>
                        ) : cargando ? (
                            <div className="text-center py-5 m-auto">
                                <Loader texto="Sincronizando inventario..." />
                            </div>
                        ) : (
                            <>
                                <Row className="mb-4" style={{ flexShrink: 0 }}>
                                    <Col xs={12} md={10} lg={8}>
                                        <Form.Label className="fw-bold text-secondary">Buscar en el Inventario</Form.Label>
                                        <InputGroup size="lg" className="shadow-sm">
                                            <Form.Control
                                                type="text"
                                                placeholder="🔍 Buscar por nombre, código o categoría..."
                                                className="fs-6 border-primary"
                                                value={busqueda}
                                                onChange={(e) => setBusqueda(e.target.value)}
                                                ref={buscadorRef}
                                                id="buscador_principal"
                                                onFocus={(e) => e.target.select()}
                                            />
                                            {!busqueda ? (
                                                <Button variant="primary" disabled style={{ pointerEvents: 'none' }}>
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
                                    <Table hover className="align-middle custom-table mb-0" size="sm" style={{ minWidth: '700px' }}>
                                        <thead className="table-dark sticky-top shadow-sm" style={{ zIndex: 1 }}>
                                            <tr>
                                                <th className="text-nowrap ps-3 py-3">Prenda / Artículo</th>
                                                <th className="d-none d-md-table-cell text-nowrap py-3">Categoría</th>
                                                <th className="text-center text-nowrap py-3" style={{ width: '100px' }}>Total Pzas.</th>
                                                <th className="text-end text-nowrap py-3">Tallas, Colores y Precios</th>
                                                <th className="text-center text-nowrap py-3" style={{ width: '140px' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productosFiltrados.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5 text-muted bg-light">
                                                        <FontAwesomeIcon icon={faBoxesStacked} size="4x" className="mb-3 opacity-25" /><br />
                                                        <h5 className="fw-bold text-secondary">Sin resultados</h5>
                                                        <p className="mb-0">No se encontraron artículos que coincidan con "{busqueda}".</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                productosFiltrados.map((producto) => {
                                                    const factor = mostrarEnBs ? tasaBcv : 1;
                                                    return (
                                                        <tr key={producto.id_prod}>
                                                            <td className="fw-bold ps-3 py-2" style={{ fontSize: '0.95rem' }}>
                                                                {producto.nombre_base}
                                                                <div className="d-md-none text-muted fw-normal mt-1" style={{ fontSize: '0.75rem' }}>{producto.categoria || 'Sin Categoría'}</div>
                                                            </td>
                                                            <td className="d-none d-md-table-cell py-2">
                                                                <span className="badge bg-light text-dark border">{producto.categoria || 'Sin Categoría'}</span>
                                                            </td>
                                                            <td className="text-center fw-bold text-primary py-2" style={{ fontSize: '1rem' }}>
                                                                {producto.stock_total_sucursal || 0}
                                                                <div className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Piezas</div>
                                                            </td>
                                                            <td className="text-end fw-bold py-2">
                                                                {typeof producto.lista_variantes === 'string' ? (
                                                                    producto.lista_variantes.split('||').map((varStr, idx) => {
                                                                        const partes = varStr.split('::');
                                                                        const tallaVal = partes[1];
                                                                        const colorVal = partes[2];
                                                                        const precioUsd = Number(partes[3]) || 0;
                                                                        const stock = Number(partes[4]) || 0;
                                                                        const precioFinal = Currency.formatear(Currency.multiplicar(precioUsd, factor), '').trim();
                                                                        const mostrarTalla = tallaVal && tallaVal !== 'N/A' && tallaVal.trim() !== '';
                                                                        const mostrarColor = colorVal && colorVal !== 'N/A' && colorVal.trim() !== '';

                                                                        return (
                                                                            <div key={idx} className="d-flex justify-content-between align-items-center border-bottom border-light pb-1 mb-1">
                                                                                <div className="text-start text-nowrap">
                                                                                    {mostrarTalla && <Badge bg="info" className="me-1 text-dark">{tallaVal}</Badge>}
                                                                                    {mostrarColor && <Badge bg="secondary" className="me-2">{colorVal}</Badge>}
                                                                                    {!mostrarTalla && !mostrarColor && <Badge bg="light" text="dark" className="me-2 border">Estándar</Badge>}
                                                                                    <Badge bg={stock > 0 ? "success" : "danger"} className="shadow-sm">Stock: {stock}</Badge>
                                                                                </div>
                                                                                <div className="text-success ms-2 text-nowrap">{mostrarEnBs ? 'Bs' : '$'} {precioFinal}</div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : (<span className="text-muted small">Sin variantes registradas</span>)}
                                                            </td>
                                                            <td className="text-center text-nowrap py-2">
                                                                <div className="d-flex justify-content-center gap-2">
                                                                    <Button variant="info" size="sm" className="fw-bold p-1 px-3 text-white shadow-sm" onClick={() => abrirModalEtiqueta(producto)} title="Imprimir Etiqueta">
                                                                        <FontAwesomeIcon icon={faBarcode} />
                                                                    </Button>
                                                                    <Button variant="warning" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => handleEditar(producto.id_prod)} title="Editar Producto">
                                                                        <FontAwesomeIcon icon={faEdit} />
                                                                    </Button>
                                                                    <Button variant="danger" size="sm" className="fw-bold p-1 px-3 shadow-sm" onClick={() => handleEliminar(producto.id_prod)} title="Eliminar Producto">
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
                            </>
                        )}
                    </Card.Body>
                </Card>
            </Container>

            <Modal 
                show={show} 
                onHide={handleClose} 
                onProductAdded={agregarProductoALista} 
                onProductUpdated={actualizarProductoEnLista} 
                productoAEditar={productoAEditar} 
                codigoEscaneado={codigoEscaneadoParaModal} 
                limpiarCodigoEscaneado={() => setCodigoEscaneadoParaModal('')} 
                tasaBcv={tasaBcv} 
            />

            <PrintModal 
                show={showModalEtiqueta} 
                onHide={() => setShowModalEtiqueta(false)} 
                producto={prodParaEtiqueta} 
            />
        </>
    );
}