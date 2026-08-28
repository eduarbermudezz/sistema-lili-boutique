import React from 'react';
import { Spinner } from 'react-bootstrap';

export default function Loader({ texto = "Cargando...", pantallaCompleta = false }) {
    if (pantallaCompleta) {
        return (
            <div 
                className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center" 
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)', zIndex: 9999 }}
            >
                <Spinner animation="border" variant="primary" style={{ width: '4rem', height: '4rem', borderWidth: '0.25em' }} />
                <h5 className="mt-4 fw-bold text-primary">{texto}</h5>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column justify-content-center align-items-center w-100 h-100 flex-grow-1 p-5">
            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem', borderWidth: '0.2em' }} />
            <h6 className="mt-3 fw-bold text-secondary">{texto}</h6>
        </div>
    );
}