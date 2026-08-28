import React from 'react';
import { Modal, Button, Table, Row, Col, Badge, Collapse, Form, InputGroup, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faShareNodes, faBox, faEyeSlash, faEye, 
    faMoneyBillWave, faExchangeAlt, faPlus, faTrash, faCalculator,faHandHoldingDollar
} from '@fortawesome/free-solid-svg-icons';
import { Currency } from '@/utils/Currency.js';

export default function CobranzaModal({
    show,
    onHide,
    clienteActual,
    documentos,
    docExpandido,
    toggleDetalle,
    idVentaSeleccionada,
    setIdVentaSeleccionada,
    generarYCompartirImagen,
    generandoImagen,
    formatearMonto,
    handleToggleMora,
    procesandoMora,
    pagosAgregados,
    setPagosAgregados,
    agregarPagoLista,
    metodos,
    idMetodo,
    setIdMetodo,
    esVuelto,
    setEsVuelto,
    puedeDarVuelto,
    saldoFavorCliente,
    metodoEncontrado,
    simboloInput,
    montoIngresado,
    setMontoIngresado,
    setShowCalc,
    deudaMaximaUsdSeleccionada,
    totalPagadoUsd,
    deudaCalculada,
    sobranteUsd,
    handleProcesarPago,
    procesandoPago
}) {
    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="fw-bold fs-5">Cobranza: {clienteActual?.ra_soc_cli}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-2 p-md-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold text-secondary mb-0 small">DOCUMENTOS PENDIENTES:</h6>
                    <Button variant="outline-success" size="sm" onClick={generarYCompartirImagen} disabled={generandoImagen}>
                        <FontAwesomeIcon icon={faShareNodes} className="me-1" /> Compartir
                    </Button>
                </div>

                <div className="table-responsive shadow-sm border rounded mb-3" style={{ maxHeight: '250px' }}>
                    <Table size="sm" hover className="mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                        <thead className="table-light sticky-top">
                            <tr>
                                <th>#</th>
                                <th>Plazo</th>
                                <th className="text-end">Deuda</th>
                                <th className="text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documentos.map(f => (
                                <React.Fragment key={f.id_venta}>
                                    <tr>
                                        <td className="fw-bold">{f.id_venta}</td>
                                        <td>
                                            <span className="d-block">{new Date(f.fecha).toLocaleDateString()}</span>
                                            <Badge bg={f.dias_transcurridos > 15 ? "danger" : "info"} className="mt-1">{f.dias_transcurridos > 15 ? `Vencida (+${f.dias_transcurridos - 15}d)` : `Vence en ${15 - f.dias_transcurridos}d`}</Badge>
                                        </td>
                                        <td className="text-end text-danger fw-bold">{formatearMonto(f.deuda_factura)}</td>
                                        <td className="text-center"><Button variant={docExpandido === f.id_venta ? "secondary" : "outline-primary"} size="sm" className="px-2 py-0" onClick={() => toggleDetalle(f.id_venta)}><FontAwesomeIcon icon={docExpandido === f.id_venta ? faEyeSlash : faEye} /></Button></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={4} className="p-0 border-0">
                                            <Collapse in={docExpandido === f.id_venta}>
                                                <div className="bg-light p-2 border-bottom border-primary border-opacity-25">
                                                    <Row>
                                                        <Col xs={12} md={7}>
                                                            <h6 className="fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}><FontAwesomeIcon icon={faBox} className="me-1" /> Productos Comprados:</h6>
                                                            <ul className="mb-0 ps-3 text-dark" style={{ fontSize: '0.8rem' }}>{f.detalles?.map((det, i) => (<li key={i}>{det.cantidad_vendida}x {det.nombre_base}</li>))}</ul>
                                                        </Col>
                                                        <Col xs={12} md={5} className="mt-2 mt-md-0 border-start pl-md-2">
                                                            <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                                                                <span className="text-secondary">Subtotal Documento:</span>
                                                                <span className="fw-bold">{Currency.formatear(Currency.restar(f.monto_total, f.recargo_mora), '$')}</span>
                                                            </div>
                                                            <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.8rem' }}>
                                                                <span className="text-secondary">¿Aplica Mora?</span>
                                                                <Form.Check
                                                                    type="switch"
                                                                    id={`switch-mora-${f.id_venta}`}
                                                                    checked={f.aplica_mora === 1}
                                                                    onChange={() => handleToggleMora(f.id_venta, f.aplica_mora === 1)}
                                                                    disabled={procesandoMora}
                                                                    className="m-0"
                                                                />
                                                            </div>
                                                            {Number(f.recargo_mora) > 0 && (
                                                                <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                                                                    <span className="text-danger">Mora por atraso (+15d):</span>
                                                                    <span className="fw-bold text-danger">+{Currency.formatear(f.recargo_mora, '$')}</span>
                                                                </div>
                                                            )}
                                                            <div className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                                                                <span className="text-success"><FontAwesomeIcon icon={faMoneyBillWave} className="me-1" />Abonado:</span>
                                                                <span className="fw-bold text-success">-{Currency.formatear(f.monto_pagado, '$')}</span>
                                                            </div>
                                                            <div className="d-flex justify-content-between pt-1 border-top" style={{ fontSize: '0.8rem' }}>
                                                                <span className="text-danger fw-bold">Deuda Actual:</span>
                                                                <span className="fw-bold text-danger">{Currency.formatear(f.deuda_factura, '$')}</span>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                </div>
                                            </Collapse>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </Table>
                </div>

                <div className="bg-light p-3 border rounded shadow-sm">
                    <Form.Group className="mb-2">
                        <Form.Label className="fw-bold small text-secondary">¿Qué documento cancela?</Form.Label>
                        <Form.Select size="sm" value={idVentaSeleccionada} onChange={e => {
                            setIdVentaSeleccionada(e.target.value);
                            setPagosAgregados([]);
                        }}>
                            {documentos.length > 1 && <option value="todas">➔ PAGAR TODO SELECCIONADO</option>}
                            {documentos.map(f => <option key={f.id_venta} value={f.id_venta}>Documento #{f.id_venta} ({Currency.formatear(f.deuda_factura, '$')})</option>)}
                        </Form.Select>
                    </Form.Group>

                    <Form onSubmit={agregarPagoLista}>
                        <Row className="g-1 align-items-center mb-2">
                            <Col xs={12} className="d-flex justify-content-between align-items-center px-1 mb-1">
                                <span className="fw-bold text-secondary" style={{ fontSize: '0.75rem' }}>MÉTODOS DE PAGO</span>
                                {puedeDarVuelto && (
                                    <Form.Check type="switch" id="vuelto-switch" label={<span className={esVuelto ? "text-danger fw-bold" : "text-muted"} style={{ fontSize: '0.75rem' }}>Dar Vuelto</span>} checked={esVuelto} onChange={(e) => setEsVuelto(e.target.checked)} className="mb-0" />
                                )}
                            </Col>
                            <Col xs={12} sm={5}>
                                <Form.Select size="sm" value={idMetodo} onChange={e => setIdMetodo(e.target.value)} className={`fw-bold shadow-none ${esVuelto ? 'border-danger text-danger' : ''}`}>
                                    {metodos.map(m => <option key={m.id_metodo} value={m.id_metodo}>{m.descripcion}</option>)}
                                </Form.Select>
                                {Number(metodoEncontrado?.id_metodo) === 120009 && (
                                    <div className="mt-1 d-flex justify-content-center">
                                        <Badge bg={saldoFavorCliente > 0 ? "success" : "danger"} className="shadow-sm">
                                            Saldo Disp: {Currency.formatear(saldoFavorCliente, '$')}
                                        </Badge>
                                    </div>
                                )}
                            </Col>
                            <Col xs={7} sm={4}>
                                <InputGroup size="sm" className={`shadow-none ${esVuelto ? 'border-danger' : ''}`}>
                                    <InputGroup.Text className={`fw-bold px-1 ${esVuelto ? 'bg-danger text-white border-danger' : ''}`}>{simboloInput}</InputGroup.Text>
                                    <Form.Control type="number" step="0.01" min="0" value={montoIngresado} onChange={e => setMontoIngresado(e.target.value)} className={`fw-bold ${esVuelto ? 'text-danger border-danger' : ''}`} placeholder="0.00" />
                                    <Button variant="outline-secondary" onClick={() => setShowCalc(true)} title="Convertir Divisa">
                                        <FontAwesomeIcon icon={faCalculator} />
                                    </Button>
                                </InputGroup>
                            </Col>
                            <Col xs={5} sm={3}>
                                <Button variant={esVuelto ? "danger" : "primary"} type="submit" size="sm" className="w-100 fw-bold p-1" disabled={(!esVuelto && deudaCalculada <= 0) || (esVuelto && !puedeDarVuelto)}>
                                    <FontAwesomeIcon icon={esVuelto ? faExchangeAlt : faPlus} /> {esVuelto ? 'Vuelto' : 'Añadir'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>

                    {pagosAgregados.length > 0 && (
                        <ListGroup variant="flush" className="mb-2 border-top border-bottom" style={{ maxHeight: '110px', overflowY: 'auto' }}>
                            {pagosAgregados.map(pago => (
                                <ListGroup.Item key={pago.id_pago_temp} className={`d-flex justify-content-between align-items-center p-1 px-2 border-bottom-0 bg-transparent ${pago.es_vuelto ? 'border-danger border-start border-3' : ''}`}>
                                    <div>
                                        <Badge bg={pago.es_vuelto ? "danger" : "secondary"} className="me-1" style={{ fontSize: '0.65rem' }}>{pago.es_vuelto ? "VUELTO" : pago.descripcion}</Badge>
                                        <span className={`fw-bold ${pago.es_vuelto ? 'text-danger' : ''}`} style={{ fontSize: '0.75rem' }}>
                                            {Currency.formatear(Math.abs(pago.monto_usd), '$')}
                                        </span>
                                    </div>
                                    <Button variant="link" className="text-danger p-0 border-0 m-0" onClick={() => setPagosAgregados(pagosAgregados.filter(p => p.id_pago_temp !== pago.id_pago_temp))}><FontAwesomeIcon icon={faTrash} size="sm" /></Button>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}

                    <div className="d-flex justify-content-between fw-bold align-items-center fs-6 mt-1">
                        <span>Neto a Pagar:</span>
                        <span>{Currency.formatear(deudaMaximaUsdSeleccionada, '$')}</span>
                    </div>
                    <div className="d-flex justify-content-between fw-bold align-items-center fs-6 mt-1">
                        <span className="text-success">Total Abonado:</span>
                        <span className="text-success text-end">{Currency.formatear(totalPagadoUsd, '$')}</span>
                    </div>
                    {deudaCalculada > 0 && (
                        <div className="d-flex justify-content-between fw-bold align-items-center fs-6 mt-1">
                            <span className="text-danger">Falta:</span>
                            <span className="text-danger text-end">{Currency.formatear(deudaCalculada, '$')}</span>
                        </div>
                    )}
                    {sobranteUsd > 0 && (
                        <div className="d-flex justify-content-between fw-bold text-warning align-items-center fs-6 mt-1 bg-warning bg-opacity-10 px-2 py-1 rounded">
                            <span>Sobrante (Pendiente Vuelto):</span>
                            <span className="text-end">{Currency.formatear(sobranteUsd, '$')}</span>
                        </div>
                    )}

                    <Button variant={sobranteUsd > 0 ? "warning" : "success"} onClick={handleProcesarPago} className="w-100 fw-bold py-2 shadow-sm mt-3" disabled={procesandoPago || pagosAgregados.length === 0 || sobranteUsd > 0}>
                        <FontAwesomeIcon icon={faHandHoldingDollar} className="me-2" />
                        {sobranteUsd > 0 ? 'REGISTRE EL VUELTO' : (idVentaSeleccionada === 'todas' && deudaCalculada <= 0 ? 'PAGAR TODO' : 'PROCESAR PAGO')}
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
}