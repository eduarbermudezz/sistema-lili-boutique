import React, { useRef, useState, useEffect } from 'react';
import { Row, Col, Card, Container, Modal as BootstrapModal, Form, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faXmark, faTrash, faBoxOpen, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/buttons/button.jsx';
import Loader from '@/components/loader/loader.jsx';
import axios from 'axios';

export default function ProductModal({ show, onHide, onProductAdded, onProductUpdated, productoAEditar, codigoEscaneado, limpiarCodigoEscaneado, tasaBcv }) {
    const nombreRef = useRef();
    const [categorias, setCategorias] = useState([]);
    const [baseData, setBaseData] = useState({
        nombre_base: '', categ_prod: '', margen_ganancia: 0, usa_margen_categoria: true
    });
    const [presentaciones, setPresentaciones] = useState([]);

    const [cargandoDatos, setCargandoDatos] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [formErrors, setFormErrors] = useState({}); 
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const inicializarModal = async () => {
            if (!show) {
                if (isMounted) {
                    setBaseData({ nombre_base: '', categ_prod: '', margen_ganancia: 0, usa_margen_categoria: true });
                    setPresentaciones([]);
                    setErrorMessage('');
                    setFormErrors({}); 
                }
                return;
            }

            setCargandoDatos(true);
            setErrorMessage('');
            setFormErrors({}); 

            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

                let cats = categorias;
                if (cats.length === 0) {
                    const resCateg = await axios.get(`${apiUrl}/api/categorias`);
                    cats = resCateg.data;
                    if (isMounted) setCategorias(cats);
                }

                if (productoAEditar) {
                    const resVars = await axios.get(`${apiUrl}/api/productos/${productoAEditar.id_prod}/presentaciones`);

                    if (isMounted) {
                        setBaseData({
                            nombre_base: productoAEditar.nombre_base || '',
                            categ_prod: productoAEditar.categ_prod || '',
                            margen_ganancia: productoAEditar.margen_ganancia ?? 0,
                            usa_margen_categoria: productoAEditar.usa_margen_categoria !== undefined ? Boolean(productoAEditar.usa_margen_categoria) : true
                        });

                        if (resVars.data && resVars.data.length > 0) {
                            setPresentaciones(resVars.data.map(p => ({
                                ...p,
                                codigo_barras: p.codigo_barras || '',
                                talla: p.talla || '',
                                color: p.color || '',
                                costo_usd: p.costo_usd ?? 0,
                                precio_venta_usd: p.precio_venta_usd ?? 0,
                                stock: p.stock ?? 0,
                                cant_minima_mayor: p.cant_minima_mayor ?? 0,
                                punto_reorden: p.punto_reorden ?? 0
                            })));
                        } else {
                            setPresentaciones([{ id_presentacion: null, codigo_barras: '', talla: '', color: '', stock: 0, costo_usd: 0, precio_venta_usd: 0, cant_minima_mayor: 0, punto_reorden: 0 }]);
                        }
                    }
                } else {
                    if (isMounted) {
                        const catInicial = cats.length > 0 ? cats[0].id_categ : '';
                        const margenInicial = cats.length > 0 ? (cats[0].margen_ganancia_defecto !== undefined ? Number(cats[0].margen_ganancia_defecto) : 0) : 0;

                        setBaseData({
                            nombre_base: '',
                            categ_prod: catInicial,
                            margen_ganancia: margenInicial,
                            usa_margen_categoria: true
                        });
                        setPresentaciones([{ id_presentacion: null, codigo_barras: '', talla: '', color: '', stock: 0, costo_usd: 0, precio_venta_usd: 0, cant_minima_mayor: 0, punto_reorden: 0 }]);
                    }
                }
            } catch (error) {
                console.error("Error inicializando modal:", error);
                if (isMounted) setErrorMessage('Hubo un error de conexión al preparar el formulario.', 'danger');
            } finally {
                if (isMounted) {
                    setCargandoDatos(false);
                    setTimeout(() => nombreRef.current?.focus(), 150);
                }
            }
        };

        inicializarModal();

        return () => { isMounted = false; };
    }, [show, productoAEditar]);

    useEffect(() => {
        if (codigoEscaneado && !cargandoDatos) {
            limpiarCodigoEscaneado();
            setPresentaciones(prev => prev.map((p, i) => i === 0 ? { ...p, codigo_barras: codigoEscaneado.substring(0, 13) } : p));
            if (formErrors[`codigo_barras_0`]) setFormErrors(prev => ({ ...prev, [`codigo_barras_0`]: null }));
        }
    }, [codigoEscaneado, limpiarCodigoEscaneado, cargandoDatos]);

    const bufferEscaneo = useRef('');
    const timerEscaneo = useRef(null);
    const accionEscaneoRef = useRef();

    useEffect(() => {
        accionEscaneoRef.current = (codigo) => {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.name === 'codigo_barras') return;

            const codigoFinal = codigo.substring(0, 13);
            setPresentaciones(prev => {
                const nuevas = [...prev];
                const indexVacio = nuevas.findIndex(p => !p.codigo_barras || p.codigo_barras.trim() === '');
                const targetIndex = indexVacio !== -1 ? indexVacio : 0;

                nuevas[targetIndex] = { ...nuevas[targetIndex], codigo_barras: codigoFinal };
                if (formErrors[`codigo_barras_${targetIndex}`]) setFormErrors(errs => ({ ...errs, [`codigo_barras_${targetIndex}`]: null }));

                return nuevas;
            });
        };
    });

    useEffect(() => {
        const manejarEscaneoFondo = (e) => {
            if (!show || cargandoDatos) return;

            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'textarea' || activeTag === 'select') return;

            if (e.key === 'Enter') {
                if (bufferEscaneo.current.length >= 3) {
                    e.preventDefault();
                    const codigoEscaneado = bufferEscaneo.current;

                    const activeEl = document.activeElement;
                    if (activeEl && activeEl.tagName === 'INPUT' && activeEl.name !== 'codigo_barras') {
                        let valActual = activeEl.value;
                        if (valActual.endsWith(codigoEscaneado)) {
                            const valorLimpio = valActual.slice(0, -codigoEscaneado.length);
                            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                            if (nativeSetter) {
                                nativeSetter.call(activeEl, valorLimpio);
                                activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }
                    }
                    accionEscaneoRef.current(codigoEscaneado);
                }
                bufferEscaneo.current = '';
                if (timerEscaneo.current) clearTimeout(timerEscaneo.current);
                return;
            }
            if (e.key.length === 1) {
                bufferEscaneo.current += e.key;
                if (timerEscaneo.current) clearTimeout(timerEscaneo.current);
                timerEscaneo.current = setTimeout(() => {
                    bufferEscaneo.current = '';
                }, 150);
            }
        };
        window.addEventListener('keydown', manejarEscaneoFondo);
        return () => {
            window.removeEventListener('keydown', manejarEscaneoFondo);
            if (timerEscaneo.current) clearTimeout(timerEscaneo.current);
        };
    }, [show, cargandoDatos]);

    const calcularPrecioVenta = (costo, margen) => {
        const c = parseFloat(costo) || 0;
        const m = parseFloat(margen) || 0;
        if (m >= 100) return (c + (c * (m / 100))).toFixed(2);
        return (c / (1 - (m / 100))).toFixed(2);
    };

    const actualizarPreciosVenta = (nuevoMargen) => {
        setPresentaciones(prev => prev.map(p => ({
            ...p,
            precio_venta_usd: calcularPrecioVenta(p.costo_usd, nuevoMargen)
        })));
    };

    const handleBaseChange = (e) => {
        const { id, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        if (type === 'number' && parseFloat(val) < 0) return;

        if (formErrors[id]) setFormErrors(prev => ({ ...prev, [id]: null }));

        if (id === 'categ_prod') {
            const catSeleccionada = categorias.find(c => String(c.id_categ) === String(val));
            const nuevoMargen = baseData.usa_margen_categoria && catSeleccionada
                ? (catSeleccionada.margen_ganancia_defecto !== undefined ? Number(catSeleccionada.margen_ganancia_defecto) : 0)
                : baseData.margen_ganancia;

            setBaseData(prev => ({ ...prev, [id]: val, margen_ganancia: nuevoMargen }));
            actualizarPreciosVenta(nuevoMargen);
            return;
        }

        if (id === 'usa_margen_categoria') {
            const catSeleccionada = categorias.find(c => String(c.id_categ) === String(baseData.categ_prod));
            const nuevoMargen = val && catSeleccionada
                ? (catSeleccionada.margen_ganancia_defecto !== undefined ? Number(catSeleccionada.margen_ganancia_defecto) : 0)
                : baseData.margen_ganancia;

            setBaseData(prev => ({ ...prev, usa_margen_categoria: val, margen_ganancia: nuevoMargen }));
            actualizarPreciosVenta(nuevoMargen);
            return;
        }

        setBaseData(prev => ({ ...prev, [id]: val }));
        if (id === 'margen_ganancia') {
            actualizarPreciosVenta(val);
        }
    };

    const handlePresentacionChange = (index, e) => {
        const { name, value, type } = e.target;
        if (type === 'number' && parseFloat(value) < 0) return;
        if (name === 'codigo_barras' && value.length > 13) return;

        if (formErrors[`${name}_${index}`]) setFormErrors(prev => ({ ...prev, [`${name}_${index}`]: null }));

        setPresentaciones(prev => prev.map((p, i) => {
            if (i !== index) return p;
            const updatedP = { ...p, [name]: value };
            if (name === 'costo_usd') {
                updatedP.precio_venta_usd = calcularPrecioVenta(value, baseData.margen_ganancia);
            }
            return updatedP;
        }));
    };

    const agregarVariante = () => setPresentaciones([...presentaciones, { id_presentacion: null, codigo_barras: '', talla: '', color: '', stock: 0, costo_usd: 0, precio_venta_usd: 0, cant_minima_mayor: 0, punto_reorden: 0 }]);
    const eliminarVariante = (index) => { if (presentaciones.length > 1) setPresentaciones(presentaciones.filter((_, i) => i !== index)); };

    const validarFormulario = () => {
        const errores = {};

        if (!baseData.nombre_base || baseData.nombre_base.trim().length < 3) {
            errores.nombre_base = 'El nombre debe tener al menos 3 caracteres.';
        }
        if (!baseData.categ_prod) {
            errores.categ_prod = 'Debes seleccionar una categoría.';
        }
        if (baseData.margen_ganancia === '' || Number(baseData.margen_ganancia) < 0) {
            errores.margen_ganancia = 'El margen debe ser un valor válido.';
        }

        setFormErrors(errores);
        return Object.keys(errores).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validarFormulario()) return; 

        setErrorMessage('');
        setEnviando(true);
        const payload = { ...baseData, presentaciones };
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            if (productoAEditar) {
                await axios.put(`${apiUrl}/api/productos/${productoAEditar.id_prod}`, payload);
                onProductUpdated();
            } else {
                await axios.post(`${apiUrl}/api/productos`, payload);
                onProductAdded();
            }
            onHide();
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Error al guardar el artículo.', "danger");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <BootstrapModal show={show} onHide={onHide} size="xl" centered backdrop="static" fullscreen="md-down" scrollable>
            <BootstrapModal.Header closeButton className="bg-primary text-white">
                <BootstrapModal.Title>
                    <FontAwesomeIcon icon={faBoxOpen} className="me-2" />
                    {productoAEditar ? 'Editar Artículo' : 'Registrar Nuevo Artículo'}
                </BootstrapModal.Title>
            </BootstrapModal.Header>
            <BootstrapModal.Body className="p-2 p-md-3 bg-light position-relative">
                <Container fluid className="p-0">
                    {errorMessage && <Alert variant="danger" className="mb-3 shadow-sm">{errorMessage}</Alert>}

                    {cargandoDatos ? (
                        <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '300px' }}>
                            <Loader texto={productoAEditar ? "Cargando variantes del producto..." : "Preparando formulario..."} />
                        </div>
                    ) : (
                        <Form id="product-form" onSubmit={handleSubmit} noValidate onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName.toLowerCase() === 'input') e.preventDefault(); }}>
                            <Row className="g-2 g-md-3">
                                <Col xs={12} lg={3}>
                                    <Card className="border-primary shadow-sm h-100">
                                        <Card.Header className="bg-primary text-white fw-bold py-2">Modelo Base</Card.Header>
                                        <Card.Body className="p-2 p-md-3">
                                            
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small mb-1">Nombre (Ej: Perfume 212) *</Form.Label>
                                                <Form.Control 
                                                    type="text" 
                                                    id="nombre_base" 
                                                    value={baseData.nombre_base} 
                                                    size="sm" 
                                                    onChange={handleBaseChange} 
                                                    ref={nombreRef} 
                                                    required 
                                                    isInvalid={!!formErrors.nombre_base}
                                                    className="border-primary" 
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {formErrors.nombre_base}
                                                </Form.Control.Feedback>
                                            </Form.Group>

                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-bold small mb-1">Categoría *</Form.Label>
                                                <Form.Select 
                                                    id="categ_prod" 
                                                    value={baseData.categ_prod} 
                                                    size="sm" 
                                                    onChange={handleBaseChange} 
                                                    required
                                                    isInvalid={!!formErrors.categ_prod}
                                                >
                                                    {categorias.length === 0 && <option value="">Sin categorías</option>}
                                                    {categorias.map((cat, index) => <option key={index} value={cat.id_categ}>{cat.descrip_categ}</option>)}
                                                </Form.Select>
                                                <Form.Control.Feedback type="invalid">
                                                    {formErrors.categ_prod}
                                                </Form.Control.Feedback>
                                            </Form.Group>

                                            <div className="p-2 bg-light border border-primary-subtle rounded shadow-sm">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span className="fw-bold text-primary small">Margen (%)</span>
                                                    <Form.Check type="switch" id="usa_margen_categoria" label={<small>Auto</small>} checked={baseData.usa_margen_categoria} onChange={handleBaseChange} />
                                                </div>
                                                <Form.Control 
                                                    type="number" 
                                                    min="0" 
                                                    id="margen_ganancia" 
                                                    value={baseData.margen_ganancia} 
                                                    size="sm" 
                                                    onChange={handleBaseChange} 
                                                    required 
                                                    isInvalid={!!formErrors.margen_ganancia}
                                                    className="fw-bold text-center" 
                                                    readOnly={baseData.usa_margen_categoria} 
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {formErrors.margen_ganancia}
                                                </Form.Control.Feedback>
                                                
                                                <div className="mt-2 text-center border-top pt-2">
                                                    <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>El margen define el precio final de todas las variantes.</small>
                                                </div>
                                            </div>

                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col xs={12} lg={9}>
                                    <Card className="border-dark shadow-sm h-100">
                                        <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-2">
                                            <span className="fw-bold">Variantes e Inventario</span>
                                            <Button variant="light" size="sm" onClick={agregarVariante} className="text-dark fw-bold py-0 px-2" disabled={presentaciones.length === 0}>+ Añadir Variante</Button>
                                        </Card.Header>
                                        <Card.Body className="p-2 p-md-3 bg-light" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                                            {presentaciones.map((pres, index) => (
                                                <div key={index} className="mb-3 p-3 bg-white border border-secondary-subtle rounded position-relative shadow-sm pt-4">
                                                    {presentaciones.length > 1 && (
                                                        <Button variant="danger" size="sm" onClick={() => eliminarVariante(index)} className="position-absolute top-0 end-0 m-1 py-0 px-2 shadow-sm z-1">
                                                            <FontAwesomeIcon icon={faTrash} style={{ fontSize: '0.7rem' }} />
                                                        </Button>
                                                    )}

                                                    <Row className="g-2 mb-3">
                                                        <Col md={4}>
                                                            <Form.Label className="small fw-bold text-muted mb-1 text-primary">Cód. Barras / Ref *</Form.Label>
                                                            <Form.Control 
                                                                size="sm" 
                                                                name="codigo_barras" 
                                                                maxLength="13" 
                                                                value={pres.codigo_barras} 
                                                                onChange={(e) => handlePresentacionChange(index, e)} 
                                                                className="border-primary" 
                                                                onFocus={(e) => e.target.select()}
                                                               
                                                            />
                                                        </Col>
                                                        <Col md={3}>
                                                            <Form.Label className="small fw-bold text-muted mb-1">Talla / Espec.</Form.Label>
                                                            <Form.Control size="sm" name="talla" placeholder="Ej: L, 42" value={pres.talla} onChange={(e) => handlePresentacionChange(index, e)} />
                                                        </Col>
                                                        <Col md={3}>
                                                            <Form.Label className="small fw-bold text-muted mb-1">Color / Aroma</Form.Label>
                                                            <Form.Control size="sm" name="color" placeholder="Ej: Rojo" value={pres.color} onChange={(e) => handlePresentacionChange(index, e)} />
                                                        </Col>
                                                        <Col md={2}>
                                                            <Form.Label className="small fw-bold text-danger mb-1" title="Minimo stock antes de alertar">Pto. Reorden</Form.Label>
                                                            <Form.Control size="sm" type="number" min="0" name="punto_reorden" value={pres.punto_reorden} onChange={(e) => handlePresentacionChange(index, e)} className="border-danger text-center" />
                                                        </Col>
                                                    </Row>

                                                    <Row className="g-2">
                                                        <Col md={3}>
                                                            <Form.Label className="small text-danger fw-bold mb-1">Costo ($) *</Form.Label>
                                                            <Form.Control 
                                                                size="sm" 
                                                                type="number" 
                                                                min="0" 
                                                                step="0.01" 
                                                                name="costo_usd" 
                                                                value={pres.costo_usd} 
                                                                onChange={(e) => handlePresentacionChange(index, e)} 
                                                                className="border-danger fw-bold text-center"
                                                            />
                                                        </Col>
                                                        <Col md={3}>
                                                            <Form.Label className="small text-success fw-bold mb-1">P. Venta ($)</Form.Label>
                                                            <Form.Control size="sm" type="text" value={pres.precio_venta_usd} readOnly className="border-success fw-bold text-center bg-light text-muted" title="Precio calculado: Costo + Margen" />
                                                        </Col>
                                                        <Col md={3}>
                                                            <Form.Label className="small fw-bold mb-1 text-muted">A partir de</Form.Label>
                                                            <Form.Control size="sm" type="number" min="0" name="cant_minima_mayor" value={pres.cant_minima_mayor} onChange={(e) => handlePresentacionChange(index, e)} className="text-center" placeholder="Cant. Mínima" />
                                                        </Col>
                                                        <Col md={3}>
                                                            <Form.Label className="small text-primary fw-bold mb-1">Stock Actual</Form.Label>
                                                            <Form.Control
                                                                size="sm"
                                                                type="text"
                                                                value={pres.stock}
                                                                readOnly={true}
                                                                className="border-primary text-center fw-bold bg-light text-muted"
                                                                title="Para ingresar o modificar inventario, diríjase al módulo de Entradas de Mercancía"
                                                                style={{ cursor: 'not-allowed' }}
                                                            />
                                                        </Col>
                                                    </Row>
                                                </div>
                                            ))}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Form>
                    )}
                </Container>
            </BootstrapModal.Body>
            <BootstrapModal.Footer>
                <button className="btn btn-secondary" onClick={onHide} disabled={cargandoDatos || enviando}>
                    <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
                </button>
                <button className="btn btn-primary" type="submit" form="product-form" disabled={cargandoDatos || enviando}>
                    {enviando ? (
                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Guardando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Artículo</>
                    )}
                </button>
            </BootstrapModal.Footer>
        </BootstrapModal>
    );
}