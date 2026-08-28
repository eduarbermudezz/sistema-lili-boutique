import React from 'react';
import { Modal, Row, Col, Badge, Table, Alert, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore } from '@fortawesome/free-solid-svg-icons';
import { Currency } from '@/utils/Currency.js';

export default function SaleDetailsModal({ 
    show, 
    onHide, 
    ventaSeleccionada, 
    formatearFecha,
    subtotalDetalle,
    descuentoDetalle,
    moraDetalle,
    totalFacturaDetalle,
    pagadoDetalle,
    deudaFinalDetalle 
}) {
    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    Detalles de la Venta #{ventaSeleccionada ? String(ventaSeleccionada.id_venta).padStart(6, '0') : ''}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {ventaSeleccionada && (
                    <>
                        <Row className="mb-4 bg-light p-3 rounded border">
                            <Col md={6}>
                                <p className="mb-1"><strong>Cliente:</strong> {ventaSeleccionada.cliente || 'Consumidor Final'}</p>
                                <p className="mb-0"><strong>C.I / RIF:</strong> {ventaSeleccionada.ced_rif_cli || 'N/A'}</p>
                            </Col>
                            <Col md={6} className="text-md-end mt-3 mt-md-0">
                                <p className="mb-1"><strong>Fecha:</strong> {formatearFecha(ventaSeleccionada.fecha)}</p>
                                <p className="mb-1"><strong>Operador:</strong> {ventaSeleccionada.operador || 'N/A'}</p>
                                {ventaSeleccionada.sucursal && (
                                    <p className="mb-0 mt-1">
                                        <Badge bg="primary">
                                            <FontAwesomeIcon icon={faStore} className="me-1" />
                                            {ventaSeleccionada.sucursal}
                                        </Badge>
                                    </p>
                                )}
                            </Col>
                        </Row>

                        <h6 className="fw-bold text-secondary border-bottom pb-2 mb-3">Artículos Facturados</h6>
                        <div className="table-responsive shadow-sm border rounded mb-4">
                            <Table size="sm" hover className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th className="text-center" style={{ width: '100px' }}>Cant.</th>
                                        <th>Descripción</th>
                                        <th className="text-end">Precio Unit.</th>
                                        <th className="text-end">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ventaSeleccionada.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="text-center fw-bold">
                                                {item.cantidad}
                                                {Number(item.cantidad_devuelta) > 0 && (
                                                    <span className="d-block text-danger mt-1" style={{ fontSize: '0.7rem' }}>
                                                        -{item.cantidad_devuelta} devuelto(s)
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {item.nombre_base}
                                                {item.talla && item.talla !== 'N/A' ? ` (Talla: ${item.talla})` : ''}
                                            </td>
                                            <td className="text-end text-muted">
                                                {Currency.formatear(Currency.dividir(item.subtotal, item.cantidad), '$')}
                                            </td>
                                            <td className="text-end fw-bold text-dark">
                                                {Currency.formatear(item.subtotal, '$')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <Row className="mt-2">
                            <Col xs={12} lg={7} className="mb-4 mb-lg-0">
                                <h6 className="fw-bold text-secondary border-bottom pb-2 mb-3">Historial de Pagos</h6>
                                {ventaSeleccionada.pagos && ventaSeleccionada.pagos.length > 0 ? (
                                    <div className="table-responsive shadow-sm border rounded">
                                        <Table size="sm" hover className="mb-0 align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="ps-3 text-start">Fecha</th>
                                                    <th className="text-center">Método</th>
                                                    <th className="text-end pe-3">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ventaSeleccionada.pagos.map((pago, idx) => (
                                                    <tr key={idx}>
                                                        <td className="ps-3 text-muted" style={{ fontSize: '0.85rem' }}>
                                                            {pago.fecha ? formatearFecha(pago.fecha) : formatearFecha(ventaSeleccionada.fecha)}
                                                        </td>
                                                        <td className="text-center">
                                                            <Badge bg={pago.es_vuelto ? "danger" : "success"} className="shadow-sm">
                                                                {pago.es_vuelto ? "VUELTO" : pago.metodo}
                                                            </Badge>
                                                        </td>
                                                        <td className={`text-end pe-3 fw-bold ${pago.es_vuelto ? 'text-danger' : 'text-success'}`}>
                                                            {pago.es_vuelto ? '-' : ''}{Currency.formatear(pago.monto_usd, '$')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Alert variant="warning" className="py-2 shadow-sm text-center">No hay pagos registrados.</Alert>
                                )}
                            </Col>

                            <Col xs={12} lg={5}>
                                <div className="d-flex justify-content-between mb-1">
                                    <span className="text-secondary">Subtotal Base:</span>
                                    <span className="fw-bold">{Currency.formatear(subtotalDetalle, '$')}</span>
                                </div>

                                {descuentoDetalle > 0 && (
                                    <div className="d-flex justify-content-between mb-1 text-danger">
                                        <span>Descuento Aplicado:</span>
                                        <span className="fw-bold">- {Currency.formatear(descuentoDetalle, '$')}</span>
                                    </div>
                                )}

                                {moraDetalle > 0 && (
                                    <div className="d-flex justify-content-between mb-1 text-warning">
                                        <span>Recargo por Mora:</span>
                                        <span className="fw-bold">+ {Currency.formatear(moraDetalle, '$')}</span>
                                    </div>
                                )}

                                <div className="d-flex justify-content-between fw-bold fs-6 mt-2 border-top pt-2 text-dark">
                                    <span>Total Documento:</span>
                                    <span>{Currency.formatear(totalFacturaDetalle, '$')}</span>
                                </div>

                                <div className="d-flex justify-content-between fw-bold text-success mb-1">
                                    <span>Total Abonado/Pagado:</span>
                                    <span>- {Currency.formatear(pagadoDetalle, '$')}</span>
                                </div>

                                <div className="d-flex justify-content-between fw-bold fs-5 mt-2 border-top pt-2 text-danger">
                                    <span>Saldo Pendiente:</span>
                                    <span>{Currency.formatear(deudaFinalDetalle > 0 ? deudaFinalDetalle : 0, '$')}</span>
                                </div>
                            </Col>
                        </Row>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cerrar</Button>
            </Modal.Footer>
        </Modal>
    );
}