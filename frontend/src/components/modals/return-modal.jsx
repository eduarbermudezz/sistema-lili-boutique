import React from 'react';
import { Modal, Alert, Table, Form, Button, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import { Currency } from '@/utils/Currency.js';

export default function ReturnModal({
    show,
    onHide,
    ventaSeleccionada,
    itemsDevolucion,
    handleCambioDevolucion,
    deudaFinalDetalle,
    totalAFavor,
    montoAbonoDeuda,
    montoNotaCredito,
    procesandoDevolucion,
    handleProcesarDevolucion
}) {
    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <Modal.Header closeButton className="bg-primary text-dark">
                <Modal.Title>
                    <FontAwesomeIcon icon={faExchangeAlt} className="me-2" />
                    Procesar Cambio / Devolución - Venta #{ventaSeleccionada ? String(ventaSeleccionada.id_venta).padStart(6, '0') : ''}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {ventaSeleccionada && (
                    <>
                        <Alert variant="info" className="shadow-sm">
                            <strong>Cliente:</strong> {ventaSeleccionada.cliente} <br />
                            Seleccione la cantidad de prendas físicas que el cliente está regresando a la tienda.
                            {deudaFinalDetalle > 0 && " Como la venta tiene un saldo pendiente, el valor de las prendas devueltas se abonará automáticamente para saldar esa deuda."}
                        </Alert>

                        <div className="table-responsive shadow-sm border rounded mb-4">
                            <Table size="sm" hover className="mb-0 align-middle text-center">
                                <thead className="table-light">
                                    <tr>
                                        <th>Artículo</th>
                                        <th>Precio Unit.</th>
                                        <th>Cant. Comprada</th>
                                        <th className="text-primary" style={{ width: '150px' }}>Cant. a Devolver</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsDevolucion.map((item, idx) => (
                                        <tr key={idx} className={item.cantidad_a_devolver > 0 ? "table-warning" : ""}>
                                            <td className="text-start ps-2">
                                                {item.nombre_base} {item.talla && item.talla !== 'N/A' ? `(${item.talla})` : ''}
                                            </td>
                                            <td className="text-muted">
                                                {Currency.formatear(Currency.dividir(item.subtotal, item.cantidad), '$')}
                                            </td>
                                            <td className="fw-bold">{item.cantidad}</td>
                                            <td>
                                               <Form.Control
                                                    type="number"
                                                    size="sm"
                                                    min="0"
                                                    max={item.cantidad_disponible}
                                                    value={item.cantidad_a_devolver}
                                                    onChange={(e) => handleCambioDevolucion(idx, e.target.value)}
                                                    onFocus={(e) => e.target.select()} 
                                                    disabled={item.cantidad_disponible <= 0} 
                                                    className="text-center fw-bold text-primary border-primary"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        <div className="mt-3 p-3 bg-light rounded border shadow-sm">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-secondary fw-bold">Valor Total Devuelto:</span>
                                <span className="fw-bold">{Currency.formatear(totalAFavor, '$')}</span>
                            </div>

                            {montoAbonoDeuda > 0 && (
                                <div className="d-flex justify-content-between mb-2 text-warning">
                                    <span className="fw-bold">Reducción automática de la deuda:</span>
                                    <span className="fw-bold">- {Currency.formatear(montoAbonoDeuda, '$')}</span>
                                </div>
                            )}

                            <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                <h6 className="mb-0 text-secondary fw-bold">Saldo a Favor generado (Nota Crédito):</h6>
                                <h4 className="mb-0 text-success fw-bold">{Currency.formatear(montoNotaCredito, '$')}</h4>
                            </div>
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer className="justify-content-between">
                <Button variant="secondary" onClick={onHide} disabled={procesandoDevolucion}>
                    Cancelar
                </Button>
                <Button variant="success" className="fw-bold px-4 shadow-sm" onClick={handleProcesarDevolucion} disabled={procesandoDevolucion || totalAFavor <= 0}>
                    {procesandoDevolucion ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                    Procesar Devolución
                </Button>
            </Modal.Footer>
        </Modal>
    );
}