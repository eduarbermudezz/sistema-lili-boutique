import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faXmark } from '@fortawesome/free-solid-svg-icons';

export default function TicketModal({ show, onHide, onPrint }) {
    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>Operación Exitosa</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center p-4">
                <h5>¿Desea imprimir el ticket de venta?</h5>
            </Modal.Body>
            <Modal.Footer className="justify-content-center">
                <Button variant="secondary" onClick={onHide}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </Button>
                <Button variant="primary" onClick={onPrint}>
                    <FontAwesomeIcon icon={faPrint} className="me-2" /> Imprimir
                </Button>
            </Modal.Footer>
        </Modal>
    );
}