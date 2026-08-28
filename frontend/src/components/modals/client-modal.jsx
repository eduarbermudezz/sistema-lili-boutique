import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';

export default function ClientModal({ show, onHide, onClientAdded, onClientUpdated, clienteAEditar }) {
    const firstInputRef = useRef();
    const { showMessage } = useMessage();

    const [nacionalidades, setNacionalidades] = useState([]);
    const [prefijos, setPrefijos] = useState([]);

    const [formData, setFormData] = useState({
        nacionalidad_cli: '',
        ced_rif_cli: '',
        ra_soc_cli: '',
        prefijo_tlf_cli: '',
        num_tlf_cli: ''
    });

    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [cargando, setCargando] = useState(true);


    useEffect(() => {
        const cargarSelectores = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                const [resNac, resPref] = await Promise.all([
                    axios.get(`${apiUrl}/api/nacionalidades`),
                    axios.get(`${apiUrl}/api/prefijos`)
                ]);

                setNacionalidades(resNac.data);
                setPrefijos(resPref.data);

                if (resNac.data.length > 0 && resPref.data.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        nacionalidad_cli: resNac.data[0].id_tipo,
                        prefijo_tlf_cli: resPref.data[0].id_pref
                    }));
                }
            } catch (error) {
                console.error('Error al cargar selectores:', error);
                showMessage('Error al cargar las listas desplegables.', 'danger');
            } finally {
                setCargando(false);
            }
        };
        cargarSelectores();
    }, []);

    useEffect(() => {
        if (show) {
            if (clienteAEditar) {
                setFormData({
                    nacionalidad_cli: clienteAEditar.tipo_doc_cli || (nacionalidades.length > 0 ? nacionalidades[0].id_tipo : ''),
                    ced_rif_cli: clienteAEditar.ced_rif_cli || '',
                    ra_soc_cli: clienteAEditar.ra_soc_cli || '',
                    prefijo_tlf_cli: clienteAEditar.pref_tlf_cli || (prefijos.length > 0 ? prefijos[0].id_pref : ''),
                    num_tlf_cli: clienteAEditar.num_tlf_cli || ''
                });
            } else {
                setFormData({
                    ced_rif_cli: '',
                    ra_soc_cli: '',
                    num_tlf_cli: '',
                    nacionalidad_cli: nacionalidades.length > 0 ? nacionalidades[0].id_tipo : '',
                    prefijo_tlf_cli: prefijos.length > 0 ? prefijos[0].id_pref : ''
                });
            }
            setFormErrors({});
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [show, clienteAEditar, nacionalidades, prefijos]);

    const handleChange = (e) => {
        const { id, value } = e.target;

        if (id === 'ced_rif_cli' && value.length > 10) return;
        if (id === 'num_tlf_cli' && value.length > 7) return;
        if (id === 'ra_soc_cli' && value.length > 30) return;

        if ((id === 'ced_rif_cli' || id === 'num_tlf_cli') && !/^\d*$/.test(value)) return;

        let valorProcesado = value;

        if (id === 'ra_soc_cli') {
            valorProcesado = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').replace(/^\s+/, '');
        }

        setFormData(prev => ({ ...prev, [id]: valorProcesado }));

        if (formErrors[id]) setFormErrors(prev => ({ ...prev, [id]: null }));
    };

    const validarFormulario = () => {
        const errores = {};

        if (!formData.ced_rif_cli || formData.ced_rif_cli.length < 6 || formData.ced_rif_cli.length > 10) {
            errores.ced_rif_cli = 'La C.I./RIF debe tener entre 6 y 10 números.';
        }

        if (!formData.ra_soc_cli || formData.ra_soc_cli.trim().length < 3) {
            errores.ra_soc_cli = 'La razón social debe tener al menos 3 caracteres válidos.';
        }

        if (!formData.num_tlf_cli || formData.num_tlf_cli.trim().length !== 7) {
            errores.num_tlf_cli = 'El número de teléfono es obligatorio y debe tener exactamente 7 dígitos.';
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

            if (clienteAEditar && clienteAEditar.id_cli) {
                const response = await axios.put(`${apiUrl}/api/clientes/${clienteAEditar.id_cli}`, payload);
                if (response.status === 200) {
                    showMessage('Cliente actualizado exitosamente.', 'success');
                    if (onClientUpdated) onClientUpdated({ ...clienteAEditar, ...formData });
                    onHide();
                }
            } else {
                const response = await axios.post(`${apiUrl}/api/clientes`, payload);
                if (response.status === 201 || response.status === 200) {
                    showMessage('Cliente registrado exitosamente.', 'success');
                    if (onClientAdded) onClientAdded(response.data);
                    onHide();
                }
            }
        } catch (error) {
            console.error('Error al guardar:', error);
            showMessage(error.response?.data?.message || 'Error al conectar con el servidor.', 'danger');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={onHide} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title>
                    {clienteAEditar && clienteAEditar.id_cli ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body>
                {cargando ? (
                    <div className="d-flex flex-column align-items-center justify-content-center py-5">
                        <FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary mb-3" />
                        <h5 className="text-muted fw-bold">Preparando información...</h5>
                    </div>
                ) : (
                    <BootstrapForm id="client-form" onSubmit={handleSubmit} noValidate>
                        <BootstrapForm.Group className="mb-3">
                            <BootstrapForm.Label className="fw-bold">C.I. / RIF</BootstrapForm.Label>
                            <InputGroup hasValidation>
                                <BootstrapForm.Select
                                    required
                                    id="nacionalidad_cli"
                                    value={formData.nacionalidad_cli}
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
                                    id="ced_rif_cli"
                                    value={formData.ced_rif_cli}
                                    onChange={handleChange}
                                    ref={firstInputRef}
                                    isInvalid={!!formErrors.ced_rif_cli}
                                    maxLength="10"
                                    placeholder="Ej: 12345678"
                                    onPaste={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    onCut={(e) => e.preventDefault()}
                                />
                                <BootstrapForm.Control.Feedback type="invalid">
                                    {formErrors.ced_rif_cli}
                                </BootstrapForm.Control.Feedback>
                            </InputGroup>
                        </BootstrapForm.Group>

                        <BootstrapForm.Group className="mb-3">
                            <BootstrapForm.Label className="fw-bold">Razón Social</BootstrapForm.Label>
                            <BootstrapForm.Control
                                required
                                type="text"
                                id="ra_soc_cli"
                                value={formData.ra_soc_cli}
                                onChange={handleChange}
                                isInvalid={!!formErrors.ra_soc_cli}
                                placeholder="Ej: Juan Pérez"
                                onPaste={(e) => e.preventDefault()}
                                onCopy={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                            />
                            <BootstrapForm.Control.Feedback type="invalid">
                                {formErrors.ra_soc_cli}
                            </BootstrapForm.Control.Feedback>
                        </BootstrapForm.Group>

                        <BootstrapForm.Group className="mb-3">
                            <BootstrapForm.Label className="fw-bold">Teléfono</BootstrapForm.Label>
                            <InputGroup hasValidation>
                                <BootstrapForm.Select
                                    required
                                    id="prefijo_tlf_cli"
                                    value={formData.prefijo_tlf_cli}
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
                                    id="num_tlf_cli"
                                    value={formData.num_tlf_cli}
                                    onChange={handleChange}
                                    isInvalid={!!formErrors.num_tlf_cli}
                                    maxLength="7"
                                    placeholder="Ej: 1234567"
                                    onPaste={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    onCut={(e) => e.preventDefault()}
                                />
                                <BootstrapForm.Control.Feedback type="invalid">
                                    {formErrors.num_tlf_cli}
                                </BootstrapForm.Control.Feedback>
                            </InputGroup>
                        </BootstrapForm.Group>
                    </BootstrapForm>
                )}
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando || cargando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="client-form" disabled={enviando || cargando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Cliente</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}