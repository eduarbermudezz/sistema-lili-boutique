import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Table, InputGroup, Badge } from 'react-bootstrap';
import Button from '@/components/buttons/button.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faBoxOpen, faTruckLoading, faSearch } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';
import Loader from '@/components/loader/loader.jsx';
import { Currency } from '@/utils/Currency.js';
import VariantSelectionModal from '@/components/modals/variant-selection-modal.jsx';

export default function Entradas() {
    const [carrito, setCarrito] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [tasaBcv, setTasaBcv] = useState(1);
    const [cargando, setCargando] = useState(true);

    const [idProveedor, setIdProveedor] = useState('');
    const [proveedores, setProveedores] = useState([]);

    const [procesando, setProcesando] = useState(false);
    const [moneda, setMoneda] = useState('USD');

    const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
    const [showModalResultados, setShowModalResultados] = useState(false);

    const buscadorRef = useRef(null);
    const { showMessage } = useMessage();

    useEffect(() => {
        const cargarDatosIniciales = async () => {
            setCargando(true);
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

                const resConfig = await axios.get(`${apiUrl}/api/configuracion`);
                if (resConfig.data && resConfig.data.tasa_bcv) setTasaBcv(Number(resConfig.data.tasa_bcv));

                const resProv = await axios.get(`${apiUrl}/api/proveedores`);
                setProveedores(Array.isArray(resProv.data) ? resProv.data : []);

            } catch (error) {
                console.error("Error cargando configuracion inicial:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarDatosIniciales();
        buscadorRef.current?.focus();
    }, []);

    const toggleMoneda = () => setMoneda(prev => prev === 'USD' ? 'VES' : 'USD');

    const buscarProductoDirecto = async (codigoABuscar) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await axios.get(`${apiUrl}/api/productos/buscar?q=${encodeURIComponent(codigoABuscar)}`);
            const resultados = response.data;

            if (resultados && resultados.length > 0) {
                if (resultados.length === 1) procesarSeleccionProducto(resultados[0]);
                else { setResultadosBusqueda(resultados); setShowModalResultados(true); }
            } else {
                showMessage(`No se encontró el artículo: "${codigoABuscar}"`, "info");
            }
        } catch (error) { showMessage("Error de conexión al buscar.", "danger"); }
    };

    const handleBuscarProductoForm = (e) => {
        e.preventDefault();
        if (busqueda.trim() === '') return;
        buscarProductoDirecto(busqueda.trim());
    };

    const procesarSeleccionProducto = (productoReal) => {
        setShowModalResultados(false);
        agregarAlCarrito({
            id_presentacion: productoReal.id_presentacion,
            id_prod: productoReal.id_prod,
            nombre_base: productoReal.nombre_base,
            talla: productoReal.talla,
            color: productoReal.color,
            cantidad: 1,
            costo_unitario_usd: Number(productoReal.costo_usd) || 0,
            costo_total_usd: Number(productoReal.costo_usd) || 0
        });
        setBusqueda(''); buscadorRef.current?.focus();
    };

    const agregarAlCarrito = (producto) => {
        setCarrito(prev => {
            const existe = prev.find(p => p.id_presentacion === producto.id_presentacion);
            if (existe) {
                const nuevaCant = existe.cantidad + producto.cantidad;
                return prev.map(p => p.id_presentacion === producto.id_presentacion ? {
                    ...p,
                    cantidad: nuevaCant,
                    costo_total_usd: Currency.multiplicar(p.costo_unitario_usd, nuevaCant)
                } : p);
            }
            return [...prev, { ...producto }];
        });
    };

    const actualizarCantidad = (id, valorIngresado) => {
        if (valorIngresado === '') {
            setCarrito(carrito.map(item => item.id_presentacion === id ? { ...item, cantidad: 0, costo_total_usd: 0 } : item));
            return;
        }
        const cant = parseFloat(valorIngresado);
        if (isNaN(cant) || cant < 0) return;

        setCarrito(carrito.map(item => {
            if (item.id_presentacion === id) return { ...item, cantidad: cant, costo_total_usd: Currency.multiplicar(item.costo_unitario_usd, cant) };
            return item;
        }));
    };

    const actualizarCostoUnitario = (id, valorIngresado) => {
        if (valorIngresado === '') {
            setCarrito(carrito.map(item => item.id_presentacion === id ? { ...item, costo_unitario_usd: 0, costo_total_usd: 0 } : item));
            return;
        }
        const val = parseFloat(valorIngresado);
        if (isNaN(val) || val < 0) return;

        const costoU_USD = moneda === 'USD' ? val : Currency.dividir(val, tasaBcv);

        setCarrito(carrito.map(item => {
            if (item.id_presentacion === id) return { ...item, costo_unitario_usd: costoU_USD, costo_total_usd: Currency.multiplicar(costoU_USD, item.cantidad) };
            return item;
        }));
    };

    const actualizarCostoTotal = (id, valorIngresado) => {
        if (valorIngresado === '') {
            setCarrito(carrito.map(item => item.id_presentacion === id ? { ...item, costo_total_usd: 0, costo_unitario_usd: 0 } : item));
            return;
        }
        const val = parseFloat(valorIngresado);
        if (isNaN(val) || val < 0) return;

        const costoT_USD = moneda === 'USD' ? val : Currency.dividir(val, tasaBcv);

        setCarrito(carrito.map(item => {
            if (item.id_presentacion === id) {
                const costoU_USD = item.cantidad > 0 ? Currency.dividir(costoT_USD, item.cantidad) : 0;
                return { ...item, costo_total_usd: costoT_USD, costo_unitario_usd: costoU_USD };
            }
            return item;
        }));
    };

    const eliminarDelCarrito = (id) => setCarrito(carrito.filter(item => item.id_presentacion !== id));

    const totalCostoUsd = carrito.reduce((acc, item) => Currency.sumar(acc, item.costo_total_usd), 0);
    const totalCostoBs = Currency.multiplicar(totalCostoUsd, tasaBcv);

    const handleProcesarEntrada = async () => {
        if (carrito.length === 0) return showMessage("La lista de entrada está vacía.", "info");
        if (!idProveedor || idProveedor === '') return showMessage("Debes seleccionar un proveedor de mercancía.", "info");

        const hayProductosEnCero = carrito.some(item => Number(item.cantidad) <= 0);
        if (hayProductosEnCero) return showMessage("Hay variantes con cantidad 0 en la lista.", "danger");

        setProcesando(true);

        const payload = {
            id_prov: idProveedor,
            total_costo_usd: Currency.redondear(totalCostoUsd, 8),
            items: carrito.map(item => ({
                ...item,
                costo_total_usd: Currency.redondear(item.costo_total_usd, 8)
            }))
        };

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await axios.post(`${apiUrl}/api/entradas`, payload);

            if (response.status === 201) {
                showMessage(`Mercancía ingresada con éxito.`, "success");
                setCarrito([]);
                setIdProveedor('');
                if (buscadorRef.current) buscadorRef.current.focus();
            }
        } catch (error) {
            showMessage("Error al procesar la entrada.", "danger");
        } finally {
            setProcesando(false);
        }
    };

    const bufferEscaneo = useRef('');
    const timerEscaneo = useRef(null);
    const accionEscaneoRef = useRef();

    useEffect(() => {
        accionEscaneoRef.current = (codigo) => {
            setBusqueda(codigo);
            buscarProductoDirecto(codigo);
        };
    });

    useEffect(() => {
        const manejarEscaneoFondo = (e) => {
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
    }, []);

    return (
        <>
            {procesando && <Loader texto="Registrando entrada de mercancía..." pantallaCompleta={true} />}

            <Container fluid className="p-2 p-md-3 d-flex flex-column flex-grow-1 alto-fijo-pc" style={{ minHeight: 0 }}>

                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-3 gap-2" style={{ flexShrink: 0 }}>
                    <h4 className="text-primary fw-bold mb-0">
                        <FontAwesomeIcon icon={faTruckLoading} className="me-2" />
                        Recepción de Mercancía
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
                                    label={<span className="fw-bold text-secondary small text-nowrap">{moneda === 'VES' ? 'Bs' : 'USD'}</span>}
                                    checked={moneda === 'VES'}
                                    onChange={toggleMoneda}
                                    className="mb-0"
                                    disabled={cargando}
                                />
                            </div>
                        </Card>
                    </div>
                </div>

                <Row className="gx-3 flex-grow-1 pb-1" style={{ minHeight: 0 }}>
                    <Col lg={8} className="d-flex flex-column mb-3 mb-lg-0 h-100">
                        <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1" style={{ minHeight: '350px' }}>
                            <Card.Body className="d-flex flex-column p-3 p-md-4 h-100" style={{ minHeight: 0 }}>

                                <Form.Label className="fw-bold text-secondary">Buscar o Escanear Variante</Form.Label>
                                <Form onSubmit={handleBuscarProductoForm} className="mb-3" style={{ flexShrink: 0 }}>
                                    <InputGroup size="lg" className="shadow-sm">
                                        <Form.Control
                                            type="text"
                                            placeholder="🔍 Código de barras, referencia o nombre..."
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            ref={buscadorRef}
                                            className="fs-6 border-primary"
                                            id="buscador_principal"
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <Button variant="primary" type="submit" disabled={!busqueda.trim()}>
                                            <FontAwesomeIcon icon={faSearch} />
                                        </Button>
                                    </InputGroup>
                                </Form>

                                <div className="flex-grow-1 border rounded bg-white shadow-sm" style={{ overflow: 'auto', minHeight: '200px' }}>
                                    <Table hover className="align-middle custom-table mb-0" size="sm" style={{ minWidth: '600px' }}>
                                        <thead className="table-dark sticky-top shadow-sm" style={{ zIndex: 1 }}>
                                            <tr>
                                                <th className="ps-3 py-3">Variante Recibida</th>
                                                <th className="text-center py-3" style={{ width: '90px' }}>Cant.</th>
                                                <th className="text-center d-none d-md-table-cell py-3" style={{ width: '130px' }}>Unitario ({moneda === 'USD' ? '$' : 'Bs'})</th>
                                                <th className="text-center py-3" style={{ width: '130px' }}>TOTAL ({moneda === 'USD' ? '$' : 'Bs'})</th>
                                                <th className="text-center py-3" style={{ width: '60px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {carrito.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5 text-muted bg-light">
                                                        <FontAwesomeIcon icon={faBoxOpen} size="4x" className="mb-3 opacity-25" /><br />
                                                        <h5 className="fw-bold text-secondary">Lista vacía</h5>
                                                        <p className="mb-0">Aún no has agregado variantes a esta recepción.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                carrito.map((item) => {
                                                    const valUnitario = moneda === 'USD' ? Number(item.costo_unitario_usd) || 0 : Currency.multiplicar(item.costo_unitario_usd, tasaBcv);
                                                    const valTotal = moneda === 'USD' ? Number(item.costo_total_usd) || 0 : Currency.multiplicar(item.costo_total_usd, tasaBcv);

                                                    const mostrarTalla = item.talla && item.talla !== 'N/A' && item.talla.trim() !== '';
                                                    const mostrarColor = item.color && item.color !== 'N/A' && item.color.trim() !== '';

                                                    return (
                                                        <tr key={item.id_presentacion}>
                                                            <td className="fw-bold text-wrap ps-3 py-2" style={{ fontSize: '0.85rem' }}>
                                                                {item.nombre_base}
                                                                <div className="mt-1">
                                                                    {mostrarTalla && <Badge bg="info" className="me-1 text-dark">{item.talla}</Badge>}
                                                                    {mostrarColor && <Badge bg="secondary">{item.color}</Badge>}
                                                                    {!mostrarTalla && !mostrarColor && <Badge bg="light" text="dark" className="border">Estándar</Badge>}
                                                                </div>
                                                            </td>
                                                            <td className="text-center py-2">
                                                                <Form.Control
                                                                    type="number" size="sm" step="any" min="0"
                                                                    value={item.cantidad === 0 ? '' : item.cantidad}
                                                                    onChange={(e) => actualizarCantidad(item.id_presentacion, e.target.value)}
                                                                    className="text-center fw-bold border-secondary shadow-sm p-1"
                                                                />
                                                            </td>
                                                            <td className="text-center d-none d-md-table-cell py-2">
                                                                <Form.Control
                                                                    type="number" size="sm" step="0.01" min="0"
                                                                    value={valUnitario === 0 ? '' : Currency.redondear(valUnitario, 2)}
                                                                    onChange={(e) => actualizarCostoUnitario(item.id_presentacion, e.target.value)}
                                                                    className="text-center fw-bold text-danger border-secondary bg-light shadow-sm p-1"
                                                                />
                                                            </td>
                                                            <td className="text-center py-2">
                                                                <Form.Control
                                                                    type="number" size="sm" step="0.01" min="0"
                                                                    value={valTotal === 0 ? '' : Currency.redondear(valTotal, 2)}
                                                                    onChange={(e) => actualizarCostoTotal(item.id_presentacion, e.target.value)}
                                                                    className="text-center fw-bold text-success border-success shadow-sm p-1"
                                                                />
                                                            </td>
                                                            <td className="text-center py-2 pe-3">
                                                                <Button variant="danger" size="sm" className="p-1 px-2 shadow-sm" onClick={() => eliminarDelCarrito(item.id_presentacion)} title="Quitar">
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={4} className="d-flex flex-column h-100">
                        <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                            <div className="bg-primary text-white p-3 p-md-4 text-center position-relative shadow-sm" style={{ flexShrink: 0 }}>
                                <h6 className="mb-1 fw-bold opacity-75 text-uppercase tracking-wide">Costo Total de Recepción</h6>
                                <h1 className="display-4 fw-bold mb-0">{Currency.formatear(totalCostoUsd, '$')}</h1>
                                <h5 className="mb-0 text-white-50 fw-bold">{Currency.formatear(totalCostoBs, 'Bs')}</h5>
                            </div>

                            <Card.Body className="d-flex flex-column p-3 p-md-4 bg-light" style={{ minHeight: 0 }}>
                                <div className="flex-grow-1">
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold text-secondary mb-1">Proveedor de Mercancía</Form.Label>
                                        <Form.Select
                                            value={idProveedor}
                                            onChange={(e) => setIdProveedor(e.target.value)}
                                            className="border-primary shadow-sm fs-6"
                                            disabled={cargando || proveedores.length === 0}
                                        >
                                            {cargando ? (
                                                <option value="">Cargando proveedores...</option>
                                            ) : proveedores.length > 0 ? (
                                                <>
                                                    <option value="">-- Seleccione un proveedor --</option>
                                                    {proveedores.map(prov => (
                                                        <option key={prov.id_prov} value={prov.id_prov}>
                                                            {prov.nombre}
                                                        </option>
                                                    ))}
                                                </>
                                            ) : (
                                                <option value="">No hay proveedores registrados</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>
                                </div>

                                <div className="mt-auto pt-3">
                                    <Button
                                        variant="success" size="lg" className="w-100 fw-bold shadow-sm fs-5 py-3"
                                        disabled={carrito.length === 0 || procesando}
                                        onClick={handleProcesarEntrada}
                                    >
                                        {procesando ? "Guardando..." : "REGISTRAR ENTRADA"}
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <VariantSelectionModal
                    show={showModalResultados}
                    onHide={() => {
                        setShowModalResultados(false);
                        setBusqueda('');
                        buscadorRef.current?.focus();
                    }}
                    resultados={resultadosBusqueda}
                    onSelect={procesarSeleccionProducto}
                    mostrarPrecioYStock={false}
                />

            </Container>
        </>
    );
}