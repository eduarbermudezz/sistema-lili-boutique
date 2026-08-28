import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';

import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';

export default function ProviderModal({ show, onHide, onProviderAdded, onProviderUpdated, proveedorAEditar }) {
    const nombreInputRef = useRef();
    const { showMessage } = useMessage();

    const [formData, setFormData] = useState({
        nombre: ''
    });

    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (show) {
            if (proveedorAEditar) {
                setFormData({
                    nombre: proveedorAEditar.nombre || ''
                });
            } else {
                setFormData({
                    nombre: ''
                });
            }
            setFormErrors({});
            setTimeout(() => nombreInputRef.current?.focus(), 100);
        }
    }, [show, proveedorAEditar]);

    const handleChange = (e) => {
        const { id, value } = e.target;

        let valorProcesado = value;

        if (id === 'nombre') {
            valorProcesado = value.replace(/^\s+/, '');
        }

        setFormData(prev => ({ ...prev, [id]: valorProcesado }));

        if (formErrors[id]) {
            setFormErrors(prev => ({ ...prev, [id]: null }));
        }
    };

    const validarFormulario = () => {
        const errores = {};

        if (!formData.nombre || formData.nombre.trim().length < 3) {
            errores.nombre = 'El nombre debe tener al menos 3 caracteres válidos.';
        }

        setFormErrors(errores);
        return Object.keys(errores).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;

        setEnviando(true);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const payload = { ...formData };

            if (proveedorAEditar && proveedorAEditar.id_prov) {
                const response = await axios.put(`${apiUrl}/api/proveedores/${proveedorAEditar.id_prov}`, payload);
                if (response.status === 200) {
                    if (onProviderUpdated) onProviderUpdated({ ...proveedorAEditar, ...formData });
                    onHide();
                }
            } else {
                const response = await axios.post(`${apiUrl}/api/proveedores`, payload);
                if (response.status === 201 || response.status === 200) {
                    if (onProviderAdded) onProviderAdded(response.data);
                    onHide();
                }
            }
        } catch (error) {
            console.error('Error al guardar:', error);
            showMessage(error.response?.data?.message || 'Error al conectar con el servidor.', "danger");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={onHide} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title>
                    {proveedorAEditar && proveedorAEditar.id_prov ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body>
                <BootstrapForm id="provider-form" onSubmit={handleSubmit} noValidate>
                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Nombre</BootstrapForm.Label>
                        <BootstrapForm.Control
                            required
                            type="text"
                            id="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            ref={nombreInputRef}
                            isInvalid={!!formErrors.nombre}
                            placeholder="Ej: Shein"
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.nombre}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>
                </BootstrapForm>
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="provider-form" disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Proveedor</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}