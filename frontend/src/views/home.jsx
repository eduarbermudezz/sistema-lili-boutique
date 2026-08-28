import React, { useState, useEffect, useRef } from 'react';
import { Currency } from '@/utils/Currency.js';
import { Container, Row, Col, Card, Form, Table, ListGroup, InputGroup, Badge } from 'react-bootstrap';
import Button from '@/components/buttons/button.jsx';
import ClientModal from '@/components/modals/client-modal.jsx';
import VariantSelectionModal from '@/components/modals/variant-selection-modal.jsx';
import TicketModal from '@/components/modals/ticket-modal.jsx';
import CalculatorModal from '@/components/modals/calculator-modal.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTrash, faCartShopping, faCashRegister, faPlus, faExchangeAlt, faCalculator } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useMessage } from '@/context/MessageContext.jsx';
import Loader from '@/components/loader/loader.jsx';
import { imprimirTicketDirecto } from '@/utils/printer.js';

export default function Home() {
    const [carrito, setCarrito] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [clientes, setClientes] = useState([]);
    const [tasaBcv, setTasaBcv] = useState(1);
    const [tasaCop, setTasaCop] = useState(1);
    const [metodosPagoDb, setMetodosPagoDb] = useState([]);
    const [pagosAgregados, setPagosAgregados] = useState([]);
    const [metodoSeleccionado, setMetodoSeleccionado] = useState('');
    const [montoIngresado, setMontoIngresado] = useState('');

    const [descDetalPct, setDescDetalPct] = useState(0);
    const [descMayorPct, setDescMayorPct] = useState(0);
    const [esVuelto, setEsVuelto] = useState(false);

    const [clienteId, setClienteId] = useState('');
    const [tipoOperacion, setTipoOperacion] = useState('contado');
    const [procesando, setProcesando] = useState(false);
    const [motivoAjuste, setMotivoAjuste] = useState('');
    const [moneda, setMoneda] = useState('VES');
    const [cedulaBusqueda, setCedulaBusqueda] = useState('');
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [showModalCliente, setShowModalCliente] = useState(false);
    const [clientePrellenado, setClientePrellenado] = useState(null);
    const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
    const [showModalResultados, setShowModalResultados] = useState(false);
    const { showMessage } = useMessage();
    const buscadorRef = useRef(null);
    const [ultimaVentaRealizada, setUltimaVentaRealizada] = useState(null);
    const [showModalTicket, setShowModalTicket] = useState(false);

    const [showCalc, setShowCalc] = useState(false);
    const [calcMonto, setCalcMonto] = useState('');
    const [calcOrigen, setCalcOrigen] = useState('USD');

    const [aplicaMora, setAplicaMora] = useState(true);
    const [montoMora, setMontoMora] = useState(3.00);
    const [saldoFavorCliente, setSaldoFavorCliente] = useState(0);
    const [cargandoConfig, setCargandoConfig] = useState(true);

    const handlePrintTicket = async () => {
        if (!ultimaVentaRealizada) return;
        try {
            await imprimirTicketDirecto(ultimaVentaRealizada, tasaBcv);
            showMessage("Impresión enviada correctamente.", "success");
            setShowModalTicket(false);
        } catch (error) {
            console.error(error);
            showMessage("Error: " + error.message, "danger");
        }
    };

    useEffect(() => {
        const cargarDatos = async () => {
            setCargandoConfig(true);
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            try { const resClientes = await axios.get(`${apiUrl}/api/clientes`); setClientes(resClientes.data); } catch (e) { }
            try {
                const resConfig = await axios.get(`${apiUrl}/api/configuracion`);
                setTasaBcv(Number(resConfig.data.tasa_bcv) || 1);
                setTasaCop(Number(resConfig.data.tasa_cop) || 1);
                setMontoMora(Number(resConfig.data.monto_mora) || 3.00);
            } catch (e) { setTasaBcv(1); setTasaCop(1); setMontoMora(3.00); }
            try {
                const resMetodos = await axios.get(`${apiUrl}/api/ventas/metodos-pago`);
                setMetodosPagoDb(resMetodos.data);
                if (resMetodos.data.length > 0) setMetodoSeleccionado(resMetodos.data[0].id_metodo);
            } catch (e) { }
            setCargandoConfig(false);
        };
        cargarDatos();
        buscadorRef.current?.focus();
    }, []);

    const toggleMoneda = () => setMoneda(prev => prev === 'USD' ? 'VES' : 'USD');

    const buscarProductoDirecto = async (codigoABuscar) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await axios.get(`${apiUrl}/api/productos/buscar?q=${encodeURIComponent(codigoABuscar)}`);
            const resultados = response.data;
            if (resultados && resultados.length > 0) {
                if (resultados.length === 1 && resultados[0].stock_sucursal > 0) {
                    procesarSeleccionProducto(resultados[0]);
                } else {
                    setResultadosBusqueda(resultados);
                    setShowModalResultados(true);
                }
            } else {
                showMessage(`No se encontró el artículo: "${codigoABuscar}"`, "info");
            }
        } catch (error) { showMessage("Error de conexión al buscar.", "danger"); }
    };

    const cargarSaldoCliente = async (id) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');
            const res = await axios.get(`${apiUrl}/api/clientes/${id}/saldo`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaldoFavorCliente(Number(res.data.saldo) || 0);
        } catch (error) {
            setSaldoFavorCliente(0);
        }
    };

    const handleBuscarProductoForm = (e) => { e.preventDefault(); if (busqueda.trim() !== '') buscarProductoDirecto(busqueda.trim()); };

    const recalcularItem = (item, cantidad) => {
        const cantEvaluar = Number(cantidad) || 0;
        return { ...item, cantidad: cantEvaluar, precio_venta_usd: Number(item.precio_base_usd) };
    };

    const procesarSeleccionProducto = (productoReal) => {
        setShowModalResultados(false);
        const precioBase = Number(productoReal.precio_venta_usd) || 0;
        agregarAlCarrito({
            id_presentacion: productoReal.id_presentacion,
            nombre_base: productoReal.nombre_base,
            talla: productoReal.talla,
            color: productoReal.color,
            precio_base_usd: precioBase,
            precio_venta_usd: precioBase,
            porcentaje_descuento_mayor: Number(productoReal.porcentaje_descuento_mayor) || 0,
            cant_minima_mayor: Number(productoReal.cant_minima_mayor) || 0,
            stock_sucursal: Number(productoReal.stock_sucursal) || 0,
            cantidad: 1
        });
        setBusqueda(''); buscadorRef.current?.focus();
    };

    const agregarAlCarrito = (producto) => {
        setCarrito(prev => {
            const existe = prev.find(p => p.id_presentacion === producto.id_presentacion);
            if (existe) {
                const nuevaCant = existe.cantidad + producto.cantidad;
                if (nuevaCant > existe.stock_sucursal) {
                    showMessage(`Stock insuficiente. Solo quedan ${existe.stock_sucursal} disponibles.`, "warning");
                    return prev;
                }
                return prev.map(p => p.id_presentacion === producto.id_presentacion ? recalcularItem(p, nuevaCant) : p);
            }
            if (producto.cantidad > producto.stock_sucursal) {
                showMessage(`Stock insuficiente. Solo quedan ${producto.stock_sucursal} disponibles.`, "warning");
                return prev;
            }
            return [...prev, recalcularItem(producto, producto.cantidad)];
        });
    };

    const actualizarCantidad = (id, nuevaCantidad) => {
        const cant = Number(nuevaCantidad) || 0;
        if (cant <= 0) return;
        setCarrito(carrito.map(item => {
            if (item.id_presentacion === id) {
                if (cant > item.stock_sucursal) {
                    showMessage(`Stock insuficiente. Solo quedan ${item.stock_sucursal} disponibles.`, "warning");
                    return item;
                }
                return recalcularItem(item, cant);
            }
            return item;
        }));
    };

    const eliminarDelCarrito = (id) => setCarrito(carrito.filter(item => item.id_presentacion !== id));

    const handleBuscarCliente = () => {
        if (!cedulaBusqueda.trim()) return;
        const cedulaLimpia = cedulaBusqueda.trim().toLowerCase();
        if (cedulaLimpia === '00000000' || cedulaLimpia === 'v00000000' || cedulaLimpia === 'v-00000000') {
            showMessage("Esta cédula es de uso interno. Usa 'Sacar de Inventario (Ajuste)'.", "info"); setCedulaBusqueda(''); return;
        }
        const encontrado = clientes.find(c => c.ced_rif_cli.toLowerCase() === cedulaLimpia);
        if (encontrado) {
            setClienteSeleccionado(encontrado);
            setClienteId(encontrado.id_cli);
            cargarSaldoCliente(encontrado.id_cli);
        }
        else { setClientePrellenado({ ced_rif_cli: cedulaBusqueda.trim(), ra_soc_cli: '', num_tlf_cli: '' }); setShowModalCliente(true); }
    };

    const handleClienteSubmit = (e) => { e.preventDefault(); handleBuscarCliente(); };
    const handleClientAdded = (clienteCreado) => { setClientes([...clientes, clienteCreado]); setClienteSeleccionado(clienteCreado); setClienteId(clienteCreado.id_cli); setShowModalCliente(false); setCedulaBusqueda(''); };
    const limpiarCliente = () => {
        setClienteSeleccionado(null);
        setClienteId('');
        setCedulaBusqueda('');
        setSaldoFavorCliente(0);
    };

    const subtotalVentaUsd = carrito.reduce((acc, item) => Currency.sumar(acc, Currency.multiplicar(item.precio_base_usd, item.cantidad)), 0);

    let totalMayorBaseUsd = 0;
    let totalDetalBaseUsd = 0;

    carrito.forEach(item => {
        const minMayor = Number(item.cant_minima_mayor) || 0;
        const totalItemUsd = Currency.multiplicar(item.precio_base_usd, item.cantidad);

        if (minMayor > 0 && item.cantidad >= minMayor) {
            totalMayorBaseUsd = Currency.sumar(totalMayorBaseUsd, totalItemUsd);
        } else {
            totalDetalBaseUsd = Currency.sumar(totalDetalBaseUsd, totalItemUsd);
        }
    });

    const maxDescuentoUsd = tipoOperacion === 'contado'
        ? Currency.sumar(
            Currency.multiplicar(totalMayorBaseUsd, Currency.dividir(descMayorPct, 100)),
            Currency.multiplicar(totalDetalBaseUsd, Currency.dividir(descDetalPct, 100))
        ) : 0;

    const pctGlobalEfectivo = subtotalVentaUsd > 0 ? Currency.dividir(maxDescuentoUsd, subtotalVentaUsd) : 0;
    const netUsdPagado = pagosAgregados.filter(p => p.moneda === 'USD' || p.moneda === 'COP').reduce((acc, p) => Currency.sumar(acc, p.monto_usd), 0);
    const totalPagadoDivisasUsd = Math.max(0, netUsdPagado);

    let descuentoAplicadoUsd = 0;
    if (totalPagadoDivisasUsd > 0 && pctGlobalEfectivo > 0) {
        if (pctGlobalEfectivo >= 1) {
            descuentoAplicadoUsd = maxDescuentoUsd;
        } else {
            const factorDesc = Currency.dividir(pctGlobalEfectivo, Currency.restar(1, pctGlobalEfectivo));
            const descCalculado = Currency.multiplicar(totalPagadoDivisasUsd, factorDesc);
            descuentoAplicadoUsd = Math.min(descCalculado, maxDescuentoUsd);
        }
    }

    const totalVentaUsd = Currency.restar(subtotalVentaUsd, descuentoAplicadoUsd);
    const totalVentaBs = Currency.multiplicar(totalVentaUsd, tasaBcv);

    const totalPagadoUsd = pagosAgregados.reduce((acc, pago) => Currency.sumar(acc, pago.monto_usd), 0);
    const totalPagadoBs = pagosAgregados.reduce((acc, pago) => {
        if (pago.moneda === 'VES') return Currency.sumar(acc, pago.monto_original);
        if (pago.moneda === 'USD') return Currency.sumar(acc, Currency.multiplicar(pago.monto_usd, tasaBcv));
        if (pago.moneda === 'COP') return Currency.sumar(acc, Currency.multiplicar(Currency.dividir(pago.monto_original, tasaCop), tasaBcv));
        return acc;
    }, 0);

    const totalMostrado = moneda === 'USD' ? totalVentaUsd : totalVentaBs;
    const totalSecundario = moneda === 'USD' ? totalVentaBs : totalVentaUsd;
    const pagadoMostrado = moneda === 'USD' ? totalPagadoUsd : totalPagadoBs;

    const deudaCalculada = Currency.redondear(Currency.restar(totalMostrado, pagadoMostrado), 2);
    const sobranteUsd = Currency.redondear(Currency.restar(totalPagadoUsd, totalVentaUsd), 2);
    const puedeDarVuelto = sobranteUsd > 0;

    const isAddPaymentDisabled = (!esVuelto && deudaCalculada <= 0) || (esVuelto && !puedeDarVuelto);

    const simboloPrincipal = moneda === 'USD' ? '$' : 'Bs';
    const simboloSecundario = moneda === 'USD' ? 'Bs' : '$';

    const metodoEncontrado = metodosPagoDb.find(m => String(m.id_metodo) === String(metodoSeleccionado));
    const monedaActualMetodo = metodoEncontrado?.moneda || 'VES';
    const idNotaDebito = 120009;
    const esNotaDebito = Number(metodoEncontrado?.id_metodo) === idNotaDebito;
    let simboloInput = 'Bs';
    if (monedaActualMetodo === 'USD') simboloInput = '$';
    else if (monedaActualMetodo === 'COP') simboloInput = 'COP';

    useEffect(() => {
        if (esNotaDebito) {
            setDescDetalPct(0);
            setDescMayorPct(0);
        }
    }, [esNotaDebito]);
    
    useEffect(() => {
        if (!puedeDarVuelto && esVuelto) {
            setEsVuelto(false);
        }
    }, [puedeDarVuelto, esVuelto]);

    useEffect(() => {
        let sugeridoUsd = 0;

        const faltanteBsExacto = Currency.restar(totalVentaBs, totalPagadoBs);
        const sobranteBsExacto = Currency.restar(totalPagadoBs, totalVentaBs);
        const faltanteUsdExacto = Currency.restar(totalVentaUsd, totalPagadoUsd);

        if (esVuelto) {
            if (sobranteUsd > 0) sugeridoUsd = sobranteUsd;
        } else {
            if (tipoOperacion === 'fiado') {
                sugeridoUsd = 0;
            } else if (Currency.redondear(faltanteUsdExacto, 2) > 0) {
                if ((monedaActualMetodo === 'USD' || monedaActualMetodo === 'COP') && pctGlobalEfectivo > 0 && tipoOperacion === 'contado') {
                    if (pctGlobalEfectivo >= 1) {
                        sugeridoUsd = 0;
                    } else {
                        const sugeridoSinCap = Currency.multiplicar(faltanteUsdExacto, Currency.restar(1, pctGlobalEfectivo));
                        const maxFaltante = Currency.restar(Currency.restar(subtotalVentaUsd, maxDescuentoUsd), totalPagadoUsd);
                        sugeridoUsd = Math.max(sugeridoSinCap, maxFaltante);
                    }
                } else {
                    sugeridoUsd = faltanteUsdExacto;
                }
            }
        }

        let aplicarMitad = false;
        if (tipoOperacion === 'apartado' && !esVuelto && sugeridoUsd > 0) {
            if (Currency.redondear(totalPagadoUsd, 2) === 0) {
                aplicarMitad = true;
            } else {
                sugeridoUsd = 0;
            }
        }

        if (Currency.redondear(sugeridoUsd, 2) > 0) {
            let valorSugerido = sugeridoUsd;

            if (monedaActualMetodo === 'VES') {
                valorSugerido = esVuelto ? sobranteBsExacto : faltanteBsExacto;
            } else if (monedaActualMetodo === 'COP') {
                valorSugerido = Currency.multiplicar(sugeridoUsd, tasaCop);
            }

            if (aplicarMitad) {
                valorSugerido = Currency.dividir(valorSugerido, 2);
            }

            setMontoIngresado(Currency.redondear(valorSugerido, 2).toString());
        } else {
            setMontoIngresado('');
        }
    }, [totalVentaUsd, totalPagadoUsd, totalVentaBs, totalPagadoBs, monedaActualMetodo, tasaBcv, tasaCop, tipoOperacion, descDetalPct, descMayorPct, pctGlobalEfectivo, subtotalVentaUsd, maxDescuentoUsd, esVuelto, sobranteUsd]);

    const agregarPagoLista = (e) => {
        e.preventDefault();

        if (!metodoSeleccionado || montoIngresado === '') return;

        const montoIngresadoNum = Number(montoIngresado);
        if (isNaN(montoIngresadoNum) || montoIngresadoNum <= 0) {
            return showMessage("El monto a registrar debe ser mayor a 0.", "warning");
        }

        const metodo = metodosPagoDb.find(m => String(m.id_metodo) === String(metodoSeleccionado));
        if (!metodo) return;

        let montoAbonar = montoIngresadoNum;
        let equivalenteUsd = 0;

        if (metodo.moneda === 'USD') {
            equivalenteUsd = montoAbonar;
        } else if (metodo.moneda === 'VES') {
            equivalenteUsd = Currency.dividir(montoAbonar, tasaBcv);
        } else if (metodo.moneda === 'COP') {
            equivalenteUsd = Currency.dividir(montoAbonar, tasaCop);
        }

        if (esVuelto) {
            if (sobranteUsd <= 0) return showMessage("No puede registrar vuelto.", "warning");
            const maxVueltoUsd = Currency.restar(totalPagadoUsd, totalVentaUsd);
            if (equivalenteUsd > Currency.sumar(maxVueltoUsd, 0.05)) {
                return showMessage("El vuelto no puede ser mayor al sobrante.", "warning");
            }

            montoAbonar = -Math.abs(montoAbonar);
            equivalenteUsd = -Math.abs(equivalenteUsd);
        }

        const nuevoPago = {
            id_pago_temp: Date.now(),
            id_metodo: metodo.id_metodo,
            descripcion: metodo.descripcion,
            moneda: metodo.moneda,
            monto_original: montoAbonar,
            monto_usd: equivalenteUsd,
            es_vuelto: esVuelto
        };

        if (Number(metodo.id_metodo) === 120009) {
            const saldoYaUsado = pagosAgregados
                .filter(p => Number(p.id_metodo) === 120009)
                .reduce((acc, p) => acc + p.monto_usd, 0);

            const disponibleRestante = Currency.redondear(Currency.restar(saldoFavorCliente, saldoYaUsado), 2);
            const montoRequerido = Currency.redondear(equivalenteUsd, 2);

            if (montoRequerido > disponibleRestante) {
                return showMessage(`Saldo insuficiente. El cliente solo dispone de $${disponibleRestante}.`, "warning");
            }
        }

        setPagosAgregados([...pagosAgregados, nuevoPago]);
        setMontoIngresado('');
        setEsVuelto(false);
    };

    const calcularConversion = () => {
        let monto = Number(calcMonto) || 0;
        if (monto <= 0) return 0;

        let montoUsd = 0;
        if (calcOrigen === 'USD') montoUsd = monto;
        else if (calcOrigen === 'VES') montoUsd = Currency.dividir(monto, tasaBcv);
        else if (calcOrigen === 'COP') montoUsd = Currency.dividir(monto, tasaCop);

        let resultado = 0;
        if (monedaActualMetodo === 'USD') resultado = montoUsd;
        else if (monedaActualMetodo === 'VES') resultado = Currency.multiplicar(montoUsd, tasaBcv);
        else if (monedaActualMetodo === 'COP') resultado = Currency.multiplicar(montoUsd, tasaCop);

        return Currency.redondear(resultado, 2);
    };

    const aplicarCalculo = () => {
        setMontoIngresado(calcularConversion().toString());
        setShowCalc(false);
        setCalcMonto('');
    };

    const cerrarCalculadora = () => {
        setShowCalc(false);
        setCalcMonto('');
        setCalcOrigen('USD');
    };

    const handleProcesarVenta = async () => {
        if (carrito.length === 0) return showMessage("El carrito está vacío", "info");
        if (tipoOperacion === 'ajuste' && motivoAjuste.trim() === '') return showMessage("Especifique el motivo del ajuste.", "info");
        if (tipoOperacion !== 'ajuste' && !clienteId) return showMessage("Seleccione un cliente.", "info");

        if (tipoOperacion === 'contado' && deudaCalculada > 0) return showMessage("Falta dinero por cobrar para la venta al contado.", "info");
        if (tipoOperacion === 'apartado' && totalPagadoUsd <= 0) return showMessage("El apartado requiere un abono inicial. Si es sin abono, use 'Fiado'.", "warning");
        if (tipoOperacion === 'apartado' && deudaCalculada <= 0) return showMessage("El apartado no puede ser pagado en su totalidad al instante. Si pagó todo, use 'Contado'.", "warning");
        if (tipoOperacion === 'fiado' && totalPagadoUsd > 0) return showMessage("El fiado no lleva abono inicial. Si el cliente está dejando un abono, use 'Apartado'.", "warning");

        setProcesando(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

            const carritoProcesado = carrito.map(item => ({
                ...item,
                precio_venta_usd: item.precio_base_usd
            }));

            const pagosFinales = pagosAgregados.map(p => ({
                id_metodo: p.id_metodo,
                monto_original: Currency.redondear(p.monto_original, 2),
                monto_usd: Currency.redondear(p.monto_usd, 8),
                es_vuelto: p.es_vuelto
            }));

            const response = await axios.post(`${apiUrl}/api/ventas`, {
                id_cliente: tipoOperacion === 'ajuste' ? 1 : clienteId,
                tipo_operacion: tipoOperacion === 'fiado' ? 'apartado' : tipoOperacion,
                total_pagado_usd: Currency.redondear(totalPagadoUsd, 8),
                tasa_bcv_aplicada: tasaBcv,
                descuento_usd: Currency.redondear(descuentoAplicadoUsd, 8),
                items: carritoProcesado,
                pagos: pagosFinales,
                motivo_ajuste: tipoOperacion === 'ajuste' ? motivoAjuste : null,
                aplica_mora: (tipoOperacion === 'apartado' || tipoOperacion === 'fiado') ? aplicaMora : true
            });

            showMessage(`Operación procesada con éxito.`, "success");

            if (tipoOperacion !== 'ajuste') {
                if (response.data.ventaCompleta) {
                    setUltimaVentaRealizada(response.data.ventaCompleta);
                } else {
                    const ventaParaTicket = {
                        id_venta: response.data.id_venta,
                        fecha: new Date(),
                        cliente: clienteSeleccionado?.ra_soc_cli || 'Consumidor Final',
                        ced_rif_cli: clienteSeleccionado?.ced_rif_cli || '',
                        operador: JSON.parse(localStorage.getItem('usuario'))?.nombre || 'Cajero',
                        total_pagado: Currency.redondear(totalPagadoUsd, 8),
                        descuento_usd: Currency.redondear(descuentoAplicadoUsd, 8),
                        recargo_mora: 0,
                        abono_hoy: Currency.redondear(totalPagadoUsd, 8),
                        items: carritoProcesado.map(item => ({
                            cantidad: item.cantidad,
                            nombre_base: item.nombre_base,
                            subtotal: Currency.redondear(Currency.multiplicar(item.precio_venta_usd, item.cantidad), 8)
                        }))
                    };
                    setUltimaVentaRealizada(ventaParaTicket);
                }
                setShowModalTicket(true);
            }

            setCarrito([]);
            setTipoOperacion('contado');
            setPagosAgregados([]);
            setMotivoAjuste('');
            setDescDetalPct(0);
            setDescMayorPct(0);
            if (metodosPagoDb.length > 0) setMetodoSeleccionado(metodosPagoDb[0].id_metodo);
            limpiarCliente();
            setMoneda('VES');
            setAplicaMora(true);
            buscadorRef.current?.focus();

        } catch (error) {
            showMessage(error.response?.data?.message || "Error al procesar.", "danger");
        } finally {
            setProcesando(false);
        }
    };

    const bufferEscaneo = useRef('');
    const timerEscaneo = useRef(null);
    const accionEscaneoRef = useRef();

    useEffect(() => {
        accionEscaneoRef.current = (codigo) => {
            setBusqueda(codigo);
            buscarProductoDirecto(codigo);
        };
    });

    useEffect(() => {
        const manejarEscaneoFondo = (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'textarea' || activeTag === 'select') return;
            if (e.key === 'Enter') {
                if (bufferEscaneo.current.length >= 3) {
                    e.preventDefault();
                    const codigoEscaneado = bufferEscaneo.current;
                    const activeEl = document.activeElement;
                    if (activeEl && activeEl.tagName === 'INPUT' && activeEl.id !== 'buscador_principal') {
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
    }, []);

    const isApartadoSinAbono = tipoOperacion === 'apartado' && totalPagadoUsd <= 0;
    const isApartadoPagadoCompleto = tipoOperacion === 'apartado' && deudaCalculada <= 0;
    const isFiadoConAbono = tipoOperacion === 'fiado' && totalPagadoUsd > 0;
    const isContadoIncompleto = tipoOperacion === 'contado' && deudaCalculada > 0;

    const isFacturarDisabled = carrito.length === 0 ||
        procesando ||
        isContadoIncompleto ||
        isApartadoPagadoCompleto ||
        isApartadoSinAbono ||
        isFiadoConAbono ||
        (sobranteUsd > 0);

    let labelBoton = "PROCESAR VENTA";
    if (procesando) labelBoton = "Procesando...";
    else if (sobranteUsd > 0) labelBoton = "REGISTRE EL VUELTO";
    else if (isApartadoPagadoCompleto) labelBoton = "PAGO COMPLETO (USE CONTADO)";
    else if (isApartadoSinAbono) labelBoton = "REQUIERE ABONO (USE FIADO)";
    else if (isFiadoConAbono) labelBoton = "TIENE ABONO (USE APARTADO)";
    else if (isContadoIncompleto) labelBoton = "PAGO INCOMPLETO";

    return (
        <>
            {procesando && <Loader texto="Procesando operación..." pantallaCompleta={true} />}

            <Container fluid className="p-2 p-md-3 d-flex flex-column flex-grow-1 alto-fijo-pc" style={{ minHeight: 0 }}>

                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-3 gap-2" style={{ flexShrink: 0 }}>
                    <h4 className="text-primary fw-bold mb-0">
                        <FontAwesomeIcon icon={faCashRegister} className="me-2" />
                        Terminal de Venta
                    </h4>

                    <div className="d-flex flex-column flex-md-row align-items-md-center gap-2 mt-2 mt-lg-0 w-100" style={{ maxWidth: '100%', width: 'auto' }}>
                        <Card className="p-2 bg-light border-0 shadow-sm mb-0 flex-grow-1 flex-md-grow-0 w-100 w-md-auto">
                            <div className="d-flex align-items-center justify-content-between gap-3">
                                <span className="badge bg-secondary py-2 px-3 fs-6 text-nowrap">
                                    {cargandoConfig ? 'Cargando tasa...' : `Tasa: ${tasaBcv} Bs`}
                                </span>
                                <Form.Check
                                    type="switch"
                                    id="moneda-switch"
                                    label={<span className="fw-bold text-secondary small text-nowrap">{moneda === 'VES' ? 'Bs' : 'USD'}</span>}
                                    checked={moneda === 'VES'}
                                    onChange={toggleMoneda}
                                    className="mb-0"
                                    disabled={cargandoConfig}
                                />
                            </div>
                        </Card>
                    </div>
                </div>

                <Row className="gx-3 flex-grow-1 pb-1" style={{ minHeight: 0 }}>

                    <Col lg={8} className="d-flex flex-column mb-3 mb-lg-0 h-100">
                        <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1" style={{ minHeight: '350px' }}>
                            <Card.Body className="d-flex flex-column p-3 p-md-4 h-100" style={{ minHeight: 0 }}>

                                <Form.Label className="fw-bold text-secondary">Buscar o Escanear Variante</Form.Label>
                                <Form onSubmit={handleBuscarProductoForm} className="mb-3" style={{ flexShrink: 0 }}>
                                    <InputGroup size="lg" className="shadow-sm">
                                        <Form.Control
                                            type="text"
                                            placeholder="🔍 Código de barras, referencia o nombre..."
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            ref={buscadorRef}
                                            className="fs-6 border-primary"
                                            id="buscador_principal"
                                            onFocus={(e) => e.target.select()}
                                        />
                                        <Button variant="primary" type="submit" disabled={!busqueda.trim()}>
                                            <FontAwesomeIcon icon={faSearch} />
                                        </Button>
                                    </InputGroup>
                                </Form>

                                <div className="flex-grow-1 border rounded bg-white shadow-sm" style={{ overflowY: 'auto', minHeight: '200px' }}>
                                    <Table hover className="align-middle custom-table mb-0" size="sm" style={{ minWidth: '600px' }}>
                                        <thead className="table-dark sticky-top shadow-sm" style={{ zIndex: 1 }}>
                                            <tr>
                                                <th className="ps-3 py-3">Artículo y Variante</th>
                                                <th className="text-center py-3" style={{ width: '90px' }}>Cant.</th>
                                                <th className="text-end d-none d-md-table-cell py-3" style={{ width: '130px' }}>Precio Base</th>
                                                <th className="text-end py-3" style={{ width: '130px' }}>Subtotal Base</th>
                                                <th className="text-center py-3" style={{ width: '60px' }}>Quitar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {carrito.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5 text-muted bg-light">
                                                        <FontAwesomeIcon icon={faCartShopping} size="4x" className="mb-3 opacity-25" /><br />
                                                        <h5 className="fw-bold text-secondary">Carrito vacío</h5>
                                                        <p className="mb-0">Aún no has agregado variantes a esta venta.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                carrito.map((item, index) => {
                                                    const pBaseUsd = item.precio_base_usd;
                                                    const qty = Number(item.cantidad);
                                                    const pBaseMos = moneda === 'USD' ? pBaseUsd : Currency.multiplicar(pBaseUsd, tasaBcv);
                                                    const subtotalOriginal = Currency.multiplicar(pBaseMos, qty);

                                                    const mostrarTalla = item.talla && item.talla !== 'N/A' && item.talla.trim() !== '';
                                                    const mostrarColor = item.color && item.color !== 'N/A' && item.color.trim() !== '';
                                                    const aplicaMayor = item.cant_minima_mayor > 0 && qty >= item.cant_minima_mayor;

                                                    return (
                                                        <tr key={index} className={aplicaMayor ? 'table-warning' : ''}>
                                                            <td className="fw-bold text-wrap ps-3 py-2" style={{ fontSize: '0.85rem' }}>
                                                                {item.nombre_base}
                                                                <div className="mt-1">
                                                                    {mostrarTalla && <Badge bg="info" className="me-1 text-dark">{item.talla}</Badge>}
                                                                    {mostrarColor && <Badge bg="secondary">{item.color}</Badge>}
                                                                    {!mostrarTalla && !mostrarColor && <Badge bg="light" text="dark" className="border">Estándar</Badge>}
                                                                </div>
                                                            </td>
                                                            <td className="text-center py-2">
                                                                <Form.Control type="number" size="sm" min="1" value={item.cantidad} onChange={(e) => actualizarCantidad(item.id_presentacion, e.target.value)} className="text-center fw-bold border-secondary shadow-sm p-1" />
                                                            </td>
                                                            <td className="text-end fs-6 d-none d-md-table-cell py-2">
                                                                <div className={aplicaMayor ? "text-success fw-bold" : ""}>
                                                                    {Currency.formatear(pBaseMos, simboloPrincipal)}
                                                                </div>
                                                                {aplicaMayor && <div className="text-warning small fw-bold" style={{ fontSize: '0.7rem' }}>⭐ Califica al Mayor!</div>}
                                                                {!aplicaMayor && item.cant_minima_mayor > 0 && <div className="text-muted" style={{ fontSize: '0.65rem' }}>Mayor a partir de {item.cant_minima_mayor}</div>}
                                                            </td>
                                                            <td className="text-end fw-bold text-success py-2" style={{ fontSize: '0.9rem' }}>
                                                                {Currency.formatear(subtotalOriginal, simboloPrincipal)}
                                                            </td>
                                                            <td className="text-center py-2 pe-3">
                                                                <Button variant="danger" size="sm" className="p-1 px-2 shadow-sm" onClick={() => eliminarDelCarrito(item.id_presentacion)} title="Quitar">
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={4} className="d-flex flex-column h-100">
                        <Card className="shadow-sm border-0 d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>

                            <div className="bg-primary text-white p-3 text-center position-relative shadow-sm" style={{ flexShrink: 0, zIndex: 2 }}>
                                <h6 className="mb-1 fw-bold opacity-75 text-uppercase tracking-wide" style={{ fontSize: '0.75rem' }}>Total a Pagar</h6>
                                <h2 className="display-6 fw-bold mb-0">{Currency.formatear(totalMostrado, simboloPrincipal)}</h2>
                                <h6 className="mb-0 text-white-50 fw-bold" style={{ fontSize: '0.9rem' }}>{Currency.formatear(totalSecundario, simboloSecundario)}</h6>
                                {descuentoAplicadoUsd > 0 && (
                                    <Badge bg="warning" text="dark" className="mt-2 fs-6 shadow-sm">
                                        Ahorro: {Currency.formatear(descuentoAplicadoUsd, '$')}
                                    </Badge>
                                )}
                            </div>

                            <div className="d-flex flex-column flex-grow-1 bg-light" style={{ minHeight: 0 }}>

                                <div className="flex-grow-1 p-3" style={{ overflowY: 'auto' }}>

                                    <Row className="g-2 mb-3">
                                        <Col xs={12} sm={tipoOperacion !== 'ajuste' ? 5 : 12}>
                                            <Form.Group>
                                                <Form.Label className="fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Modalidad</Form.Label>
                                                <Form.Select
                                                    size="sm"
                                                    value={tipoOperacion}
                                                    onChange={(e) => {
                                                        setTipoOperacion(e.target.value);
                                                        setAplicaMora(true);
                                                    }}
                                                    className="border-primary fw-bold shadow-sm"
                                                    style={{ fontSize: '0.8rem' }}
                                                >
                                                    <option value="contado">🛒 Contado</option>
                                                    <option value="apartado">📦 Apartado</option>
                                                    <option value="fiado">🤝 Fiado</option>
                                                    <option value="ajuste">⚙️ Ajuste/Merma</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>

                                        {tipoOperacion === 'ajuste' && (
                                            <Col xs={12}>
                                                <Form.Control as="textarea" rows={2} placeholder="Ej: Defecto de fábrica" value={motivoAjuste} onChange={(e) => setMotivoAjuste(e.target.value)} className="border-danger shadow-sm" style={{ fontSize: '0.8rem' }} />
                                            </Col>
                                        )}

                                        {tipoOperacion !== 'ajuste' && (
                                            <Col xs={12} sm={7}>
                                                <Form.Group>
                                                    <Form.Label className="fw-bold text-secondary mb-1" style={{ fontSize: '0.75rem' }}>Cliente</Form.Label>
                                                    {!clienteSeleccionado ? (
                                                        <Form onSubmit={handleClienteSubmit} className="d-flex">
                                                            <Form.Control className="shadow-sm" style={{ fontSize: '0.8rem' }} size="sm" type="text" placeholder="Ej: V12345678" value={cedulaBusqueda} onChange={(e) => setCedulaBusqueda(e.target.value)} />
                                                            <Button variant="primary" type="submit" size="sm" className="ms-1 px-2 shadow-sm"><FontAwesomeIcon icon={faSearch} /></Button>
                                                        </Form>
                                                    ) : (
                                                        <div className="p-1 px-2 border border-success rounded bg-white d-flex justify-content-between align-items-center shadow-sm">
                                                            <span className="text-success fw-bold text-truncate" style={{ fontSize: '0.8rem' }}>{clienteSeleccionado.ced_rif_cli}</span>
                                                            <Button variant="link" className="text-danger p-0 m-0 border-0" onClick={limpiarCliente}><FontAwesomeIcon icon={faTrash} size="sm" /></Button>
                                                        </div>
                                                    )}
                                                </Form.Group>
                                            </Col>
                                        )}
                                    </Row>

                                    {tipoOperacion !== 'ajuste' && !esNotaDebito && (monedaActualMetodo === 'USD' || monedaActualMetodo === 'COP') && tipoOperacion === 'contado' && !esVuelto && (
                                        <Row className="g-2 mb-3">
                                            <Col xs={6}>
                                                <InputGroup size="sm" className="shadow-sm">
                                                    <InputGroup.Text className="bg-white" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>Desc Detal %</InputGroup.Text>
                                                    <Form.Control type="number" min="0" max="100" value={descDetalPct} onChange={e => setDescDetalPct(e.target.value)} style={{ fontSize: '0.8rem' }} placeholder="0" />
                                                </InputGroup>
                                            </Col>
                                            <Col xs={6}>
                                                <InputGroup size="sm" className="shadow-sm">
                                                    <InputGroup.Text className="bg-white" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}>Desc Mayor %</InputGroup.Text>
                                                    <Form.Control type="number" min="0" max="100" value={descMayorPct} onChange={e => setDescMayorPct(e.target.value)} style={{ fontSize: '0.8rem' }} placeholder="0" />
                                                </InputGroup>
                                            </Col>
                                        </Row>
                                    )}

                                    {(tipoOperacion !== 'ajuste' && tipoOperacion !== 'fiado') && (
                                        <div className="p-3 bg-white rounded border mb-3 shadow-sm">
                                            <Form onSubmit={agregarPagoLista}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-secondary" style={{ fontSize: '0.75rem' }}>MÉTODOS DE PAGO</span>
                                                    {puedeDarVuelto && (
                                                        <Form.Check
                                                            type="switch"
                                                            id="vuelto-switch"
                                                            label={<span className={esVuelto ? "text-danger fw-bold" : "text-muted"} style={{ fontSize: '0.75rem' }}>Dar Vuelto</span>}
                                                            checked={esVuelto}
                                                            onChange={(e) => setEsVuelto(e.target.checked)}
                                                            className="mb-0"
                                                        />
                                                    )}
                                                </div>
                                                <Row className="g-2">
                                                    <Col xs={12}>
                                                        <Form.Select
                                                            size="sm"
                                                            value={metodoSeleccionado}
                                                            onChange={(e) => setMetodoSeleccionado(e.target.value)}
                                                            className={`fw-bold shadow-sm ${esVuelto ? 'border-danger text-danger' : ''}`}
                                                            style={{ fontSize: '0.8rem' }}
                                                            disabled={!metodosPagoDb || metodosPagoDb.length === 0}
                                                        >
                                                            {metodosPagoDb && metodosPagoDb.length > 0 ? (
                                                                <>
                                                                    {metodosPagoDb.map(m => (
                                                                        <option key={m.id_metodo} value={m.id_metodo}>
                                                                            {m.descripcion}
                                                                        </option>
                                                                    ))}
                                                                </>
                                                            ) : (
                                                                <option value="">Cargando...</option>
                                                            )}
                                                        </Form.Select>
                                                        {Number(metodoEncontrado?.id_metodo) === 120009 && (
                                                            <div className="mt-1 d-flex justify-content-start">
                                                                <Badge bg={saldoFavorCliente > 0 ? "success" : "danger"} className="shadow-sm">
                                                                    Saldo Disp: {Currency.formatear(Currency.redondear(saldoFavorCliente, 2), '$')}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </Col>
                                                    <Col xs={7}>
                                                        <InputGroup size="sm" className={`shadow-sm h-100 ${esVuelto ? 'border-danger' : ''}`}>
                                                            <InputGroup.Text className={`fw-bold px-2 ${esVuelto ? 'bg-danger text-white border-danger' : 'bg-white'}`} style={{ fontSize: '0.8rem' }}>{simboloInput}</InputGroup.Text>
                                                            <Form.Control type="number" min="0" step="0.01" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} className={`fw-bold ${esVuelto ? 'text-danger border-danger' : ''}`} placeholder="0.00" style={{ fontSize: '0.8rem' }} />

                                                            {tipoOperacion === 'apartado' && (
                                                                <Button variant="outline-secondary" onClick={() => setShowCalc(true)} title="Convertir Divisa">
                                                                    <FontAwesomeIcon icon={faCalculator} />
                                                                </Button>
                                                            )}
                                                        </InputGroup>
                                                    </Col>
                                                    <Col xs={5}>
                                                        <Button variant={esVuelto ? "danger" : "primary"} type="submit" size="sm" className="w-100 fw-bold shadow-sm h-100" style={{ fontSize: '0.8rem' }} disabled={isAddPaymentDisabled}>
                                                            <FontAwesomeIcon icon={esVuelto ? faExchangeAlt : faPlus} /> {esVuelto ? 'Vuelto' : 'Añadir'}
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            </Form>

                                            {pagosAgregados.length > 0 && (
                                                <ListGroup variant="flush" className="mt-3 border-top pt-2" style={{ maxHeight: '130px', overflowY: 'auto' }}>
                                                    {pagosAgregados.map(pago => {
                                                        let montoMostrar = 0;
                                                        if (moneda === pago.moneda) {
                                                            montoMostrar = pago.monto_original;
                                                        } else if (moneda === 'USD') {
                                                            montoMostrar = pago.monto_usd;
                                                        } else if (moneda === 'VES') {
                                                            montoMostrar = Currency.multiplicar(pago.monto_usd, tasaBcv);
                                                        } else if (moneda === 'COP') {
                                                            montoMostrar = Currency.multiplicar(pago.monto_usd, tasaCop);
                                                        }

                                                        return (
                                                            <ListGroup.Item key={pago.id_pago_temp} className={`d-flex justify-content-between align-items-center p-1 px-2 border-bottom-0 bg-transparent ${pago.es_vuelto ? 'border-danger border-start border-3' : ''}`}>
                                                                <div>
                                                                    <Badge bg={pago.es_vuelto ? "danger" : "secondary"} className="me-1 shadow-sm" style={{ fontSize: '0.65rem' }}>{pago.es_vuelto ? "VUELTO" : pago.descripcion}</Badge>
                                                                    <span className={`fw-bold ${pago.es_vuelto ? 'text-danger' : ''}`} style={{ fontSize: '0.75rem' }}>
                                                                        {Currency.formatear(Math.abs(montoMostrar), simboloPrincipal)}
                                                                    </span>
                                                                </div>
                                                                <Button variant="link" className="text-danger p-0 border-0 m-0" onClick={() => setPagosAgregados(pagosAgregados.filter(p => p.id_pago_temp !== pago.id_pago_temp))}><FontAwesomeIcon icon={faTrash} size="sm" /></Button>
                                                            </ListGroup.Item>
                                                        );
                                                    })}
                                                </ListGroup>
                                            )}
                                        </div>
                                    )}

                                    <div className="p-3 bg-white rounded border shadow-sm">
                                        <div className="d-flex justify-content-between fw-bold align-items-center fs-6">
                                            <span className="text-secondary">Neto Pagado:</span>
                                            <span className="text-success text-end">{Currency.formatear(pagadoMostrado, simboloPrincipal)}</span>
                                        </div>

                                        <div className="d-flex justify-content-between fw-bold align-items-center fs-6 mt-2">
                                            <span className="text-danger">Falta:</span>
                                            <span className="text-danger text-end">
                                                {deudaCalculada > 0 ? Currency.formatear(deudaCalculada, simboloPrincipal) : Currency.formatear(0, simboloPrincipal)}
                                            </span>
                                        </div>

                                        {(tipoOperacion === 'apartado' || tipoOperacion === 'fiado') && deudaCalculada > 0 && (
                                            <div className="mt-3 pt-2 border-top d-flex flex-column align-items-end">
                                                <Form.Check
                                                    type="switch"
                                                    id="aplica-mora"
                                                    label={<span className="fw-bold text-secondary" style={{ fontSize: '0.8rem' }}>¿Aplicar mora por atraso?</span>}
                                                    checked={aplicaMora}
                                                    onChange={(e) => setAplicaMora(e.target.checked)}
                                                />
                                                {aplicaMora && (
                                                    <div className="text-muted text-end mt-1" style={{ fontSize: '0.70rem' }}>
                                                        * Se aplicará mora de ${Currency.formatear(montoMora, '')} tras 15 días si no es solventado.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {deudaCalculada < 0 && (
                                            <div className="d-flex justify-content-between fw-bold text-warning align-items-center fs-6 mt-3 pt-2 border-top">
                                                <span>Vuelto Pendiente:</span>
                                                <span className="text-end">
                                                    {Currency.formatear(Math.abs(deudaCalculada), simboloPrincipal)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3 border-top bg-white" style={{ flexShrink: 0, zIndex: 2 }}>
                                    <Button
                                        variant={sobranteUsd > 0 ? "warning" : (isContadoIncompleto || isApartadoPagadoCompleto || isApartadoSinAbono || isFiadoConAbono ? "danger" : "success")}
                                        size="lg"
                                        className="w-100 fw-bold shadow-sm py-3"
                                        style={{ fontSize: '1.1rem' }}
                                        disabled={isFacturarDisabled}
                                        onClick={handleProcesarVenta}
                                        label={labelBoton}
                                    />
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                <VariantSelectionModal
                    show={showModalResultados}
                    onHide={() => {
                        setShowModalResultados(false);
                        setBusqueda('');
                        buscadorRef.current?.focus();
                    }}
                    resultados={resultadosBusqueda}
                    onSelect={procesarSeleccionProducto}
                    mostrarPrecioYStock={false}
                />

                <ClientModal show={showModalCliente} onHide={() => setShowModalCliente(false)} onClientAdded={handleClientAdded} clienteAEditar={clientePrellenado} />

                <TicketModal
                    show={showModalTicket}
                    onHide={() => setShowModalTicket(false)}
                    onPrint={handlePrintTicket}
                />

                <CalculatorModal
                    show={showCalc}
                    onHide={cerrarCalculadora}
                    calcMonto={calcMonto}
                    setCalcMonto={setCalcMonto}
                    calcOrigen={calcOrigen}
                    setCalcOrigen={setCalcOrigen}
                    monedaActualMetodo={monedaActualMetodo}
                    simboloInput={simboloInput}
                    calcularConversion={calcularConversion}
                    aplicarCalculo={aplicarCalculo}
                />

            </Container>
        </>
    );
}