import React from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalculator } from '@fortawesome/free-solid-svg-icons';

export default function CalculatorModal({
    show,
    onHide,
    calcMonto,
    setCalcMonto,
    calcOrigen,
    setCalcOrigen,
    monedaActualMetodo,
    simboloInput,
    calcularConversion,
    aplicarCalculo
}) {
    return (
            <Modal show={show} onHide={onHide} centered backdrop="static">
                <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <FontAwesomeIcon icon={faCalculator} className="me-2" />
                    Convertir a {monedaActualMetodo}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-3">
                <Form.Group className="mb-2">
                    <Form.Label className="small fw-bold text-muted mb-1">Monto</Form.Label>
                    <InputGroup size="sm">
                        <Form.Control 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={calcMonto} 
                            onChange={e => setCalcMonto(e.target.value)} 
                            autoFocus 
                            placeholder="Ej: 50" 
                        />
                        <Form.Select 
                            value={calcOrigen} 
                            onChange={e => setCalcOrigen(e.target.value)} 
                            style={{ maxWidth: '80px' }}
                        >
                            <option value="USD">USD</option>
                            <option value="VES">VES</option>
                            <option value="COP">COP</option>
                        </Form.Select>
                    </InputGroup>
                </Form.Group>
                <div className="text-center mt-3 p-2 bg-light border rounded">
                    <span className="text-muted small d-block mb-1">Equivalente a registrar:</span>
                    <h3 className="text-primary fw-bold mb-0">
                        {simboloInput} {calcularConversion()}
                    </h3>
                </div>
            </Modal.Body>
            <Modal.Footer className="p-1 justify-content-center">
                <Button variant="secondary" size="sm" onClick={onHide}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={aplicarCalculo} disabled={Number(calcMonto) <= 0}>Aplicar al Monto</Button>
            </Modal.Footer>
        </Modal>
    );
}