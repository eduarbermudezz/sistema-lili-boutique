import React, { useState, useEffect, useRef } from 'react';
import { Currency } from '@/utils/Currency.js';
import { Container, Table, Button, Form, InputGroup, Row, Col, Card, Badge } from 'react-bootstrap';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReceipt, faUserClock, faSearch, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useMessage } from '@/context/MessageContext.jsx';
import Loader from '@/components/loader/loader.jsx';
import logoEmpresa from '@/assets/logo.png';

import CalculatorModal from '@/components/modals/calculator-modal.jsx';
import CobranzaModal from '@/components/modals/cobranza-modal.jsx';

export default function CuentasPorCobrar() {
    const [deudores, setDeudores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [busqueda, setBusqueda] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [clienteActual, setClienteActual] = useState(null);
    const [documentos, setDocumentos] = useState([]);
    const [docExpandido, setDocExpandido] = useState(null);

    const [idVentaSeleccionada, setIdVentaSeleccionada] = useState('');
    const [idMetodo, setIdMetodo] = useState('');
    const [metodos, setMetodos] = useState([]);

    const [pagosAgregados, setPagosAgregados] = useState([]);
    const [esVuelto, setEsVuelto] = useState(false);
    const [montoIngresado, setMontoIngresado] = useState('');

    const [saldoFavorCliente, setSaldoFavorCliente] = useState(0);

    const [tasaBcv, setTasaBcv] = useState(1);
    const [tasaCop, setTasaCop] = useState(1);

    const [mostrarBs, setMostrarBs] = useState(true);

    const [documentosACompartir, setDocumentosACompartir] = useState([]);
    const reciboRef = useRef(null);
    const [generandoImagen, setGenerandoImagen] = useState(false);

    const [procesandoPago, setProcesandoPago] = useState(false);

    const [showCalc, setShowCalc] = useState(false);
    const [calcMonto, setCalcMonto] = useState('');
    const [calcOrigen, setCalcOrigen] = useState('USD');

    const { showMessage } = useMessage();

    const metodoEncontrado = metodos.find(m => String(m.id_metodo) === String(idMetodo));
    const monedaActual = metodoEncontrado?.moneda || 'USD';
    const simboloInput = monedaActual === 'USD' ? '$' : (monedaActual === 'VES' ? 'Bs' : monedaActual);

    const [procesandoMora, setProcesandoMora] = useState(false);

    const cargarDeudores = async () => {
        setLoading(true);
        setError(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');
            const configGeneral = { headers: { Authorization: `Bearer ${token}` } };

            const promesas = [
                axios.get(`${apiUrl}/api/cobros/resumen`, configGeneral),
                axios.get(`${apiUrl}/api/ventas/metodos-pago`, configGeneral),
                axios.get(`${apiUrl}/api/configuracion`, configGeneral)
            ];

            const resultados = await Promise.all(promesas);

            setDeudores(resultados[0].data);
            setMetodos(resultados[1].data);
            if (resultados[1].data.length > 0) setIdMetodo(resultados[1].data[0].id_metodo);

            if (resultados[2].data) {
                setTasaBcv(Number(resultados[2].data.tasa_bcv) || 1);
                setTasaCop(Number(resultados[2].data.tasa_cop) || 1);
            }
        } catch (error) {
            setError(error.response?.data?.message || "Error de conexión al cargar cuentas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarDeudores(); }, []);

    const cargarSaldoCliente = async (id) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');
            const res = await axios.get(`${apiUrl}/api/clientes/${id}/saldo`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaldoFavorCliente(Number(res.data.saldo) || 0);
        } catch (error) {
            setSaldoFavorCliente(0);
        }
    };

    const calcularConversion = () => {
        let monto = Number(calcMonto) || 0;
        if (monto <= 0) return 0;

        let montoUsd = 0;
        if (calcOrigen === 'USD') montoUsd = monto;
        else if (calcOrigen === 'VES') montoUsd = Currency.dividir(monto, tasaBcv);
        else if (calcOrigen === 'COP') montoUsd = Currency.dividir(monto, tasaCop);

        let resultado = 0;
        if (monedaActual === 'USD') resultado = montoUsd;
        else if (monedaActual === 'VES') resultado = Currency.multiplicar(montoUsd, tasaBcv);
        else if (monedaActual === 'COP') resultado = Currency.multiplicar(montoUsd, tasaCop);

        return Currency.redondear(resultado, 2);
    };

    const aplicarCalculo = () => {
        setMontoIngresado(calcularConversion().toString());
        setShowCalc(false);
        setCalcMonto('');
    };

    const cerrarCalculadora = () => {
        setShowCalc(false);
        setCalcMonto('');
        setCalcOrigen('USD');
    };

    const formatearMonto = (montoUsd) => {
        if (mostrarBs) {
            const montoBs = Currency.multiplicar(montoUsd, tasaBcv);
            return Currency.formatear(montoBs, 'Bs');
        }
        return Currency.formatear(montoUsd, '$');
    };

    const verDetalleCliente = async (cliente) => {
        setClienteActual(cliente);
        cargarSaldoCliente(cliente.id_cli);
        
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            const res = await axios.get(`${apiUrl}/api/cobros/cliente/${cliente.id_cli}`, config);

            setDocumentos(res.data);
            setDocumentosACompartir(res.data.map(f => f.id_venta));
            if (res.data.length > 0) setIdVentaSeleccionada(res.data[0].id_venta);
            setMontoIngresado('');
            setPagosAgregados([]);
            setEsVuelto(false);
            setDocExpandido(null);
            setShowModal(true);
        } catch (error) {
            showMessage("Error al cargar documentos pendientes.", "danger");
        }
    };

    const handleToggleMora = async (id_venta, currentAplicaMora) => {
        setProcesandoMora(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

            await axios.put(`${apiUrl}/api/cobros/mora/${id_venta}`, { aplicar: !currentAplicaMora }, config);
            showMessage(`Mora ${!currentAplicaMora ? 'activada' : 'desactivada'} correctamente.`, "success");

            const res = await axios.get(`${apiUrl}/api/cobros/cliente/${clienteActual.id_cli}`, config);
            setDocumentos(res.data);
            cargarDeudores();
        } catch (error) {
            showMessage(error.response?.data?.message || "Error al cambiar el estado de la mora.", "danger");
        } finally {
            setProcesandoMora(false);
        }
    };

    const deudaTotalDocumentosUsd = documentos.reduce((sum, f) => Currency.sumar(sum, f.deuda_factura), 0);
    const deudaMaximaUsdSeleccionada = idVentaSeleccionada === 'todas'
        ? deudaTotalDocumentosUsd
        : Number(documentos.find(f => String(f.id_venta) === String(idVentaSeleccionada))?.deuda_factura) || 0;

    const totalPagadoUsd = pagosAgregados.reduce((acc, pago) => Currency.sumar(acc, pago.monto_usd), 0);
    const deudaCalculada = Currency.redondear(Currency.restar(deudaMaximaUsdSeleccionada, totalPagadoUsd), 2);
    const sobranteUsd = Currency.redondear(Currency.restar(totalPagadoUsd, deudaMaximaUsdSeleccionada), 2);
    const puedeDarVuelto = sobranteUsd > 0;

    useEffect(() => {
        if (!puedeDarVuelto && esVuelto) setEsVuelto(false);
    }, [puedeDarVuelto, esVuelto]);

    useEffect(() => {
        let sugeridoUsd = 0;
        const faltanteUsdExacto = Currency.restar(deudaMaximaUsdSeleccionada, totalPagadoUsd);

        if (esVuelto) {
            if (sobranteUsd > 0) sugeridoUsd = sobranteUsd;
        } else {
            if (faltanteUsdExacto > 0) sugeridoUsd = faltanteUsdExacto;
        }

        if (Currency.redondear(sugeridoUsd, 2) > 0) {
            let valorSugerido = sugeridoUsd;
            if (monedaActual === 'VES') valorSugerido = Currency.multiplicar(sugeridoUsd, tasaBcv);
            else if (monedaActual === 'COP') valorSugerido = Currency.multiplicar(sugeridoUsd, tasaCop);

            setMontoIngresado(Currency.redondear(valorSugerido, 2).toString());
        } else {
            setMontoIngresado('');
        }
    }, [deudaMaximaUsdSeleccionada, totalPagadoUsd, monedaActual, tasaBcv, tasaCop, esVuelto, sobranteUsd, idVentaSeleccionada]);

    const agregarPagoLista = (e) => {
        e.preventDefault();
        if (!idMetodo || montoIngresado === '') return;

        const montoIngresadoNum = Number(montoIngresado);
        if (isNaN(montoIngresadoNum) || montoIngresadoNum <= 0) {
            return showMessage("El monto a registrar debe ser mayor a 0.", "warning");
        }

        const metodo = metodos.find(m => String(m.id_metodo) === String(idMetodo));
        if (!metodo) return;

        let montoAbonar = montoIngresadoNum;
        let equivalenteUsd = 0;

        if (metodo.moneda === 'USD') equivalenteUsd = montoAbonar;
        else if (metodo.moneda === 'VES') equivalenteUsd = Currency.dividir(montoAbonar, tasaBcv);
        else if (metodo.moneda === 'COP') equivalenteUsd = Currency.dividir(montoAbonar, tasaCop);

        if (esVuelto) {
            if (sobranteUsd <= 0) return showMessage("No puede registrar vuelto.", "warning");
            const maxVueltoUsd = Currency.restar(totalPagadoUsd, deudaMaximaUsdSeleccionada);
            if (equivalenteUsd > Currency.sumar(maxVueltoUsd, 0.05)) {
                return showMessage("El vuelto no puede ser mayor al sobrante.", "warning");
            }
            montoAbonar = -Math.abs(montoAbonar);
            equivalenteUsd = -Math.abs(equivalenteUsd);
        }

        if (Number(metodo.id_metodo) === 120009) {
            const saldoYaUsado = pagosAgregados
                .filter(p => Number(p.id_metodo) === 120009)
                .reduce((acc, p) => acc + p.monto_usd, 0);

            const disponibleRestante = Currency.restar(saldoFavorCliente, saldoYaUsado);

            if (equivalenteUsd > disponibleRestante) {
                return showMessage(`Saldo a favor insuficiente. El cliente solo dispone de $${disponibleRestante}.`, "warning");
            }
        }

        const nuevoPago = {
            id_pago_temp: Date.now(),
            id_metodo: metodo.id_metodo,
            descripcion: metodo.descripcion,
            moneda: metodo.moneda,
            monto_original: montoAbonar,
            monto_usd: equivalenteUsd,
            es_vuelto: esVuelto
        };

        setPagosAgregados([...pagosAgregados, nuevoPago]);
        setMontoIngresado('');
        setEsVuelto(false);
    };

    const handleProcesarPago = async () => {
        if (pagosAgregados.length === 0) return showMessage("Agregue pagos a la lista primero.", "info");
        if (sobranteUsd > 0) return showMessage("Registre el vuelto del pago sobrante.", "warning");

        setProcesandoPago(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

            if (idVentaSeleccionada === 'todas') {
                let pagosPendientes = pagosAgregados.map(p => ({ ...p }));

                for (let i = 0; i < documentos.length; i++) {
                    const doc = documentos[i];
                    let deudaDoc = Number(doc.deuda_factura);
                    let pagosParaEsteDoc = [];

                    for (let p of pagosPendientes) {
                        if (p.monto_usd > 0 && deudaDoc > 0) {
                            let aPagar = Math.min(p.monto_usd, deudaDoc);
                            pagosParaEsteDoc.push({ ...p, monto_usd: aPagar });
                            p.monto_usd = Currency.restar(p.monto_usd, aPagar);
                            deudaDoc = Currency.restar(deudaDoc, aPagar);
                        }
                    }

                    if (i === documentos.length - 1) {
                        for (let p of pagosPendientes) {
                            if (p.monto_usd > 0) pagosParaEsteDoc.push({ ...p });
                            if (p.monto_usd < 0) pagosParaEsteDoc.push({ ...p });
                        }
                    }

                    if (pagosParaEsteDoc.length > 0) {
                        await axios.post(`${apiUrl}/api/cobros/abono`, {
                            id_venta: doc.id_venta,
                            pagos: pagosParaEsteDoc.map(p => ({
                                id_metodo: p.id_metodo,
                                monto_usd: Currency.redondear(p.monto_usd, 4),
                                es_vuelto: p.es_vuelto
                            }))
                        }, config);
                    }
                }
            } else {
                await axios.post(`${apiUrl}/api/cobros/abono`, {
                    id_venta: idVentaSeleccionada,
                    pagos: pagosAgregados.map(p => ({
                        id_metodo: p.id_metodo,
                        monto_usd: Currency.redondear(p.monto_usd, 4),
                        es_vuelto: p.es_vuelto
                    }))
                }, config);
            }

            showMessage("Pago registrado con éxito", "success");
            setShowModal(false);
            cargarDeudores();
        } catch (error) {
            showMessage(error.response?.data?.message || "Error al procesar el pago.", "danger");
        } finally {
            setProcesandoPago(false);
        }
    };

const generarYCompartirImagen = async () => {
        if (documentosACompartir.length === 0) return showMessage("Selecciona al menos un documento.", "info");
        setGenerandoImagen(true);
        try {
            const element = reciboRef.current;
            element.style.height = 'auto';
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            
            canvas.toBlob(async (blob) => {
                try {
                    const file = new File([blob], `Estado_Cuenta_${clienteActual?.ra_soc_cli.replace(/\s+/g, '_')}.jpg`, { type: 'image/jpeg' });
                    
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ title: 'Estado de Cuenta', files: [file] });
                    } else {
                        const link = document.createElement('a');
                        link.download = file.name;
                        link.href = URL.createObjectURL(blob);
                        link.click();
                    }
                } catch (shareError) {
                    // Ignoramos el error si el usuario simplemente cerró la ventana de compartir
                    if (shareError.name !== 'AbortError') {
                        console.error("Error al compartir:", shareError);
                        showMessage("No se pudo completar la acción de compartir.", "danger");
                    }
                } finally {
                    // Garantiza que el spinner se apague sin importar qué pase
                    setGenerandoImagen(false);
                }
            }, 'image/jpeg', 0.95);
        } catch (error) {
            setGenerandoImagen(false);
            console.error("Error en canvas:", error);
            showMessage("Error al generar la imagen del recibo.", "danger");
        }
    };

    const documentosFiltradosParaImagen = documentos.filter(f => documentosACompartir.includes(f.id_venta));
    const totalEstadoCuentaUsd = documentosFiltradosParaImagen.reduce((acc, f) => Currency.sumar(acc, f.deuda_factura), 0);
    const totalMoraUsd = documentosFiltradosParaImagen.reduce((acc, f) => Currency.sumar(acc, Number(f.recargo_mora) || 0), 0);
    const totalEstadoCuentaBs = Currency.multiplicar(totalEstadoCuentaUsd, tasaBcv);
    const toggleDetalle = (id_venta) => setDocExpandido(docExpandido === id_venta ? null : id_venta);

    const deudoresFiltrados = deudores.filter(d =>
        (d.ra_soc_cli || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (d.ced_rif_cli || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <>
            {procesandoPago && <Loader texto="Registrando pago..." pantallaCompleta={true} />}
            {generandoImagen && <Loader texto="Generando estado de cuenta..." pantallaCompleta={true} />}

            <Container fluid className="p-2 p-md-3 d-flex flex-column flex-grow-1 alto-fijo-pc" style={{ minHeight: 0 }}>
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-3 gap-2" style={{ flexShrink: 0 }}>
                    <h4 className="text-primary fw-bold mb-0">
                        <FontAwesomeIcon icon={faUserClock} className="me-2" />
                        Cuentas por Cobrar
                    </h4>
                    <Card className="p-2 bg-light border-0 shadow-sm mb-0 w-100 w-sm-auto">
                        <div className="d-flex align-items-center justify-content-between gap-3">
                            <span className="badge bg-secondary py-2 px-3 fs-6 text-nowrap">
                                {loading ? 'Cargando tasa...' : `Tasa: ${tasaBcv} Bs`}
                            </span>
                            <Form.Check 
                                type="switch" 
                                id="moneda-switch" 
                                label={<span className="fw-bold text-secondary small text-nowrap">{mostrarBs ? 'Bs' : 'USD'}</span>} 
                                checked={mostrarBs} 
                                onChange={(e) => setMostrarBs(e.target.checked)} 
                                className="mb-0" 
                                disabled={loading}
                            />
                        </div>
                    </Card>
                </div>

                <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                    <Card.Body className="d-flex flex-column p-3 p-md-4 h-100" style={{ minHeight: 0 }}>
                        <Row className="mb-4" style={{ flexShrink: 0 }}>
                            <Col xs={12} md={10} lg={8}>
                                <Form.Label className="fw-bold text-secondary">Buscar Cuenta</Form.Label>
                                <InputGroup size="lg" className="shadow-sm">
                                    <Form.Control
                                        type="text"
                                        placeholder={"🔍 Buscar por cliente o CI/RIF..."}
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        disabled={loading}
                                        className="fs-6 border-primary"
                                    />
                                    {!busqueda ? (
                                        <Button variant="primary" disabled={loading} style={{ pointerEvents: 'none' }}>
                                            <FontAwesomeIcon icon={faSearch} />
                                        </Button>
                                    ) : (
                                        <Button variant="danger" onClick={() => setBusqueda('')}>
                                            <FontAwesomeIcon icon={faXmark} className="me-2" /> Limpiar
                                        </Button>
                                    )}
                                </InputGroup>
                            </Col>
                        </Row>

                        {loading ? (
                            <div className="text-center py-5 m-auto">
                                <Loader texto="Cargando cuentas pendientes..." />
                            </div>
                        ) : (
                            <div className="flex-grow-1 border rounded bg-white shadow-sm" style={{ overflow: 'auto', minHeight: 0 }}>
                                <Table hover className="align-middle mb-0 custom-table" size="sm" style={{ minWidth: '600px' }}>
                                    <thead className="table-dark sticky-top" style={{ zIndex: 1 }}>
                                        <tr>
                                            <th className="text-nowrap ps-3 py-3">Cliente</th>
                                            <th className="d-none d-md-table-cell text-nowrap py-3">Identificación</th>
                                            <th className="text-center text-nowrap py-3">Doc. Pendientes</th>
                                            <th className="text-end text-nowrap py-3">Deuda Total</th>
                                            <th className="text-center text-nowrap py-3" style={{ width: '150px' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deudoresFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-5 text-muted bg-light">
                                                    <FontAwesomeIcon icon={faReceipt} size="4x" className="mb-3 opacity-25" /><br />
                                                    <h5 className="fw-bold text-secondary">Sin resultados</h5>
                                                    <p className="mb-0">
                                                        {busqueda ? `No se encontraron cuentas para "${busqueda}".` : "No hay cuentas pendientes por cobrar."}
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            deudoresFiltrados.map(d => (
                                                <tr key={d.id_cli}>
                                                    <td className="text-nowrap ps-3 py-2 fw-bold" style={{ fontSize: '0.95rem' }}>{d.ra_soc_cli}</td>
                                                    <td className="d-none d-md-table-cell text-secondary text-nowrap py-2" style={{ fontSize: '0.95rem' }}>{d.ced_rif_cli}</td>
                                                    <td className="text-center py-2"><Badge bg="warning" text="dark" pill>{d.facturas_pendientes}</Badge></td>
                                                    <td className="text-end text-danger fw-bold py-2" style={{ fontSize: '0.95rem' }}>{formatearMonto(d.saldo_pendiente)}</td>
                                                    <td className="text-center py-2">
                                                        <Button variant="primary" size="sm" className="fw-bold p-1 px-3 shadow-sm w-100" onClick={() => verDetalleCliente(d)}>
                                                            <FontAwesomeIcon icon={faReceipt} className="me-1"/> <span className="d-none d-md-inline">Gestionar</span>
                                                        </Button>
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

                <CobranzaModal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    clienteActual={clienteActual}
                    documentos={documentos}
                    docExpandido={docExpandido}
                    toggleDetalle={toggleDetalle}
                    idVentaSeleccionada={idVentaSeleccionada}
                    setIdVentaSeleccionada={setIdVentaSeleccionada}
                    generarYCompartirImagen={generarYCompartirImagen}
                    generandoImagen={generandoImagen}
                    formatearMonto={formatearMonto}
                    handleToggleMora={handleToggleMora}
                    procesandoMora={procesandoMora}
                    pagosAgregados={pagosAgregados}
                    setPagosAgregados={setPagosAgregados}
                    agregarPagoLista={agregarPagoLista}
                    metodos={metodos}
                    idMetodo={idMetodo}
                    setIdMetodo={setIdMetodo}
                    esVuelto={esVuelto}
                    setEsVuelto={setEsVuelto}
                    puedeDarVuelto={puedeDarVuelto}
                    saldoFavorCliente={saldoFavorCliente}
                    metodoEncontrado={metodoEncontrado}
                    simboloInput={simboloInput}
                    montoIngresado={montoIngresado}
                    setMontoIngresado={setMontoIngresado}
                    setShowCalc={setShowCalc}
                    deudaMaximaUsdSeleccionada={deudaMaximaUsdSeleccionada}
                    totalPagadoUsd={totalPagadoUsd}
                    deudaCalculada={deudaCalculada}
                    sobranteUsd={sobranteUsd}
                    handleProcesarPago={handleProcesarPago}
                    procesandoPago={procesandoPago}
                />

                <CalculatorModal
                    show={showCalc}
                    onHide={cerrarCalculadora}
                    calcMonto={calcMonto}
                    setCalcMonto={setCalcMonto}
                    calcOrigen={calcOrigen}
                    setCalcOrigen={setCalcOrigen}
                    monedaActualMetodo={monedaActual}
                    simboloInput={simboloInput}
                    calcularConversion={calcularConversion}
                    aplicarCalculo={aplicarCalculo}
                />

                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <div ref={reciboRef} style={{ width: '650px', backgroundColor: '#ffffff', padding: '40px', color: '#333', fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
                        {/* Cabecera con Logo */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #0d6efd', paddingBottom: '20px', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <img src={logoEmpresa} alt="Logo de la Empresa" style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }} crossOrigin="anonymous" />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ margin: 0, color: '#0d6efd', fontWeight: '800', fontSize: '26px', textTransform: 'uppercase', letterSpacing: '1px' }}>Estado de Cuenta</h2>
                                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d', fontWeight: '500' }}>
                                    Fecha: {new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        {/* Datos del Cliente y Tasa */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                            <div>
                                <span style={{ fontSize: '12px', color: '#6c757d', textTransform: 'uppercase', fontWeight: 'bold' }}>Datos del Cliente</span><br />
                                <strong style={{ fontSize: '16px', color: '#212529', textTransform: 'uppercase' }}>{clienteActual?.ra_soc_cli}</strong><br />
                                <span style={{ color: '#495057', fontSize: '14px' }}>CI/RIF: {clienteActual?.ced_rif_cli}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '12px', color: '#6c757d', textTransform: 'uppercase', fontWeight: 'bold' }}>Información de Moneda</span><br />
                                <strong style={{ fontSize: '15px', color: '#212529' }}>Moneda Base: USD ($)</strong><br />
                                <span style={{ color: '#495057', fontSize: '14px' }}>Tasa BCV Aplicada: Bs {tasaBcv}</span>
                            </div>
                        </div>

                        {/* Tabla de Documentos */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#0d6efd', color: '#ffffff' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', borderTopLeftRadius: '6px' }}>Nº Doc</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Subtotal</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Mora</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Abonado</th>
                                    <th style={{ padding: '12px', textAlign: 'right', borderTopRightRadius: '6px' }}>Saldo Deudor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documentosFiltradosParaImagen.map((doc, index) => {
                                    const subtotal = Currency.restar(doc.monto_total, Number(doc.recargo_mora) || 0);
                                    const tieneMora = Number(doc.recargo_mora) > 0;

                                    return (
                                        <tr key={doc.id_venta} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                                            <td style={{ padding: '12px', fontWeight: '600', color: '#495057' }}>#{doc.id_venta}</td>
                                            <td style={{ padding: '12px', color: '#495057' }}>{new Date(doc.fecha).toLocaleDateString()}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#495057' }}>{Currency.formatear(subtotal, '$')}</td>

                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: tieneMora ? 'bold' : 'normal', color: tieneMora ? '#dc3545' : '#adb5bd' }}>
                                                {tieneMora ? Currency.formatear(doc.recargo_mora, '$') : '-'}
                                            </td>

                                            <td style={{ padding: '12px', textAlign: 'right', color: '#198754', fontWeight: '500' }}>{Currency.formatear(doc.monto_pagado, '$')}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#dc3545' }}>{Currency.formatear(doc.deuda_factura, '$')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Totales Generales */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '380px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '2px solid #dee2e6' }}>
                                {totalMoraUsd > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '10px', borderBottom: '1px solid #e9ecef', paddingBottom: '10px' }}>
                                        <span style={{ color: '#6c757d', fontWeight: '600' }}>Recargos (Mora) Incluidos:</span>
                                        <span style={{ fontWeight: 'bold', color: '#dc3545' }}>{Currency.formatear(totalMoraUsd, '$')}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                                    <span style={{ fontWeight: '800', color: '#212529' }}>TOTAL DEUDA USD:</span>
                                    <span style={{ fontWeight: '900', color: '#dc3545' }}>{Currency.formatear(totalEstadoCuentaUsd, '$')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}>
                                    <span style={{ color: '#6c757d', fontWeight: '600' }}>Equivalente VES:</span>
                                    <span style={{ fontWeight: 'bold', color: '#495057' }}>
                                        {Currency.formatear(totalEstadoCuentaBs, 'Bs')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Nota al pie */}
                        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#adb5bd', borderTop: '1px solid #e9ecef', paddingTop: '20px' }}>
                            * Este documento es un resumen informativo de su saldo pendiente a la fecha.<br />
                            * Las cuentas que superen los 15 días de plazo generan recargos por mora.
                        </div>

                    </div>
                </div>
            </Container>
        </>
    );
}