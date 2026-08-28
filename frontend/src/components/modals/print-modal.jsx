import React, { useState, useEffect } from 'react';
import { Modal as BootstrapModal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBarcode, faPrint, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useMessage } from '@/context/MessageContext.jsx';
import { imprimirEtiquetaDirecta } from '@/utils/printer.js';
import { Currency } from '@/utils/Currency.js';

export default function PrintModal({ show, onHide, producto }) {
    const { showMessage } = useMessage();
    const [varianteEtiqueta, setVarianteEtiqueta] = useState('');
    const [cantidadEtiqueta, setCantidadEtiqueta] = useState(1);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (show && producto) {
            const variantes = producto.lista_variantes ? producto.lista_variantes.split('||') : [];
            if (variantes.length > 0) {
                setVarianteEtiqueta(variantes[0]);
            } else {
                setVarianteEtiqueta('unica');
            }
            setCantidadEtiqueta(1);
        }
    }, [show, producto]);

    const handleImprimir = async () => {
        if (!producto) return;

        let nombre = producto.nombre_base;
        let precio = 0;
        let codigo = producto.codigos_sku ? producto.codigos_sku.split(',')[0] : '000000';

        if (varianteEtiqueta !== 'unica' && varianteEtiqueta) {
            const partes = varianteEtiqueta.split('::');
            const talla = partes[1] !== 'N/A' ? partes[1] : '';
            const color = partes[2] !== 'N/A' ? partes[2] : '';
            precio = Number(partes[3]) || 0;

            let detalles = [];
            if (talla) detalles.push(talla);
            if (color) detalles.push(color);
            if (detalles.length > 0) nombre += ` (${detalles.join(' - ')})`;
        }

        const datosImpresion = {
            nombre_base: nombre,
            precio: precio,
            codigo: codigo
        };

        try {
            setEnviando(true);
            await imprimirEtiquetaDirecta(datosImpresion, cantidadEtiqueta);
            showMessage("Etiquetas enviadas a la impresora.", "success");
            onHide();
        } catch (error) {
            showMessage("Error comunicando con QZ Tray.", "danger");
        } finally {
            setEnviando(false); 
        }
    };

    return (
         <BootstrapModal show={show} onHide={onHide} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title>
                    <FontAwesomeIcon icon={faBarcode} className="me-2" /> Imprimir Etiquetas
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body>
                {producto && (
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Artículo a Imprimir</Form.Label>
                            <Form.Control value={producto.nombre_base} disabled />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">¿Qué variante deseas imprimir?</Form.Label>
                            <Form.Select
                                value={varianteEtiqueta}
                                onChange={(e) => setVarianteEtiqueta(e.target.value)}
                            >
                                {producto.lista_variantes ? producto.lista_variantes.split('||').map((v, i) => {
                                    const p = v.split('::');
                                    const talla = p[1] !== 'N/A' ? p[1] : '';
                                    const color = p[2] !== 'N/A' ? p[2] : '';
                                    const nombreVar = [talla, color].filter(Boolean).join(' - ') || 'Estándar';

                                    const precioUsd = Number(p[3]) || 0;
                                    const precioRedondeado = Currency.formatear(precioUsd, '').trim();

                                    return <option key={i} value={v}>{nombreVar} (Precio: ${precioRedondeado})</option>
                                }) : <option value="unica">Única Variante</option>}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">¿Cuántas etiquetas necesitas?</Form.Label>
                            <Form.Control
                                type="number"
                                min="1"
                                max="500"
                                value={cantidadEtiqueta}
                                onChange={(e) => setCantidadEtiqueta(e.target.value)}
                            />
                        </Form.Group>
                    </Form>
                )}
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleImprimir} disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Imprimiendo...</>
                    ) : (
                        <><FontAwesomeIcon icon={faPrint} className="me-2" /> Imprimir</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}