import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';
import { InputGroup } from 'react-bootstrap';
import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';

export default function EmployeeModal({
    show,
    onHide,
    onGuardado,
    empleadoAEditar,
    nacionalidades = [],
    prefijos = []
}) {
    const firstInputRef = useRef();
    const { showMessage } = useMessage();

    const [formEmpleado, setFormEmpleado] = useState({
        id_emp: '',
        nom_emp: '',
        ape_emp: '',
        ced_rif_emp: '',
        tipo_doc_emp: '',
        email_emp: '',
        num_tlf_emp: '',
        pref_tlf_emp: ''
    });

    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (show) {
            if (empleadoAEditar) {
                setFormEmpleado({ ...empleadoAEditar });
            } else {
                setFormEmpleado({
                    id_emp: '',
                    nom_emp: '',
                    ape_emp: '',
                    ced_rif_emp: '',
                    tipo_doc_emp: nacionalidades.length > 0 ? nacionalidades[0].id_tipo : '',
                    pref_tlf_emp: prefijos.length > 0 ? prefijos[0].id_pref : '',
                    num_tlf_emp: '',
                    email_emp: ''
                });
            }
            setFormErrors({});
            setTimeout(() => firstInputRef.current?.focus(), 100);
            setCargando(false);
        }
    }, [show, empleadoAEditar, nacionalidades, prefijos]);

    const handleChange = (e) => {
        const { id, value } = e.target;

        if (id === 'ced_rif_emp' && value.length > 10) return;
        if (id === 'num_tlf_emp' && value.length > 7) return;
        if (id === 'nom_emp' && value.length > 19) return;
        if (id === 'ape_emp' && value.length > 19) return;
        if (id === 'email_emp' && value.length > 30) return;

        if ((id === 'ced_rif_emp' || id === 'num_tlf_emp') && !/^\d*$/.test(value)) return;

        let valorProcesado = value;

        if (id === 'nom_emp' || id === 'ape_emp') {
            valorProcesado = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/^\s+/, '');
        }

        if (id === 'email_emp') {
            valorProcesado = value.replace(/\s+/g, '');
        }

        setFormEmpleado(prev => ({ ...prev, [id]: valorProcesado }));

        if (formErrors[id]) setFormErrors(prev => ({ ...prev, [id]: null }));
    };

    const validarFormulario = () => {
        const errores = {};

        if (!formEmpleado.ced_rif_emp || formEmpleado.ced_rif_emp.trim().length < 6 || formEmpleado.ced_rif_emp.trim().length > 10) errores.ced_rif_emp = 'La C.I. debe tener entre 6 y 10 números.';
        if (!formEmpleado.ape_emp || formEmpleado.ape_emp.trim().length < 3) errores.ape_emp = 'El apellido debe tener al menos 3 caracteres válidos.';
        if (!formEmpleado.nom_emp || formEmpleado.nom_emp.trim().length < 3) errores.nom_emp = 'El nombre debe tener al menos 3 caracteres válidos.';
        if (!formEmpleado.num_tlf_emp || formEmpleado.num_tlf_emp.trim().length !== 7) errores.num_tlf_emp = 'El número de teléfono debe tener exactamente 7 dígitos.';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formEmpleado.email_emp || !emailRegex.test(formEmpleado.email_emp)) {
            errores.email_emp = 'Debe ingresar un correo electrónico válido (ejemplo@correo.com).';
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
            const payload = { ...formEmpleado };
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

            if (empleadoAEditar && empleadoAEditar.id_emp) {
                const response = await axios.put(`${apiUrl}/api/empleados/${empleadoAEditar.id_emp}`, payload, config);
                if (response.status === 200) {
                    showMessage('Empleado actualizado exitosamente.', 'success');
                }
            } else {
                const response = await axios.post(`${apiUrl}/api/empleados`, payload, config);
                if (response.status === 201 || response.status === 200) {
                    showMessage('Empleado registrado exitosamente.', 'success');

                }
            }
            onGuardado();
            onHide();
        } catch (error) {
            console.error('Error al guardar:', error);
            showMessage(error.response?.data?.message || 'Error al conectar con el servidor.', 'danger');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={() => !enviando && onHide()} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title>
                    {empleadoAEditar && empleadoAEditar.id_emp ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body>
                {cargando ? (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5">
                        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary mb-3" />
                        <h5 className="text-muted fw-bold">Preparando información...</h5>
                    </div>
                ) : (
                    <BootstrapForm id="employee-form" onSubmit={handleSubmit} noValidate>
                        <BootstrapForm.Group className="mb-3">
                            <BootstrapForm.Label className="fw-bold">C.I.</BootstrapForm.Label>
                            <InputGroup hasValidation>
                                <BootstrapForm.Select
                                    required
                                    id="tipo_doc_emp"
                                    value={formEmpleado.tipo_doc_emp}
                                    onChange={handleChange}
                                    style={{ maxWidth: '100px' }}
                                    className="fw-bold"
                                >
                                    {nacionalidades.map((nac, index) => (
                                        <option key={index} value={nac.id_tipo}>
                                            {nac.letra_tipo}
                                        </option>
                                    ))}
                                </BootstrapForm.Select>

                                <BootstrapForm.Control
                                    required
                                    type="text"
                                    id="ced_rif_emp"
                                    value={formEmpleado.ced_rif_emp}
                                    onChange={handleChange}
                                    ref={firstInputRef}
                                    isInvalid={!!formErrors.ced_rif_emp}
                                    maxLength="10"
                                    placeholder="Ej: 12345678"
                                    onPaste={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    onCut={(e) => e.preventDefault()}
                                />
                                <BootstrapForm.Control.Feedback type="invalid">
                                    {formErrors.ced_rif_emp}
                                </BootstrapForm.Control.Feedback>
                            </InputGroup>
                        </BootstrapForm.Group>

                        <BootstrapForm.Group className="mb-3">
                            <BootstrapForm.Label className="fw-bold">Nombre</BootstrapForm.Label>
                            <BootstrapForm.Control
                                required
                                type="text"
                                id="nom_emp"
                                value={formEmpleado.nom_emp}
                                onChange={handleChange}
                                isInvalid={!!formErrors.nom_emp}
                                placeholder="Ej: Juan"
                                onPaste={(e) => e.preventDefault()}
                                onCopy={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                            />
                            <BootstrapForm.Control.Feedback type="invalid">
                                {formErrors.nom_emp}
                            </BootstrapForm.Control.Feedback>
                        </BootstrapForm.Group>

                        <BootstrapForm.Group className="mb-3">
                            <BootstrapForm.Label className="fw-bold">Apellido</BootstrapForm.Label>
                            <BootstrapForm.Control
                                required
                                type="text"
                                id="ape_emp"
                                value={formEmpleado.ape_emp}
                                onChange={handleChange}
                                isInvalid={!!formErrors.ape_emp}
                                placeholder="Ej: Pérez"
                                onPaste={(e) => e.preventDefault()}
                                onCopy={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                            />
                            <BootstrapForm.Control.Feedback type="invalid">
                                {formErrors.ape_emp}
                            </BootstrapForm.Control.Feedback>
                        </BootstrapForm.Group>

                        <BootstrapForm.Group className="mb-3">
                            <BootstrapForm.Label className="fw-bold">Teléfono</BootstrapForm.Label>
                            <InputGroup hasValidation>
                                <BootstrapForm.Select
                                    required
                                    id="pref_tlf_emp"
                                    value={formEmpleado.pref_tlf_emp}
                                    onChange={handleChange}
                                    style={{ maxWidth: '120px' }}
                                    className="fw-bold"
                                >
                                    {prefijos.map((pref, index) => (
                                        <option key={index} value={pref.id_pref}>
                                            {pref.pref_tlf}
                                        </option>
                                    ))}
                                </BootstrapForm.Select>

                                <BootstrapForm.Control
                                    required
                                    type="text"
                                    id="num_tlf_emp"
                                    value={formEmpleado.num_tlf_emp}
                                    onChange={handleChange}
                                    isInvalid={!!formErrors.num_tlf_emp}
                                    maxLength="7"
                                    placeholder="Ej: 1234567"
                                    onPaste={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    onCut={(e) => e.preventDefault()}
                                />
                                <BootstrapForm.Control.Feedback type="invalid">
                                    {formErrors.num_tlf_emp}
                                </BootstrapForm.Control.Feedback>
                            </InputGroup>
                        </BootstrapForm.Group>

                       <BootstrapForm.Group className="mb-3">
                            <BootstrapForm.Label className="fw-bold">Correo Electrónico</BootstrapForm.Label>
                            <BootstrapForm.Control
                                required
                                type="email"
                                id="email_emp"
                                value={formEmpleado.email_emp}
                                onKeyDown={(e) => e.key === ' ' && e.preventDefault()}
                                onChange={handleChange}
                                isInvalid={!!formErrors.email_emp}
                                placeholder="Ej: nombre@correo.com"
                                onPaste={(e) => e.preventDefault()}
                                onCopy={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                            />
                            <BootstrapForm.Control.Feedback type="invalid">
                                {formErrors.email_emp}
                            </BootstrapForm.Control.Feedback>
                        </BootstrapForm.Group>

                    </BootstrapForm>
                )}
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="employee-form" disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Empleado</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}