import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';
import { useRef, useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';

export default function MetodoModal({ show, onHide, onGuardado, metodoAEditar }) {
    const firstInputRef = useRef();
    const { showMessage } = useMessage();

    const [formMetodo, setFormMetodo] = useState({ id_metodo: '', descripcion: '', moneda: 'VES' });
    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (show) {
            if (metodoAEditar) {
                setFormMetodo({ ...metodoAEditar });
            } else {
                setFormMetodo({ id_metodo: '', descripcion: '', moneda: 'VES' });
            }
            setFormErrors({});
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [show, metodoAEditar]);

    const handleChange = (e) => {
        const { id, value } = e.target;

        if (id === 'descripcion' && value.length > 30) return;

        let valorProcesado = value;
        if (id === 'descripcion') {
            valorProcesado = value.replace(/^\s+/, '');
        }

        setFormMetodo(prev => ({ ...prev, [id]: valorProcesado }));
        if (formErrors[id]) {
            setFormErrors(prev => ({ ...prev, [id]: null }));
        }
    };

    const validarFormulario = () => {
        const errores = {};

        if (!formMetodo.descripcion || formMetodo.descripcion.trim().length < 3 || formMetodo.descripcion.trim().length > 50) {
            errores.descripcion = 'La descripción debe tener entre 3 y 30 caracteres.';
        }

        if (!formMetodo.moneda) {
            errores.moneda = 'Debe seleccionar una moneda base.';
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
            const payload = { ...formMetodo };
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

            if (metodoAEditar && metodoAEditar.id_metodo) {
                const response = await axios.put(`${apiUrl}/api/metodos-pago/${metodoAEditar.id_metodo}`, payload, config);
                if (response.status === 200) {
                    showMessage('Método de pago actualizado exitosamente.', 'success');
                }
            } else {
                const response = await axios.post(`${apiUrl}/api/metodos-pago`, payload, config);
                if (response.status === 201 || response.status === 200) {
                    showMessage('Método de pago registrado exitosamente.', 'success');
                }
            }
            onGuardado();
            onHide();
        } catch (error) {
            console.error('Error al guardar método:', error);
            showMessage(error.response?.data?.message || 'Error al conectar con el servidor.', 'danger');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={() => !enviando && onHide()} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title>
                    {metodoAEditar && metodoAEditar.id_metodo ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body>
                <BootstrapForm id="method-form" onSubmit={handleSubmit} noValidate>
                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Descripción del Pago</BootstrapForm.Label>
                        <BootstrapForm.Control
                            required
                            type="text"
                            id="descripcion"
                            value={formMetodo.descripcion}
                            onChange={handleChange}
                            ref={firstInputRef}
                            isInvalid={!!formErrors.descripcion}
                            placeholder="Ej: Zelle, Pago Móvil..."
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.descripcion}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>

                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Moneda Base</BootstrapForm.Label>
                        <BootstrapForm.Select
                            required
                            id="moneda"
                            value={formMetodo.moneda}
                            onChange={handleChange}
                            className="fw-bold"
                            isInvalid={!!formErrors.moneda}
                        >
                            <option value="VES">Bolívares (VES)</option>
                            <option value="USD">Dólares (USD)</option>
                            <option value="COP">Pesos Colombianos (COP)</option>
                        </BootstrapForm.Select>
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.moneda}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>
                </BootstrapForm>
            </BootstrapModal.Body>
                <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="method-form" disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Método</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}