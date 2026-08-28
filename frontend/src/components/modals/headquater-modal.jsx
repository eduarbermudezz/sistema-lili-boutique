import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';
import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';

export default function SucursalModal({ show, onHide, onGuardado, sucursalAEditar }) {
    const firstInputRef = useRef();
    const { showMessage } = useMessage();

    const [formSucursal, setFormSucursal] = useState({ id_sucursal: '', nombre: '', direccion: '' });
    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (show) {
            if (sucursalAEditar) {
                setFormSucursal({ ...sucursalAEditar });
            } else {
                setFormSucursal({ id_sucursal: '', nombre: '', direccion: '' });
            }
            setFormErrors({});
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [show, sucursalAEditar]);

    const handleChange = (e) => {
        const { id, value } = e.target;

        if (id === 'nombre' && value.length > 30) return;
        if (id === 'direccion' && value.length > 50) return;

        let valorProcesado = value;

        if (id === 'nombre' || id === 'direccion') {
            valorProcesado = value.replace(/^\s+/, '');
        }

        setFormSucursal(prev => ({ ...prev, [id]: valorProcesado }));
        if (formErrors[id]) {
            setFormErrors(prev => ({ ...prev, [id]: null }));
        }
    };

    const validarFormulario = () => {
        const errores = {};

        if (!formSucursal.nombre || formSucursal.nombre.length < 3 || formSucursal.nombre.length > 30) {
            errores.nombre = 'El nombre de la sucursal debe tener entre 3 y 30 caracteres.';
        }

        if (!formSucursal.direccion || formSucursal.direccion.length < 3 || formSucursal.direccion.length > 50) {
            errores.direccion = 'La dirección debe tener entre 3 y 50 caracteres.';
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
            const payload = { ...formSucursal };
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

            if (sucursalAEditar && sucursalAEditar.id_sucursal) {
                const response = await axios.put(`${apiUrl}/api/sucursales/${sucursalAEditar.id_sucursal}`, payload, config);
                if (response.status === 200) {
                    showMessage('Sucursal actualizada exitosamente.', 'success');
                }
            } else {
                const response = await axios.post(`${apiUrl}/api/sucursales`, payload, config);
                if (response.status === 201 || response.status === 200) {
                    showMessage('Sucursal registrada exitosamente.', 'success');
                }
            }
            onGuardado();
            onHide();
        } catch (error) {
            console.error('Error al guardar sucursal:', error);
            showMessage(error.response?.data?.message || 'Error al conectar con el servidor.', 'danger');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={() => !enviando && onHide()} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title>
                    {sucursalAEditar && sucursalAEditar.id_sucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body>
                <BootstrapForm id="sucursal-form" onSubmit={handleSubmit} noValidate>
                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Nombre de la Sucursal</BootstrapForm.Label>
                        <BootstrapForm.Control
                            required
                            type="text"
                            id="nombre"
                            value={formSucursal.nombre}
                            onChange={handleChange}
                            ref={firstInputRef}
                            isInvalid={!!formErrors.nombre}
                            placeholder="Ej: Sucursal Centro"
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.nombre}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>

                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Dirección o Referencia</BootstrapForm.Label>
                        <BootstrapForm.Control
                            as="textarea"
                            rows={3}
                            id="direccion"
                            value={formSucursal.direccion}
                            onChange={handleChange}
                            isInvalid={!!formErrors.direccion}
                            placeholder="Ej: Av. Principal, al lado de..."
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.direccion}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>
                </BootstrapForm>
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="sucursal-form" disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Sucursal</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}