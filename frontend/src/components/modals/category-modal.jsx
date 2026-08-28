import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';
import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';
import { NumericFormat } from 'react-number-format';

export default function CategoryModal({ show, onHide, onGuardado, categoriaAEditar }) {
    const firstInputRef = useRef();
    const { showMessage } = useMessage();

    const [formCategoria, setFormCategoria] = useState({ id_categ: '', descrip_categ: '', margen_ganancia_defecto: '' });
    const [formErrors, setFormErrors] = useState({});
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (show) {
            if (categoriaAEditar) {
                setFormCategoria({ ...categoriaAEditar });
            } else {
                setFormCategoria({ id_categ: '', descrip_categ: '', margen_ganancia_defecto: '' });
            }
            setFormErrors({});
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
    }, [show, categoriaAEditar]);

    const handleChange = (e) => {
        const { id, value } = e.target;

        if (id === 'descrip_categ' && value.length > 30) return;

        let valorProcesado = value;

        if (id === 'descrip_categ') {
            valorProcesado = value.replace(/^\s+/, '');
        }

        setFormCategoria(prev => ({ ...prev, [id]: valorProcesado }));
        if (formErrors[id]) {
            setFormErrors(prev => ({ ...prev, [id]: null }));
        }
    };

    const validarFormulario = () => {
        const errores = {};

        const valorNum = formCategoria.margen_ganancia_defecto;

        if (valorNum === undefined || valorNum === null || valorNum === '') {
            errores.margen_ganancia_defecto = 'El margen de ganancia es obligatorio.';
        } else if (isNaN(valorNum) || valorNum <= 0) {
            errores.margen_ganancia_defecto = 'El margen de ganancia debe ser mayor a cero.';
        } else if (valorNum > 100) {
            errores.margen_ganancia_defecto = 'El margen de ganancia no puede ser mayor a 100.00%.';
        }

        if (!formCategoria.descrip_categ || formCategoria.descrip_categ.length < 3 || formCategoria.descrip_categ.length > 30) {
            errores.descrip_categ = 'El nombre de la categoría debe tener entre 3 y 30 caracteres.';
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
            const payload = { ...formCategoria };
            const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };

            if (categoriaAEditar && categoriaAEditar.id_categ) {
                const response = await axios.put(`${apiUrl}/api/categorias/${categoriaAEditar.id_categ}`, payload, config);
                if (response.status === 200) {
                    showMessage('Categoría actualizada exitosamente.', 'success');
                }
            } else {
                const response = await axios.post(`${apiUrl}/api/categorias`, payload, config);
                if (response.status === 201 || response.status === 200) {
                    showMessage('Categoría registrada exitosamente.', 'success');
                }
            }
            onGuardado();
            onHide();
        } catch (error) {
            console.error('Error al guardar categoria:', error);
            showMessage(error.response?.data?.message || 'Error al conectar con el servidor.', 'danger');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={() => !enviando && onHide()} centered backdrop="static">
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title>
                    {categoriaAEditar && categoriaAEditar.id_categ ? 'Editar Categoría' : 'Nueva Categoría'}
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body>
                <BootstrapForm id="category-form" onSubmit={handleSubmit} noValidate>
                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Nombre de la Categoría</BootstrapForm.Label>
                        <BootstrapForm.Control
                            required
                            type="text"
                            id="descrip_categ"
                            value={formCategoria.descrip_categ}
                            onChange={handleChange}
                            ref={firstInputRef}
                            isInvalid={!!formErrors.descrip_categ}
                            placeholder="Ej: Estandar"
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.descrip_categ}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>

                    <BootstrapForm.Group className="mb-3">
                        <BootstrapForm.Label className="fw-bold">Margen (%)</BootstrapForm.Label>
                        <NumericFormat
                            required
                            customInput={BootstrapForm.Control}
                            thousandSeparator=","
                            decimalSeparator="."
                            decimalScale={2}
                            fixedDecimalScale={true}
                            value={formCategoria.margen_ganancia_defecto}
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                            onValueChange={(values) => {
                                const { floatValue } = values;
                                setFormCategoria(prev => ({
                                    ...prev,
                                    margen_ganancia_defecto: floatValue !== undefined ? floatValue : ''
                                }));

                                if (formErrors.margen_ganancia_defecto) {
                                    setFormErrors(prev => ({ ...prev, margen_ganancia_defecto: null }));
                                }
                            }}
                            isInvalid={!!formErrors.margen_ganancia_defecto}
                            placeholder="0.00"
                        />
                        <BootstrapForm.Control.Feedback type="invalid">
                            {formErrors.margen_ganancia_defecto}
                        </BootstrapForm.Control.Feedback>
                    </BootstrapForm.Group>
                </BootstrapForm>
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={enviando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="category-form" disabled={enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Categoría</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}