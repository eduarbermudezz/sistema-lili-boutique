import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';
import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';
import { NumericFormat } from 'react-number-format';

export default function MoraModal({ show, onHide, onGuardado, montoMora }) {
    const firstInputRef = useRef();
    const { showMessage } = useMessage();

    const [formMora, setFormMora] = useState({ monto_mora: '' });
    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (show) {
            setFormMora({ monto_mora: montoMora !== undefined && montoMora !== null ? montoMora : '' });
            setFormErrors({});
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [show, montoMora]);

    const validarFormulario = () => {
        const errores = {};
        const valorNum = formMora.monto_mora;

        if (valorNum === undefined || valorNum === null || valorNum === '') {
            errores.monto_mora = 'El monto de recargo por mora es obligatorio.';
        } else if (isNaN(valorNum) || Number(valorNum) < 0) {
            errores.monto_mora = 'La mora no puede ser negativa.';
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
            const payload = { monto_mora: formMora.monto_mora };

            await axios.put(`${apiUrl}/api/configuracion/mora`, payload, config);
            showMessage("Monto de mora actualizado con éxito.", "success");
            onGuardado();
            onHide();
        } catch (err) {
            showMessage(err.response?.data?.message || "Error al actualizar la mora.", "danger");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={() => !enviando && onHide()} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-success text-white">
                <BootstrapModal.Title className="fw-bold fs-5">
                    Modificar Recargo por Mora
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body className="p-3">
                <BootstrapForm id="mora-form" onSubmit={handleSubmit} noValidate>
                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold small mb-1">Monto de penalización (USD)</BootstrapForm.Label>
                        <NumericFormat
                            required
                            customInput={BootstrapForm.Control}
                            thousandSeparator=","
                            decimalSeparator="."
                            decimalScale={2}
                            fixedDecimalScale={true}
                            value={formMora.monto_mora}
                            onValueChange={(values) => {
                                const { floatValue } = values;
                                setFormMora({ monto_mora: floatValue !== undefined ? floatValue : '' });
                                if (formErrors.monto_mora) {
                                    setFormErrors({ monto_mora: null });
                                }
                            }}
                            isInvalid={!!formErrors.monto_mora}
                            placeholder="0.00"
                            getInputRef={firstInputRef}
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.monto_mora}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>
                </BootstrapForm>
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando} type="button">
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-success" type="submit" form="mora-form" disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Cambios</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}