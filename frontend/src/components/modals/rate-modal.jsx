import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';
import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';
import { NumericFormat } from 'react-number-format';

export default function RateModal({ show, onHide, onGuardado, tasasAEditar }) {
    const firstInputRef = useRef();
    const { showMessage } = useMessage();

    const [formTasas, setFormTasas] = useState({ tasa_bcv: '', tasa_cop: '' });
    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (show) {
            if (tasasAEditar) {
                setFormTasas({
                    tasa_bcv: tasasAEditar.tasa_bcv ?? '',
                    tasa_cop: tasasAEditar.tasa_cop ?? ''
                });
            } else {
                setFormTasas({ tasa_bcv: '', tasa_cop: '' });
            }
            setFormErrors({});
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [show, tasasAEditar]);

    const validarFormulario = () => {
        const errores = {};
        const bcv = formTasas.tasa_bcv;
        const cop = formTasas.tasa_cop;

        if (bcv === undefined || bcv === null || bcv === '') {
            errores.tasa_bcv = 'La tasa Dólar BCV es obligatoria.';
        } else if (isNaN(bcv) || Number(bcv) <= 0) {
            errores.tasa_bcv = 'La tasa Dólar BCV debe ser mayor a cero.';
        }

        if (cop === undefined || cop === null || cop === '') {
            errores.tasa_cop = 'La tasa Peso Colombiano es obligatoria.';
        } else if (isNaN(cop) || Number(cop) <= 0) {
            errores.tasa_cop = 'La tasa COP debe ser mayor a cero.';
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
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
            const payload = {
                tasa_bcv: formTasas.tasa_bcv,
                tasa_cop: formTasas.tasa_cop
            };

            await axios.put(`${apiUrl}/api/configuracion/tasas`, payload, config);
            showMessage("Tasas actualizadas manualmente con éxito.", "success");
            onGuardado();
            onHide();
        } catch (err) {
            showMessage(err.response?.data?.message || "Error al guardar las tasas manualmente.", "danger");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={() => !enviando && onHide()} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title className="fw-bold fs-5">
                    Editar Tasas Manualmente
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body className="p-3">
                <BootstrapForm id="rate-form" onSubmit={handleSubmit} noValidate>
                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold small mb-1">Tasa Dólar BCV (Bs)</BootstrapForm.Label>
                        <NumericFormat
                            required
                            customInput={BootstrapForm.Control}
                            thousandSeparator=","
                            decimalSeparator="."
                            decimalScale={4}
                            fixedDecimalScale={false}
                            value={formTasas.tasa_bcv}
                            onValueChange={(values) => {
                                const { floatValue } = values;
                                setFormTasas(prev => ({ ...prev, tasa_bcv: floatValue !== undefined ? floatValue : '' }));
                                if (formErrors.tasa_bcv) {
                                    setFormErrors(prev => ({ ...prev, tasa_bcv: null }));
                                }
                            }}
                            isInvalid={!!formErrors.tasa_bcv}
                            placeholder="0.0000"
                            getInputRef={firstInputRef}
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.tasa_bcv}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>

                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold small mb-1">Tasa Peso Colombiano (COP)</BootstrapForm.Label>
                        <NumericFormat
                            required
                            customInput={BootstrapForm.Control}
                            thousandSeparator=","
                            decimalSeparator="."
                            decimalScale={2}
                            fixedDecimalScale={false}
                            value={formTasas.tasa_cop}
                            onValueChange={(values) => {
                                const { floatValue } = values;
                                setFormTasas(prev => ({ ...prev, tasa_cop: floatValue !== undefined ? floatValue : '' }));
                                if (formErrors.tasa_cop) {
                                    setFormErrors(prev => ({ ...prev, tasa_cop: null }));
                                }
                            }}
                            isInvalid={!!formErrors.tasa_cop}
                            placeholder="0.00"
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.tasa_cop}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>
                </BootstrapForm>
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando} type="button">
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="rate-form" disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Tasas</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}