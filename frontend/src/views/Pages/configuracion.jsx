import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCogs, faPrint, faSync, faEdit, faHandHoldingDollar } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/buttons/button.jsx';
import { useMessage } from '@/context/MessageContext.jsx';
import Loader from '@/components/loader/loader.jsx';

import RateModal from '@/components/modals/rate-modal.jsx';
import MoraModal from '@/components/modals/mora-modal.jsx';

export default function Configuracion() {
    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [errorData, setErrorData] = useState(null);

    const [configTasas, setConfigTasas] = useState({ tasa_bcv: 1, tasa_cop: 1 });
    const [montoMora, setMontoMora] = useState(3.00);

    const [showRateModal, setShowRateModal] = useState(false);
    const [showMoraModal, setShowMoraModal] = useState(false);

    const [tamanoLocal, setTamanoLocal] = useState(localStorage.getItem('tamanoImpresora') || '58');
    const [tamanoEtiqueta, setTamanoEtiqueta] = useState(localStorage.getItem('tamanoEtiqueta') || '50x25');
    const [impresoraTickets, setImpresoraTickets] = useState(localStorage.getItem('nombreImpresora') || 'POS-58');
    const [impresoraEtiquetas, setImpresoraEtiquetas] = useState(localStorage.getItem('nombreImpresoraEtiquetas') || '');

    const { showMessage } = useMessage();

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const permisos = JSON.parse(localStorage.getItem('permisos') || '[]');

    const tienePermiso = (codigo) => {
        if (usuario.rol_usu === 1) return true;
        return permisos.includes(codigo);
    };

    const cargarDatos = useCallback(async () => {
        setCargandoInicial(true);
        setErrorData(null);
        try {
            const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/configuracion`;
            const configRes = await axios.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

            if (configRes && configRes.data) {
                setConfigTasas({
                    tasa_bcv: configRes.data.tasa_bcv || 1,
                    tasa_cop: configRes.data.tasa_cop || 1
                });
                setMontoMora(Number(configRes.data.monto_mora) || 3.00);
            }
        } catch (err) {
            console.error("Error cargando configuración:", err);
            setErrorData("Hubo un problema al cargar la configuración. Intenta recargar.");
        } finally {
            setCargandoInicial(false);
        }
    }, []);

    useEffect(() => { cargarDatos(); }, [cargarDatos]);

    const handleSincronizarTasas = async () => {
        setActualizando(true);
        try {
            const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/configuracion/actualizar-tasas-manual`;
            await axios.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            showMessage("Tasas actualizadas desde el BCV/Fuentes externas con éxito.", "success");
            cargarDatos();
        } catch (err) {
            showMessage(err.response?.data?.message || "Error al sincronizar. Verifique la conexión con el servidor.", "danger");
        } finally {
            setActualizando(false);
        }
    };

    const handleCambioTamano = (e) => {
        setTamanoLocal(e.target.value);
        localStorage.setItem('tamanoImpresora', e.target.value);
        showMessage("Tamaño de impresora actualizado para esta PC.", "success");
    };

    const handleCambioEtiqueta = (e) => {
        setTamanoEtiqueta(e.target.value);
        localStorage.setItem('tamanoEtiqueta', e.target.value);
    };

    const handleCambioImpresoraTickets = (e) => {
        setImpresoraTickets(e.target.value);
        localStorage.setItem('nombreImpresora', e.target.value);
    };

    const handleCambioImpresoraEtiquetas = (e) => {
        setImpresoraEtiquetas(e.target.value);
        localStorage.setItem('nombreImpresoraEtiquetas', e.target.value);
    };

    if (cargandoInicial) return <Loader texto="Cargando configuración..." />;

    return (
        <Container fluid className="p-2 p-md-4 d-flex flex-column h-100 overflow-y-auto">
            <div className="d-flex flex-row justify-content-between align-items-center mb-4" style={{ flexShrink: 0 }}>
                <h4 className="text-primary fw-bold mb-0">
                    <FontAwesomeIcon icon={faCogs} className="me-2" />
                    Configuración del Sistema
                    {actualizando && <Spinner animation="border" size="sm" variant="primary" className="ms-3" />}
                </h4>
            </div>

            {errorData && <Alert variant="danger" className="shadow-sm">{errorData}</Alert>}

            <Row className="g-4">
                {tienePermiso('CONFIGURAR_HARDWARE') && (
                    <Col xs={12}>
                        <Card className="border-0 shadow-sm border-start border-warning border-4 bg-white">
                            <Card.Body className="p-4">
                                <h5 className="fw-bold text-dark mb-1"><FontAwesomeIcon icon={faPrint} className="me-2" /> Hardware Local (Impresoras)</h5>
                                <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>Esta configuración es única para esta computadora y funciona mediante QZ Tray.</p>

                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary small mb-1">Nombre Impresora de Tickets (En Windows)</Form.Label>
                                            <Form.Control type="text" value={impresoraTickets} onChange={handleCambioImpresoraTickets} className="shadow-sm border-warning mb-2" placeholder="Ej: POS-58" />

                                            <Form.Label className="fw-bold text-secondary small mb-1 mt-2">Ancho del Rollo de Tickets</Form.Label>
                                            <Form.Select value={tamanoLocal} onChange={handleCambioTamano} className="shadow-sm border-warning">
                                                <option value="58">58mm (Impresora Pequeña)</option>
                                                <option value="80">80mm (Impresora Grande)</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>

                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-bold text-secondary small mb-1">Nombre Impresora de Etiquetas (Opcional)</Form.Label>
                                            <Form.Control type="text" value={impresoraEtiquetas} onChange={handleCambioImpresoraEtiquetas} className="shadow-sm border-warning mb-2" placeholder="Si se deja en blanco usa la de Tickets" />

                                            <Form.Label className="fw-bold text-secondary small mb-1 mt-2">Tamaño de Etiqueta (Si usa térmica)</Form.Label>
                                            <Form.Select value={tamanoEtiqueta} onChange={handleCambioEtiqueta} className="shadow-sm border-warning">
                                                <option value="58x40">58mm (Ancho ticket peq.)</option>
                                                <option value="80x40">80mm (Ancho ticket gr.)</option>
                                                <option value="50x25">50x25mm (Etiqueta Estandar)</option>
                                                <option value="32x20">32x20mm (Etiqueta Pequeña)</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                )}

                <Col xs={12}>
                    <Card className="border-0 shadow-sm border-start border-info border-4">
                        <Card.Body className="p-4">
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
                                <h5 className="fw-bold text-dark mb-3 mb-md-0">Tasas de Cambio Actuales</h5>
                                
                                <div>
                                    {tienePermiso('TASA_PAGO') && (
                                        <Button variant="outline-primary" size="sm" className="fw-bold shadow-sm me-2" onClick={() => setShowRateModal(true)} disabled={actualizando}>
                                            <FontAwesomeIcon icon={faEdit} className="me-2" /> Editar Manualmente
                                        </Button>
                                    )}

                                    <Button variant="outline-info" size="sm" className="fw-bold shadow-sm" onClick={handleSincronizarTasas} disabled={actualizando}>
                                        <FontAwesomeIcon icon={faSync} className={actualizando ? "fa-spin me-2" : "me-2"} /> Sincronizar
                                    </Button>
                                </div>
                            </div>

                            <Row className="g-3 text-center justify-content-center">
                                <Col xs={12} md={6}>
                                    <div className="p-3 border rounded bg-light shadow-sm">
                                        <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>Dólar BCV (Bs)</div>
                                        <h4 className="fw-bold text-primary mb-0">Bs {configTasas.tasa_bcv}</h4>
                                    </div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div className="p-3 border rounded bg-light shadow-sm">
                                        <div className="text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>Peso Colombiano (COP)</div>
                                        <h4 className="fw-bold text-success mb-0">${configTasas.tasa_cop}</h4>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>

                {tienePermiso('TASA_MORA') && (
                    <Col xs={12}>
                        <Card className="border-0 shadow-sm border-start border-success border-4">
                            <Card.Body className="p-4">
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
                                    <h5 className="fw-bold text-dark mb-3 mb-md-0"><FontAwesomeIcon icon={faHandHoldingDollar} className="me-2" /> Parámetros de Cobranza</h5>
                                    <Button variant="outline-success" size="sm" className="fw-bold shadow-sm" onClick={() => setShowMoraModal(true)} disabled={actualizando}>
                                        <FontAwesomeIcon icon={faEdit} className="me-2" /> Cambiar Monto
                                    </Button>
                                </div>
                                <div className="p-3 border rounded bg-light shadow-sm d-flex justify-content-between align-items-center">
                                    <span className="text-muted fw-bold">Recargo automático por Mora (+15 días):</span>
                                    <h4 className="fw-bold text-success mb-0">${montoMora}</h4>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>
            
            <RateModal
                show={showRateModal}
                onHide={() => setShowRateModal(false)}
                onGuardado={cargarDatos}
                tasasAEditar={configTasas}
            />

            <MoraModal
                show={showMoraModal}
                onHide={() => setShowMoraModal(false)}
                onGuardado={cargarDatos}
                montoMora={montoMora}
            />
        </Container>
    );
}