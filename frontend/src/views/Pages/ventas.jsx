import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Card, Row, Col, Form, InputGroup, Badge } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faListUl, faSearch, faEye, faStore, faExchangeAlt, faCalendarCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import Loader from '@/components/loader/loader.jsx';
import { Currency } from '@/utils/Currency.js';
import { imprimirTicketDirecto } from '@/utils/printer.js';
import { useMessage } from '@/context/MessageContext.jsx';

import SaleDetailsModal from '@/components/modals/sale-details-modal.jsx';
import ReturnModal from '@/components/modals/return-modal.jsx';

const obtenerFechaLocal = (esInicio = false) => {
    const d = new Date();
    if (esInicio) d.setDate(1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '';
    return new Date(fechaISO).toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

export default function Ventas() {
    const [ventas, setVentas] = useState([]);
    const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
    const [tasaBcv, setTasaBcv] = useState(36.5);

    const [fechaInicio, setFechaInicio] = useState(() => obtenerFechaLocal(true));
    const [fechaFin, setFechaFin] = useState(() => obtenerFechaLocal(false));
    const [busqueda, setBusqueda] = useState('');

    const [showModalDetalles, setShowModalDetalles] = useState(false);
    const [cargando, setCargando] = useState(true);

    const [showModalDevolucion, setShowModalDevolucion] = useState(false);
    const [itemsDevolucion, setItemsDevolucion] = useState([]);
    const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);

    const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
    const esSuperAdmin = usuarioActual.rol_usu === 1;

    const [sucursales, setSucursales] = useState([]);
    const [idSucursalSeleccionada, setIdSucursalSeleccionada] = useState(usuarioActual.id_sucursal || '');

    const { showMessage } = useMessage();

    useEffect(() => {
        const cargarDatosIniciales = async () => {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                const peticiones = [axios.get(`${apiUrl}/api/configuracion`, config)];
                
                if (esSuperAdmin) {
                    peticiones.push(axios.get(`${apiUrl}/api/sucursales`, config));
                }

                const resultados = await Promise.all(peticiones);

                setTasaBcv(Number(resultados[0].data.tasa_bcv) || 36.5);

                if (esSuperAdmin) {
                    const resSucursales = resultados[1];
                    setSucursales(resSucursales.data);

                    if (resSucursales.data.length > 0 && !idSucursalSeleccionada) {
                        setIdSucursalSeleccionada(resSucursales.data[0].id_sucursal);
                    }
                } else {
                    if (!idSucursalSeleccionada) setIdSucursalSeleccionada('1');
                }
            } catch (error) {
                console.error("Error al cargar configuración inicial", error);
            }
        };
        
        cargarDatosIniciales();
    }, [esSuperAdmin]);

    const cargarVentas = async () => {
        if (!idSucursalSeleccionada) return; 

        setCargando(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${apiUrl}/api/ventas/historial`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    id_sucursal: idSucursalSeleccionada,
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin
                }
            });
            setVentas(res.data);
        } catch (error) {
            console.error("Error cargando ventas", error);
        } finally {
            setCargando(false);
        }
    };

    // 3. Disparador de ventas cuando cambian los filtros
    useEffect(() => {
        cargarVentas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idSucursalSeleccionada, fechaInicio, fechaFin]);

    const handlePrintTicket = async (venta) => {
        const ventaAImprimir = venta || ventaSeleccionada;
        if (!ventaAImprimir) {
            showMessage("Error: No se encontró información de la venta.", "danger");
            return;
        }

        try {
            await imprimirTicketDirecto(ventaAImprimir, tasaBcv);
            showMessage("Impresión enviada correctamente.", "success");
        } catch (error) {
            console.error(error);
            showMessage("Error: " + error.message, "danger");
        }
    };

    const reimprimirTicket = async (id_venta) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${apiUrl}/api/ventas/${id_venta}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await handlePrintTicket(res.data);
        } catch (error) {
            console.error(error);
            showMessage("Error al cargar los datos de la venta para imprimir", "danger");
        }
    };

    const verDetallesVenta = async (id_venta) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${apiUrl}/api/ventas/${id_venta}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVentaSeleccionada(res.data);
            setShowModalDetalles(true);
        } catch (error) {
            alert("Error al cargar los detalles de la venta");
        }
    };

    const prepararDevolucion = async (id_venta) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${apiUrl}/api/ventas/${id_venta}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVentaSeleccionada(res.data);

            const inicializados = (res.data.items || []).map(item => {
                const cantOriginal = Number(item.cantidad) || 0;
                const yaDevuelto = Number(item.cantidad_devuelta) || 0;
                return {
                    ...item,
                    cantidad: cantOriginal,
                    cantidad_disponible: cantOriginal - yaDevuelto,
                    cantidad_a_devolver: '' 
                };
            });

            setItemsDevolucion(inicializados);
            setShowModalDevolucion(true);
        } catch (error) {
            showMessage("Error al cargar los datos para la devolución", "danger");
        }
    };

    const handleCambioDevolucion = (index, valor) => {
        setItemsDevolucion(prevItems => {
            const nuevosItems = [...prevItems];
            const itemEditado = { ...nuevosItems[index] };

            if (valor === '') {
                itemEditado.cantidad_a_devolver = '';
            } else {
                let val = parseInt(valor, 10);
                if (isNaN(val) || val < 0) val = 0;

                if (val > itemEditado.cantidad_disponible) {
                    itemEditado.cantidad_a_devolver = itemEditado.cantidad_disponible;
                } else {
                    itemEditado.cantidad_a_devolver = val;
                }
            }
            
            nuevosItems[index] = itemEditado;
            return nuevosItems;
        });
    };

    const subtotalDetalle = ventaSeleccionada?.items?.reduce((acc, it) => {
        const devueltos = Number(it.cantidad_devuelta) || 0;
        const cantReal = it.cantidad - devueltos;
        const precioUnit = it.precio_unitario || Currency.dividir(it.subtotal, it.cantidad);
        return Currency.sumar(acc, Currency.multiplicar(cantReal, precioUnit));
    }, 0) || 0;
    const descuentoDetalle = Number(ventaSeleccionada?.descuento_usd) || 0;
    const moraDetalle = Number(ventaSeleccionada?.recargo_mora) || 0;
    const totalFacturaDetalle = Currency.sumar(Currency.restar(subtotalDetalle, descuentoDetalle), moraDetalle);
    const pagadoDetalle = Number(ventaSeleccionada?.total_pagado) || 0;
    const deudaFinalDetalle = Currency.restar(totalFacturaDetalle, pagadoDetalle);

    const totalAFavor = itemsDevolucion.reduce((acc, item) => {
        const precioUnitario = Currency.dividir(item.subtotal, item.cantidad);
        const cantDevolver = Number(item.cantidad_a_devolver) || 0;
        return Currency.sumar(acc, Currency.multiplicar(cantDevolver, precioUnitario));
    }, 0);

    let montoAbonoDeuda = 0;
    let montoNotaCredito = 0;

    if (deudaFinalDetalle > 0) {
        if (totalAFavor <= deudaFinalDetalle) {
            montoAbonoDeuda = totalAFavor;
        } else {
            montoAbonoDeuda = deudaFinalDetalle;
            montoNotaCredito = Currency.restar(totalAFavor, deudaFinalDetalle);
        }
    } else {
        montoNotaCredito = totalAFavor;
    }


    const handleProcesarDevolucion = async () => {
        const itemsValidos = itemsDevolucion.filter(item => Number(item.cantidad_a_devolver) > 0);

        if (itemsValidos.length === 0) {
            return showMessage("Debes seleccionar al menos un artículo para devolver.", "warning");
        }

        setProcesandoDevolucion(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('token');

        try {
            const payload = {
                id_venta: ventaSeleccionada.id_venta,
                id_cliente: ventaSeleccionada.id_cliente,
                items_devueltos: itemsValidos.map(it => ({
                    id_presentacion: it.id_presentacion,
                    cantidad: Number(it.cantidad_a_devolver),
                    precio_unitario: Currency.dividir(it.subtotal, it.cantidad)
                }))
            };

            const res = await axios.post(`${apiUrl}/api/ventas/devolucion`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showMessage(res.data.message, "success");
            setShowModalDevolucion(false);
            cargarVentas(); // Se actualiza la tabla tras realizar el proceso

        } catch (error) {
            showMessage(error.response?.data?.message || "Error al procesar la devolución", "danger");
        } finally {
            setProcesandoDevolucion(false);
        }
    };

    const ventasFiltradas = ventas.filter((venta) => {
        const termino = busqueda.toLowerCase();
        const idStr = String(venta.id_venta).padStart(6, '0');
        const clienteStr = venta.cliente ? venta.cliente.toLowerCase() : '';
        const coincideBusqueda = idStr.includes(termino) || clienteStr.includes(termino);

        const inicio = new Date(`${fechaInicio}T00:00:00`);
        const fin = new Date(`${fechaFin}T23:59:59`);

        const fechaVenta = new Date(venta.fecha);
        const coincideVenta = fechaVenta >= inicio && fechaVenta <= fin;

        let coincidePago = false;
        if (venta.fecha_ultimo_pago) {
            const fechaUltimoPago = new Date(venta.fecha_ultimo_pago);
            coincidePago = fechaUltimoPago >= inicio && fechaUltimoPago <= fin;
        }

        const coincideFecha = coincideVenta || coincidePago;

        return coincideBusqueda && coincideFecha;
    });

    return (
        <Container fluid className="p-2 p-md-3 d-flex flex-column flex-grow-1 alto-fijo-pc" style={{ minHeight: 0 }}>
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2" style={{ flexShrink: 0 }}>
                <h4 className="text-primary fw-bold mb-0">
                    <FontAwesomeIcon icon={faListUl} className="me-2" />
                    Historial de Ventas
                </h4>
            </div>

            <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                <Card.Body className="d-flex flex-column p-3 p-md-4 h-100" style={{ minHeight: 0 }}>
                    
                    <Row className="g-2 mb-4 align-items-end" style={{ flexShrink: 0 }}>
                        <Col xs={6} md={3} lg={2}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-secondary mb-1" style={{ fontSize: '0.8rem' }}>Desde (Venta/Pago)</Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="shadow-sm border-secondary"
                                    disabled={cargando}
                                />
                            </Form.Group>
                        </Col>
                        <Col xs={6} md={3} lg={2}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-secondary mb-1" style={{ fontSize: '0.8rem' }}>Hasta (Venta/Pago)</Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="shadow-sm border-secondary"
                                    disabled={cargando}
                                />
                            </Form.Group>
                        </Col>

                        {esSuperAdmin && (
                            <Col xs={12} md={6} lg={3}>
                                <Form.Group>
                                    <Form.Label className="fw-bold text-secondary mb-1" style={{ fontSize: '0.8rem' }}>Sucursal</Form.Label>
                                    <InputGroup size="sm">
                                        <InputGroup.Text className="bg-white border-primary text-primary">
                                            <FontAwesomeIcon icon={faStore} />
                                        </InputGroup.Text>
                                        <Form.Select
                                            value={idSucursalSeleccionada}
                                            onChange={(e) => setIdSucursalSeleccionada(e.target.value)}
                                            className="border-primary shadow-sm fw-bold text-secondary"
                                            disabled={cargando || !sucursales || sucursales.length === 0}
                                        >
                                            {sucursales && sucursales.length > 0 ? (
                                                <>
                                                    {sucursales.map(suc => (
                                                        <option key={suc.id_sucursal} value={suc.id_sucursal}>
                                                            {suc.nombre}
                                                        </option>
                                                    ))}
                                                </>
                                            ) : (
                                                <option value="">Cargando...</option>
                                            )}
                                        </Form.Select>
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                        )}

                        <Col xs={12} md={esSuperAdmin ? 12 : 6} lg={esSuperAdmin ? 5 : 8}>
                            <Form.Group>
                                <Form.Label className="fw-bold text-secondary mb-1" style={{ fontSize: '0.8rem' }}>Buscar por Nro o Cliente</Form.Label>
                                <InputGroup size="sm" className="shadow-sm">
                                    <InputGroup.Text className="bg-white border-secondary">
                                        <FontAwesomeIcon icon={faSearch} className="text-secondary" />
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por # Venta o nombre del cliente..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="border-secondary"
                                        disabled={cargando}
                                    />
                                    {busqueda && (
                                        <Button variant="danger" onClick={() => setBusqueda('')} disabled={cargando}>
                                            <FontAwesomeIcon icon={faXmark} />
                                        </Button>
                                    )}
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>

                    {cargando ? (
                        <div className="text-center py-5 m-auto">
                            <Loader texto="Cargando historial de ventas..." />
                        </div>
                    ) : (
                        <div className="flex-grow-1 border rounded bg-white shadow-sm" style={{ overflow: 'auto', minHeight: 0 }}>
                            <Table hover className="align-middle mb-0 custom-table" size="sm" style={{ minWidth: '850px' }}>
                                <thead className="table-dark sticky-top" style={{ zIndex: 1 }}>
                                    <tr>
                                        <th className="text-nowrap ps-3 py-3 text-start"># Venta</th>
                                        <th className="text-nowrap py-3">Fecha Venta</th>
                                        <th className="text-nowrap py-3">Último Pago</th>
                                        <th className="text-nowrap py-3 text-start">Cliente</th>
                                        <th className="text-nowrap py-3 text-center">Total Pagado ($)</th>
                                        <th className="text-center text-nowrap py-3" style={{ width: '250px' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ventasFiltradas.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5 text-muted bg-light">
                                                <FontAwesomeIcon icon={faListUl} size="4x" className="mb-3 opacity-25" /><br />
                                                <h5 className="fw-bold text-secondary">Sin resultados</h5>
                                                <p className="mb-0">No se encontraron ventas con los filtros seleccionados.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        ventasFiltradas.map(v => (
                                            <tr key={v.id_venta}>
                                                <td className="text-nowrap ps-3 py-2 fw-bold text-start" style={{ fontSize: '0.95rem' }}>
                                                    {String(v.id_venta).padStart(6, '0')}
                                                </td>
                                                <td className="text-nowrap py-2 text-muted" style={{ fontSize: '0.85rem' }}>
                                                    {formatearFecha(v.fecha)}
                                                </td>
                                                <td className="text-nowrap py-2">
                                                    {v.fecha_ultimo_pago ? (
                                                        <Badge bg="primary" className="fw-bold">
                                                            <FontAwesomeIcon icon={faCalendarCheck} className="me-1" />
                                                            {formatearFecha(v.fecha_ultimo_pago)}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted fst-italic" style={{ fontSize: '0.85rem' }}>Sin abonos</span>
                                                    )}
                                                </td>
                                                <td className="text-nowrap py-2 text-start" style={{ fontSize: '0.95rem' }}>
                                                    {v.cliente || 'Consumidor Final'}
                                                </td>
                                                <td className="text-nowrap py-2 text-success fw-bold text-center" style={{ fontSize: '0.95rem' }}>
                                                    {Currency.formatear(v.total_pagado, '$')}
                                                </td>
                                                <td className="text-center text-nowrap py-2 pe-3">
                                                    <div className="d-flex justify-content-center gap-2">
                                                        <Button variant="info" size="sm" className="fw-bold p-1 px-2 text-white shadow-sm" onClick={() => verDetallesVenta(v.id_venta)} title="Detalles">
                                                            <FontAwesomeIcon icon={faEye} className="me-1" /> Detalles
                                                        </Button>
                                                        <Button variant="warning" size="sm" className="fw-bold p-1 px-2 shadow-sm" onClick={() => prepararDevolucion(v.id_venta)} title="Devolver">
                                                            <FontAwesomeIcon icon={faExchangeAlt} className="me-1" /> Devolver
                                                        </Button>
                                                        <Button variant="secondary" size="sm" className="fw-bold p-1 px-2 shadow-sm" onClick={() => reimprimirTicket(v.id_venta)} title="Imprimir Ticket">
                                                            <FontAwesomeIcon icon={faPrint} className="me-1" /> Imprimir
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            <SaleDetailsModal 
                show={showModalDetalles}
                onHide={() => setShowModalDetalles(false)}
                ventaSeleccionada={ventaSeleccionada}
                formatearFecha={formatearFecha}
                subtotalDetalle={subtotalDetalle}
                descuentoDetalle={descuentoDetalle}
                moraDetalle={moraDetalle}
                totalFacturaDetalle={totalFacturaDetalle}
                pagadoDetalle={pagadoDetalle}
                deudaFinalDetalle={deudaFinalDetalle}
            />

            <ReturnModal 
                show={showModalDevolucion}
                onHide={() => setShowModalDevolucion(false)}
                ventaSeleccionada={ventaSeleccionada}
                itemsDevolucion={itemsDevolucion}
                handleCambioDevolucion={handleCambioDevolucion}
                deudaFinalDetalle={deudaFinalDetalle}
                totalAFavor={totalAFavor}
                montoAbonoDeuda={montoAbonoDeuda}
                montoNotaCredito={montoNotaCredito}
                procesandoDevolucion={procesandoDevolucion}
                handleProcesarDevolucion={handleProcesarDevolucion}
            />

        </Container>
    );
}