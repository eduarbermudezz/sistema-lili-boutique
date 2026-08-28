import React from 'react';
import { Modal as BootstrapModal, ListGroup, Badge, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck } from '@fortawesome/free-solid-svg-icons';
import { Currency } from '@/utils/Currency.js';

export default function VariantSelectionModal({ 
    show, 
    onHide, 
    resultados, 
    onSelect, 
    mostrarPrecioYStock = false, 
    moneda = 'USD', 
    tasaBcv = 1 
}) {
    const simboloPrincipal = moneda === 'USD' ? '$' : 'Bs';

    return (
        <BootstrapModal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title className="fs-5 fw-bold">
                    <FontAwesomeIcon icon={faListCheck} className="me-2" /> Resultados de Búsqueda
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body className="p-0">
                <ListGroup variant="flush">
                    {resultados.map((res) => {
                        const mostrarTalla = res.talla && res.talla !== 'N/A' && res.talla.trim() !== '';
                        const mostrarColor = res.color && res.color !== 'N/A' && res.color.trim() !== '';
                        
                        const precioLocal = moneda === 'USD' ? Number(res.precio_venta_usd) : Currency.multiplicar(Number(res.precio_venta_usd), tasaBcv);
                        const sinStock = mostrarPrecioYStock && (res.stock_sucursal <= 0 || res.stock_sucursal == null);

                        return (
                            <ListGroup.Item key={res.id_presentacion} className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center p-3 hover-bg-light">
                                <div className="mb-2 mb-sm-0">
                                    <h6 className="mb-1 fw-bold text-dark">{res.nombre_base}</h6>
                                    <div className="mb-1">
                                        {mostrarTalla && <Badge bg="info" className="me-1 text-dark">{res.talla}</Badge>}
                                        {mostrarColor && <Badge bg="secondary" className="me-2">{res.color}</Badge>}
                                        {!mostrarTalla && !mostrarColor && <Badge bg="light" text="dark" className="me-2 border">Estándar</Badge>}
                                        
                                        {mostrarPrecioYStock && (
                                            <Badge bg={!sinStock ? "success" : "danger"} className="shadow-sm">
                                                {sinStock ? "❌ Agotado" : `✅ Disp: ${res.stock_sucursal ?? 0}`}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    {mostrarPrecioYStock && (
                                        <span className="text-muted fw-bold me-3" style={{ fontSize: '0.9rem' }}>
                                            Precio Base: {Currency.formatear(precioLocal, simboloPrincipal)}
                                        </span>
                                    )}
                                </div>
                                <Button 
                                    variant="outline-primary" 
                                    className="w-100 w-sm-auto fw-bold shadow-sm" 
                                    onClick={() => onSelect(res)}
                                    disabled={sinStock}
                                >
                                    Seleccionar
                                </Button>
                            </ListGroup.Item>
                        );
                    })}
                </ListGroup>
            </BootstrapModal.Body>
        </BootstrapModal>
    );
}