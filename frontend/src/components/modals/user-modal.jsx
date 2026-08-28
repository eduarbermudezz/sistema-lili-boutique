import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner, faUserShield } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';
import { Row, Col } from 'react-bootstrap';
import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';

export default function UserModal({ show, onHide, onGuardado, usuarioAEditar, empleados, roles, sucursales }) {
    const firstInputRef = useRef();
    const { showMessage } = useMessage();

    const [formUsuario, setFormUsuario] = useState({
        id_usu: '',
        usuario: '',
        contra_hash: '',
        emp_usu: '',
        rol_usu: '',
        id_sucursal: '',
        estatus: 'ACTIVO'
    });

    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);
    const esSuperAdmin = usuarioAEditar && parseInt(usuarioAEditar.rol_usu) === 1;

    useEffect(() => {
        if (show) {
            if (usuarioAEditar) {
                setFormUsuario({ ...usuarioAEditar, contra_hash: '' });
            } else {
                const rolesValidos = roles?.filter(r => parseInt(r.id_rol) !== 1) || [];
                const primerRol = rolesValidos.length > 0 ? rolesValidos[0].id_rol : '';
                setFormUsuario({
                    id_usu: '',
                    usuario: '',
                    contra_hash: '',
                    emp_usu: '',
                    rol_usu: primerRol,
                    id_sucursal: '',
                    estatus: 'ACTIVO'
                });
            }
            setFormErrors({});
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [show, usuarioAEditar, roles]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        if (id === 'usuario' && value.length > 10) return;
        if (id === 'contra_hash' && value.length > 15) return;

        let valorProcesado = value;

        if (id === 'usuario') {
            valorProcesado = value.replace(/[^a-zA-Z0-9]/g, '');
        }

        if (id === 'contra_hash') {
            valorProcesado = value.replace(/\s+/g, '');
        }

        setFormUsuario(prev => ({ ...prev, [id]: valorProcesado }));
        if (formErrors[id]) {
            setFormErrors(prev => ({ ...prev, [id]: null }));
        }
    };

    const validarFormulario = () => {
        const errores = {};
        if (!formUsuario.emp_usu || formUsuario.emp_usu === '') {
            errores.emp_usu = 'Debe seleccionar un empleado vinculado.';
        }

        if (!formUsuario.id_sucursal || formUsuario.id_sucursal === '') {
            errores.id_sucursal = 'Debe seleccionar una sucursal.';
        }

        if (!formUsuario.usuario || formUsuario.usuario.trim().length < 3 || formUsuario.usuario.trim().length > 10) {
            errores.usuario = 'El nombre de usuario debe tener entre 3 y 10 caracteres alfanuméricos.';
        }

        if (!usuarioAEditar && (!formUsuario.contra_hash || formUsuario.contra_hash.trim().length < 4 || formUsuario.contra_hash.trim().length > 15)) {
            errores.contra_hash = 'La contraseña es obligatoria para usuarios nuevos (entre 4 y 15 caracteres).';
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
            const payload = { ...formUsuario };

            if (esSuperAdmin) payload.rol_usu = 1;

            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

            if (usuarioAEditar && usuarioAEditar.id_usu) {
                const response = await axios.put(`${apiUrl}/api/usuarios/${usuarioAEditar.id_usu}`, payload, config);
                if (response.status === 200) {
                    showMessage('Usuario actualizado exitosamente.', 'success');
                }
            } else {
                const response = await axios.post(`${apiUrl}/api/usuarios`, payload, config);
                if (response.status === 201 || response.status === 200) {
                    showMessage('Usuario registrado exitosamente.', 'success');
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
                    {usuarioAEditar && usuarioAEditar.id_usu ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body>
                <BootstrapForm id="user-form" onSubmit={handleSubmit} noValidate>
                    <Row className="g-2 mb-3">
                        <Col xs={12} sm={8}>
                            <BootstrapForm.Group>
                                <BootstrapForm.Label className="fw-bold">Usuario</BootstrapForm.Label>
                                <BootstrapForm.Control
                                    required
                                    type="text"
                                    id="usuario"
                                    value={formUsuario.usuario}
                                    onChange={handleChange}
                                    ref={firstInputRef}
                                    isInvalid={!!formErrors.usuario}
                                    placeholder="Ej: admin123"
                                    onPaste={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    onCut={(e) => e.preventDefault()}
                                />
                                <BootstrapForm.Control.Feedback type="invalid">
                                    {formErrors.usuario}
                                </BootstrapForm.Control.Feedback>
                            </BootstrapForm.Group>
                        </Col>

                        <Col xs={12} sm={4}>
                            <BootstrapForm.Group>
                                <BootstrapForm.Label className="fw-bold">Estatus</BootstrapForm.Label>
                                <BootstrapForm.Select
                                    required
                                    id="estatus"
                                    value={formUsuario.estatus}
                                    onChange={handleChange}
                                    disabled={esSuperAdmin}
                                    className="fw-bold"
                                >
                                    <option value="ACTIVO">Activo</option>
                                    <option value="INACTIVO">Inactivo</option>
                                </BootstrapForm.Select>
                            </BootstrapForm.Group>
                        </Col>
                    </Row>

                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Contraseña {usuarioAEditar && "(Opcional)"}</BootstrapForm.Label>
                        <BootstrapForm.Control
                            type="password"
                            id="contra_hash"
                            value={formUsuario.contra_hash}
                            onChange={handleChange}
                            isInvalid={!!formErrors.contra_hash}
                            placeholder={usuarioAEditar ? "Dejar en blanco para no cambiar" : "Ingrese contraseña"}
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.contra_hash}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>

                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Empleado</BootstrapForm.Label>
                        <BootstrapForm.Select
                            required
                            id="emp_usu"
                            value={formUsuario.emp_usu}
                            onChange={handleChange}
                            isInvalid={!!formErrors.emp_usu}
                            className="fw-bold"
                        >
                            <option value="">Seleccione un empleado</option>
                            {empleados?.map(e => (
                                <option key={e.id_emp} value={e.id_emp}>{e.nom_emp} {e.ape_emp}</option>
                            ))}
                        </BootstrapForm.Select>
                        <BootstrapForm.Control.Feedback type="invalid">{formErrors.emp_usu}</BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>

                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold text-primary">Sucursal Asignada</BootstrapForm.Label>
                        <BootstrapForm.Select
                            required
                            id="id_sucursal"
                            value={formUsuario.id_sucursal}
                            onChange={handleChange}
                            className="fw-bold"
                            isInvalid={!!formErrors.id_sucursal}
                        >
                            <option value="">Seleccione una sucursal</option>
                            {sucursales?.map(s => (
                                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
                            ))}
                        </BootstrapForm.Select>
                        <BootstrapForm.Control.Feedback type="invalid">{formErrors.id_sucursal}</BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>

                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Rol</BootstrapForm.Label>
                        {esSuperAdmin ? (
                            <div className="p-2 border rounded bg-light fw-bold text-primary shadow-sm">
                                <FontAwesomeIcon icon={faUserShield} className="me-2" />
                                Super Administrador
                            </div>
                        ) : (
                            <BootstrapForm.Select
                                required
                                id="rol_usu"
                                value={formUsuario.rol_usu}
                                onChange={handleChange}
                                className="fw-bold"
                                isInvalid={!!formErrors.rol_usu}
                            >
                                {roles?.filter(r => parseInt(r.id_rol) !== 1).map(r => (
                                    <option key={r.id_rol} value={r.id_rol}>{r.nom_rol}</option>
                                ))}
                            </BootstrapForm.Select>
                        )}
                    </BootstrapForm.Group>
                </BootstrapForm>
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="user-form" disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Usuario</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}