import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Container, Row, Col, Card, Form, Table, Badge,
    Tab, Nav, Alert, Dropdown, DropdownButton, InputGroup
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartPie, faFilePdf, faBox, faMoneyBillTrendUp,
    faExclamationTriangle, faTags, faClipboardList,
    faTruckLoading, faHandHoldingDollar, faStore, faSearch, faXmark
} from '@fortawesome/free-solid-svg-icons';
import Button from '@/components/buttons/button.jsx';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { useMessage } from '@/context/MessageContext.jsx';
import Loader from '@/components/loader/loader.jsx';
import { Currency } from '@/utils/Currency.js';
import logoEmpresa from '@/assets/logo.png';

// --- UTILIDADES DE FECHA ---
const obtenerFechaLocal = (esInicio = false) => {
    const d = new Date();
    if (esInicio) d.setDate(1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Formato de Fecha y Hora estándar para Venezuela (12 horas AM/PM)
const formatearFechaHoraVE = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// Formato de Fecha Corta (DD/MM/YYYY)
const formatearFechaCortaVE = (fecha) => {
    if (!fecha) return 'N/A';
    const fechaObj = String(fecha).includes('T') ? new Date(fecha) : new Date(`${fecha}T00:00:00`);
    return fechaObj.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

export default function Reportes() {
    // --- ESTADOS DE CONTROL Y FILTROS ---
    const [activeTab, setActiveTab] = useState('ventas');
    const [tasaBcv, setTasaBcv] = useState(1);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);
    const [fechaInicio, setFechaInicio] = useState(() => obtenerFechaLocal(true));
    const [fechaFin, setFechaFin] = useState(() => obtenerFechaLocal(false));
    const [sucursales, setSucursales] = useState([]);
    const [idSucursalSeleccionada, setIdSucursalSeleccionada] = useState('0');

    // --- ESTADOS DE DATOS ---
    const [datosVentas, setDatosVentas] = useState([]);
    const [datosTopProductos, setDatosTopProductos] = useState([]);
    const [datosReorden, setDatosReorden] = useState([]);
    const [listaPrecios, setListaPrecios] = useState([]);
    const [datosMovimientos, setDatosMovimientos] = useState([]);
    const [datosEntradas, setDatosEntradas] = useState([]);
    const [datosIngresos, setDatosIngresos] = useState([]);
    const [datosProveedores, setDatosProveedores] = useState([]);
    const [datosStock, setDatosStock] = useState([]);
    const [resumenGlobal, setResumenGlobal] = useState({
        ventasTotales: 0,
        costoTotal: 0,
        utilidad: 0,
        porCobrar: 0
    });

    // --- ESTADOS DE FILTRO DE STOCK ---
    const [busquedaStock, setBusquedaStock] = useState('');
    const [proveedorFiltro, setProveedorFiltro] = useState('Todos');

    // --- REFS ---
    const bufferEscaneo = useRef('');
    const timerEscaneo = useRef(null);
    const buscadorStockRef = useRef(null);

    // --- CONTEXTOS Y CONSTANTES ---
    const { showMessage } = useMessage();
    const BRAND_COLOR_RGB = [199, 43, 124];
    const COLORES = ['#c72b7c', '#e84a9b', '#8a1c53', '#ff7eb9', '#5c1236', '#ffb3d1'];

    const usuarioActual = useMemo(() => JSON.parse(localStorage.getItem('usuario') || '{}'), []);
    const esSuperAdmin = usuarioActual.rol_usu === 1;
    const puedeVerTodo = esSuperAdmin;

    const nombreSucursalActiva = !puedeVerTodo
        ? (usuarioActual.nombre_sucursal || 'Sede Principal')
        : (idSucursalSeleccionada === '0'
            ? 'Todas (Consolidado)'
            : ((Array.isArray(sucursales) ? sucursales.find(s => String(s.id_sucursal) === String(idSucursalSeleccionada))?.nombre : '') || 'Desconocida'));

    // --- CARGA INICIAL DE CONFIGURACIÓN ---
    useEffect(() => {
        const cargarConfiguraciones = async () => {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const resConfig = await axios.get(`${apiUrl}/api/configuracion`, config);
                if (resConfig.data && resConfig.data.tasa_bcv) {
                    setTasaBcv(Number(resConfig.data.tasa_bcv));
                }
                if (puedeVerTodo) {
                    const resSucursales = await axios.get(`${apiUrl}/api/sucursales`, config);
                    setSucursales(Array.isArray(resSucursales.data) ? resSucursales.data : []);
                }
            } catch (err) {
                console.error("Error cargando configuración inicial", err);
                setSucursales([]);
            }
        };
        cargarConfiguraciones();
    }, [puedeVerTodo]);

    // --- EVENTO DE ESCANEO EN SEGUNDO PLANO ---
    useEffect(() => {
        const manejarEscaneoFondo = (e) => {
            if (activeTab !== 'totalizacion_stock') return;
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'textarea' || activeTag === 'select') return;

            if (e.key === 'Enter') {
                if (bufferEscaneo.current.length >= 3) {
                    e.preventDefault();
                    const codigo = bufferEscaneo.current;
                    setBusquedaStock(codigo);
                    const activeEl = document.activeElement;
                    if (activeEl && activeEl.tagName === 'INPUT' && activeEl.id === 'buscador_stock') {
                        let valActual = activeEl.value;
                        if (valActual.endsWith(codigo)) {
                            const valorLimpio = valActual.slice(0, -codigo.length);
                            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                            if (nativeSetter) {
                                nativeSetter.call(activeEl, valorLimpio);
                                activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }
                    }
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
    }, [activeTab]);

    // --- LISTA DE PROVEEDORES ÚNICOS (MEMOIZADO) ---
    const proveedoresUnicos = useMemo(() => {
        if (!Array.isArray(datosStock) || datosStock.length === 0) return [];
        return [...new Set(datosStock.map(item => item.proveedor_principal).filter(Boolean))];
    }, [datosStock]);

    // --- FILTRADO DE STOCK OPTIMIZADO ---
    const stockFiltrado = useMemo(() => {
        if (!Array.isArray(datosStock) || datosStock.length === 0) return [];

        const tieneFiltroProv = proveedorFiltro !== 'Todos';
        const termino = busquedaStock.toLowerCase().trim();

        if (!tieneFiltroProv && !termino) {
            return datosStock;
        }

        return datosStock.filter(item => {
            if (tieneFiltroProv && item.proveedor_principal !== proveedorFiltro) {
                return false;
            }
            if (!termino) return true;

            const nombre = item.producto ? String(item.producto).toLowerCase() : '';
            const codigo = item.codigo_barras ? String(item.codigo_barras).toLowerCase() : '';
            const categoria = item.categoria ? String(item.categoria).toLowerCase() : '';
            const talla = item.talla ? String(item.talla).toLowerCase() : '';
            const color = item.color ? String(item.color).toLowerCase() : '';

            return nombre.includes(termino) ||
                   codigo.includes(termino) ||
                   categoria.includes(termino) ||
                   talla.includes(termino) ||
                   color.includes(termino);
        });
    }, [datosStock, proveedorFiltro, busquedaStock]);

    // --- TOTALES DE STOCK CALCULADOS ---
    const totalesStock = useMemo(() => {
        let totalArticulos = 0;
        let inversionTotal = 0;
        for (let i = 0; i < stockFiltrado.length; i++) {
            totalArticulos += Number(stockFiltrado[i].stock_actual) || 0;
            inversionTotal += Number(stockFiltrado[i].inversion_total) || 0;
        }
        return { totalArticulos, inversionTotal };
    }, [stockFiltrado]);

    // --- PETICIÓN DE REPORTES ---
    const cargarReportes = useCallback(async () => {
        if (!fechaInicio || !fechaFin) return;
        setCargando(true);
        setError(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');
            const res = await axios.get(`${apiUrl}/api/reportes/resumen`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin,
                    id_sucursal: idSucursalSeleccionada
                }
            });

            setDatosVentas(Array.isArray(res.data.datosVentas) ? res.data.datosVentas : []);
            setDatosTopProductos(Array.isArray(res.data.datosTopProductos) ? res.data.datosTopProductos : []);
            setDatosReorden(Array.isArray(res.data.datosReorden) ? res.data.datosReorden : []);
            setListaPrecios(Array.isArray(res.data.listaPrecios) ? res.data.listaPrecios : []);
            setDatosMovimientos(Array.isArray(res.data.historialMovimientos) ? res.data.historialMovimientos : []);
            setDatosEntradas(Array.isArray(res.data.historialEntradas) ? res.data.historialEntradas : []);
            setDatosIngresos(Array.isArray(res.data.historialIngresos) ? res.data.historialIngresos : []);
            setDatosProveedores(Array.isArray(res.data.datosProveedores) ? res.data.datosProveedores : []);
            setDatosStock(Array.isArray(res.data.datosStock) ? res.data.datosStock : []);
            setResumenGlobal({
                ventasTotales: Number(res.data.resumenGlobal?.ventasTotales || 0),
                costoTotal: Number(res.data.resumenGlobal?.costoTotal || 0),
                utilidad: Number(res.data.resumenGlobal?.utilidad || 0),
                porCobrar: Number(res.data.resumenGlobal?.porCobrar || 0)
            });
        } catch (err) {
            setError(err.response?.data?.message || "Error de conexión al generar los reportes.");
        } finally {
            setCargando(false);
        }
    }, [fechaInicio, fechaFin, idSucursalSeleccionada]);

    useEffect(() => {
        cargarReportes();
    }, [cargarReportes]);

    // --- ENCABEZADO PDF CENTRALIZADO (FORMATO VENEZUELA) ---
    const crearEncabezadoPDF = (doc, titulo) => {
        try {
            const img = new Image();
            img.src = logoEmpresa;
            doc.addImage(img, 'PNG', 14, 10, 20, 20);
        } catch (e) {
            console.error("Error al cargar el logo en el PDF", e);
        }
        doc.setFontSize(20);
        doc.setTextColor(...BRAND_COLOR_RGB);
        doc.setFont("helvetica", "bold");
        doc.text("LILI BOUTIQUE", 38, 17);
        doc.setFontSize(12);
        doc.setTextColor(80, 80, 80);
        doc.text(titulo, 38, 23);
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "normal");
        doc.text(`Período: ${formatearFechaCortaVE(fechaInicio)} al ${formatearFechaCortaVE(fechaFin)}   |   Sede: ${nombreSucursalActiva}`, 38, 28);
        doc.text(`Generado por: ${usuarioActual.usuario || 'Sistema'}  |  Fecha: ${formatearFechaHoraVE(new Date())}`, 38, 33);
        doc.setDrawColor(...BRAND_COLOR_RGB);
        doc.setLineWidth(0.5);
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.line(14, 38, pageWidth - 14, 38);
    };

    // --- EXPORTADORES PDF INDIVIDUALES ---
    const exportarMovimientosPDF = () => {
        const movimientosValidos = datosMovimientos.filter(row => Number(row.cantidad) > 0);
        if (movimientosValidos.length === 0) return showMessage("No hay salidas registradas en este período.", "warning");
        try {
            const doc = new jsPDF({ orientation: 'landscape' });
            crearEncabezadoPDF(doc, "Historial de Salidas / Movimientos");
            const tableData = movimientosValidos.map(row => {
                const refTexto = row.id_cliente !== 1 ? `Venta #${row.id_venta}` : row.motivo_real;
                return [
                    formatearFechaHoraVE(row.fecha),
                    `${row.producto}`,
                    row.cantidad,
                    `${row.usuario} / ${row.empleado || 'N/A'}`,
                    refTexto
                ];
            });
            autoTable(doc, {
                startY: 45,
                head: [['Fecha/Hora', 'Producto', 'Cant.', 'Operador', 'Motivo / Ref']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: BRAND_COLOR_RGB },
                styles: { fontSize: 9 }
            });
            doc.save(`Salidas_${fechaInicio}_a_${fechaFin}.pdf`);
            showMessage("Reporte de salidas descargado con éxito.", "success");
        } catch (err) {
            showMessage("Error al crear el PDF de salidas.", "danger");
        }
    };

    const exportarEntradasPDF = () => {
        if (datosEntradas.length === 0) return showMessage("No hay entradas registradas en este período.", "warning");
        try {
            const doc = new jsPDF();
            crearEncabezadoPDF(doc, "Historial de Entradas de Mercancía");
            const tableData = datosEntradas.map(row => [
                formatearFechaHoraVE(row.fecha),
                row.producto,
                row.cantidad,
                row.proveedor
            ]);
            autoTable(doc, {
                startY: 45,
                head: [['Fecha/Hora', 'Producto', 'Cant. Ingresada', 'Proveedor']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: BRAND_COLOR_RGB },
                styles: { fontSize: 9 }
            });
            doc.save(`Entradas_${fechaInicio}_a_${fechaFin}.pdf`);
            showMessage("Reporte de entradas descargado con éxito.", "success");
        } catch (err) {
            showMessage("Error al crear el PDF de entradas.", "danger");
        }
    };

    const exportarIngresosPDF = () => {
        if (datosIngresos.length === 0) return showMessage("No hay ingresos de dinero registrados.", "warning");
        try {
            const doc = new jsPDF();
            crearEncabezadoPDF(doc, "Flujo de Ingresos (Dinero)");
            const tableData = datosIngresos.map(row => [
                formatearFechaHoraVE(row.fecha),
                `Venta #${row.id_venta}`,
                row.metodo,
                Currency.formatear(row.monto_usd, '$'),
                Currency.formatear(Currency.multiplicar(row.monto_usd, tasaBcv), 'Bs')
            ]);
            autoTable(doc, {
                startY: 45,
                head: [['Fecha/Hora (Pago)', 'Referencia', 'Método', 'Monto (USD)', 'Monto (VES)']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: BRAND_COLOR_RGB },
                styles: { fontSize: 9 }
            });
            doc.save(`Ingresos_Dinero_${fechaInicio}_a_${fechaFin}.pdf`);
            showMessage("Reporte de ingresos descargado con éxito.", "success");
        } catch (err) {
            showMessage("Error al crear el PDF de ingresos.", "danger");
        }
    };

    const exportarStockPDF = () => {
        if (datosStock.length === 0) return showMessage("No hay datos de stock para exportar.", "warning");
        try {
            const doc = new jsPDF();
            crearEncabezadoPDF(doc, "Reporte de Totalización de Stock Actual");

            doc.setFontSize(10);
            doc.setTextColor(50, 50, 50);
            doc.setFont("helvetica", "bold");
            doc.text(`Filtro Proveedor: ${proveedorFiltro}  |  Total Artículos: ${totalesStock.totalArticulos} Unds  |  Inversión Total: ${Currency.formatear(totalesStock.inversionTotal, '$')}`, 14, 43);

            const tableData = stockFiltrado.map(row => {
                let presentacion = '';
                if (row.talla) presentacion += `Talla: ${row.talla} `;
                if (row.talla && row.color) presentacion += '- ';
                if (row.color) presentacion += `Color: ${row.color}`;
                return [
                    presentacion ? `${row.producto}\n(${presentacion.trim()})` : row.producto,
                    row.categoria || 'N/A',
                    row.proveedor_principal,
                    Currency.formatear(row.costo_unitario, '$'),
                    `${row.stock_actual} Unds`,
                    Currency.formatear(row.inversion_total, '$')
                ];
            });

            autoTable(doc, {
                startY: 47,
                head: [['Producto / Presentación', 'Categoría', 'Último Proveedor', 'Costo Unit.', 'Stock', 'Inversión Total']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: BRAND_COLOR_RGB },
                styles: { fontSize: 8 }
            });
            doc.save(`Totalizacion_Stock_${fechaInicio}_a_${fechaFin}.pdf`);
            showMessage("Reporte de stock descargado con éxito.", "success");
        } catch (err) {
            showMessage("Error al crear el PDF de stock.", "danger");
        }
    };

    const exportarListaPreciosPDF = () => {
        if (listaPrecios.length === 0) return showMessage("No hay productos registrados o con stock en esta sede.", "warning");
        try {
            const doc = new jsPDF();
            crearEncabezadoPDF(doc, "Lista de Precios de Productos");
            let startY = 45;
            const categorias = [...new Set(listaPrecios.map(item => item.categoria))];

            categorias.forEach((categoria) => {
                if (startY > 250) {
                    doc.addPage();
                    startY = 20;
                }
                doc.setFontSize(12);
                doc.setTextColor(...BRAND_COLOR_RGB);
                doc.setFont("helvetica", "bold");
                doc.text(`Categoría: ${categoria}`, 14, startY);

                const tableData = listaPrecios
                    .filter(item => item.categoria === categoria)
                    .map(p => {
                        const precioUsd = Number(p.precio_venta_usd) || 0;
                        return [
                            p.producto,
                            Currency.formatear(precioUsd, '$'),
                            Currency.formatear(Currency.multiplicar(precioUsd, tasaBcv), 'Bs')
                        ];
                    });

                autoTable(doc, {
                    startY: startY + 5,
                    head: [['Producto Base', 'Precio (USD)', 'Precio (VES)']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: BRAND_COLOR_RGB },
                    margin: { bottom: 15 }
                });
                startY = doc.lastAutoTable.finalY + 15;
            });

            doc.save(`Lista_Precios_${formatearFechaCortaVE(new Date()).replace(/\//g, '-')}.pdf`);
            showMessage("Lista de precios descargada con éxito.", "success");
        } catch (err) {
            showMessage("Error al crear la lista de precios.", "danger");
        }
    };

    const exportarProveedoresPDF = () => {
        if (datosProveedores.length === 0) return showMessage("No hay compras a proveedores en este período.", "warning");
        try {
            const doc = new jsPDF();
            crearEncabezadoPDF(doc, "Reporte de Compras por Proveedor");
            const tableData = datosProveedores.map(row => [
                row.proveedor,
                row.total_compras,
                `+${row.total_articulos_comprados}`,
                Currency.formatear(row.inversion_total_usd, '$'),
                Currency.formatear(Currency.multiplicar(row.inversion_total_usd, tasaBcv), 'Bs')
            ]);

            autoTable(doc, {
                startY: 45,
                head: [['Proveedor / Origen', 'N° Compras', 'Cant. Artículos', 'Inversión (USD)', 'Inversión (VES)']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: BRAND_COLOR_RGB },
                styles: { fontSize: 9 }
            });
            doc.save(`Proveedores_${fechaInicio}_a_${fechaFin}.pdf`);
            showMessage("Reporte de proveedores descargado con éxito.", "success");
        } catch (err) {
            showMessage("Error al crear el PDF de proveedores.", "danger");
        }
    };

    const exportarPDF = () => {
        if (error) return showMessage("No es posible generar el reporte.", "danger");
        try {
            const doc = new jsPDF();
            crearEncabezadoPDF(doc, "Reporte Gerencial del Sistema");

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("1. Resumen Financiero", 14, 46);

            autoTable(doc, {
                startY: 50,
                head: [['Indicador', 'Monto USD', 'Equivalente VES']],
                body: [
                    ['Ventas Brutas', Currency.formatear(resumenGlobal.ventasTotales, '$'), Currency.formatear(Currency.multiplicar(resumenGlobal.ventasTotales, tasaBcv), 'Bs')],
                    ['Costo de Mercancía', Currency.formatear(resumenGlobal.costoTotal, '$'), Currency.formatear(Currency.multiplicar(resumenGlobal.costoTotal, tasaBcv), 'Bs')],
                    ['Utilidad Bruta', Currency.formatear(resumenGlobal.utilidad, '$'), Currency.formatear(Currency.multiplicar(resumenGlobal.utilidad, tasaBcv), 'Bs')],
                    ['Cuentas por Cobrar', Currency.formatear(resumenGlobal.porCobrar, '$'), Currency.formatear(Currency.multiplicar(resumenGlobal.porCobrar, tasaBcv), 'Bs')]
                ],
                theme: 'striped',
                headStyles: { fillColor: BRAND_COLOR_RGB }
            });

            let currentY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("2. Desglose de Ventas Diarias", 14, currentY);

            const tableData = datosVentas.map(row => [
                formatearFechaCortaVE(row.fecha),
                Currency.formatear(row.ventas, '$'),
                Currency.formatear(row.costo, '$'),
                Currency.formatear(Currency.restar(row.ventas, row.costo), '$')
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Fecha', 'Ventas USD', 'Costo USD', 'Margen USD']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: BRAND_COLOR_RGB }
            });

            doc.save(`Reporte_Gerencial_${fechaInicio}_a_${fechaFin}.pdf`);
            showMessage("Reporte Gerencial descargado con éxito.", "success");
        } catch (err) {
            showMessage("Error al crear el PDF gerencial.", "danger");
        }
    };

    // --- RENDERIZADO PRINCIPAL ---
    return (
        <Container fluid className="p-2 p-md-3 d-flex flex-column h-100 alto-fijo-pc" style={{ minHeight: 0 }}>
            {/* CABECERA Y BOTONES DE DESCARGA */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2" style={{ flexShrink: 0 }}>
                <h4 className="text-primary fw-bold mb-0 fs-5 fs-md-4">
                    <FontAwesomeIcon icon={faChartPie} className="me-2" />
                    Panel Gerencial
                </h4>
                <div className="d-flex gap-2 w-100 w-md-auto flex-wrap justify-content-end">
                    {/* Botones PDF en móviles (Dropdown) */}
                    <DropdownButton
                        id="dropdown-descargas"
                        title={<><FontAwesomeIcon icon={faFilePdf} className="me-1" /> Historiales PDF</>}
                        variant="secondary"
                        size="sm"
                        className="d-md-none flex-grow-1"
                        disabled={cargando}
                    >
                        <Dropdown.Item onClick={exportarMovimientosPDF}>
                            <FontAwesomeIcon icon={faClipboardList} className="me-2 text-info" /> Salidas de Inv.
                        </Dropdown.Item>
                        <Dropdown.Item onClick={exportarEntradasPDF}>
                            <FontAwesomeIcon icon={faTruckLoading} className="me-2 text-primary" /> Entradas de Inv.
                        </Dropdown.Item>
                        <Dropdown.Item onClick={exportarIngresosPDF}>
                            <FontAwesomeIcon icon={faHandHoldingDollar} className="me-2 text-success" /> Dinero Recibido
                        </Dropdown.Item>
                        <Dropdown.Item onClick={exportarProveedoresPDF}>
                            <FontAwesomeIcon icon={faStore} className="me-2 text-warning" /> Compras a Proveedores
                        </Dropdown.Item>
                        <Dropdown.Item onClick={exportarStockPDF}>
                            <FontAwesomeIcon icon={faBox} className="me-2 text-primary" /> Totalización Stock
                        </Dropdown.Item>
                    </DropdownButton>

                    {/* Botones PDF en pantalla mediana/grande */}
                    <div className="d-none d-md-flex gap-2">
                        <Button variant="info" size="sm" className="fw-bold shadow-sm text-white" onClick={exportarMovimientosPDF} disabled={cargando}>
                            <FontAwesomeIcon icon={faClipboardList} className="me-1" /> Salidas
                        </Button>
                        <Button variant="primary" size="sm" className="fw-bold shadow-sm" onClick={exportarEntradasPDF} disabled={cargando}>
                            <FontAwesomeIcon icon={faTruckLoading} className="me-1" /> Entradas
                        </Button>
                        <Button variant="success" size="sm" className="fw-bold shadow-sm" onClick={exportarIngresosPDF} disabled={cargando}>
                            <FontAwesomeIcon icon={faHandHoldingDollar} className="me-1" /> Ingresos
                        </Button>
                        <Button variant="warning" size="sm" className="fw-bold shadow-sm" onClick={exportarProveedoresPDF} disabled={cargando}>
                            <FontAwesomeIcon icon={faStore} className="me-1" /> Proveedores
                        </Button>
                        <Button variant="outline-primary" size="sm" className="fw-bold shadow-sm bg-white" onClick={exportarStockPDF} disabled={cargando}>
                            <FontAwesomeIcon icon={faBox} className="me-1" /> Stock PDF
                        </Button>
                    </div>

                    <Button variant="dark" size="sm" className="fw-bold shadow-sm flex-grow-1 flex-md-grow-0 py-2 py-md-1" onClick={exportarListaPreciosPDF} disabled={cargando}>
                        <FontAwesomeIcon icon={faTags} className="me-1" /> Precios
                    </Button>
                    <Button variant="danger" size="sm" className="fw-bold shadow-sm flex-grow-1 flex-md-grow-0 py-2 py-md-1" onClick={exportarPDF} disabled={cargando}>
                        <FontAwesomeIcon icon={faChartPie} className="me-1" /> Gerencial
                    </Button>
                </div>
            </div>

            {/* BARRA DE FILTROS (BLOQUEO SIMULTÁNEO DURANTE LA CARGA) */}
            <Card className="shadow-sm border-0 mb-3 bg-white" style={{ flexShrink: 0 }}>
                <Card.Body className="p-2 p-md-3">
                    <Row className="g-2 m-0 align-items-end">
                        <Col xs={6} md={esSuperAdmin ? 3 : 4} className="px-1 px-md-2">
                            <Form.Group>
                                <Form.Label className="fw-bold text-secondary mb-1" style={{ fontSize: '0.8rem' }}>Inicio</Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className="shadow-sm"
                                    disabled={cargando}
                                />
                            </Form.Group>
                        </Col>
                        <Col xs={6} md={esSuperAdmin ? 3 : 4} className="px-1 px-md-2">
                            <Form.Group>
                                <Form.Label className="fw-bold text-secondary mb-1" style={{ fontSize: '0.8rem' }}>Fin</Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                    className="shadow-sm"
                                    disabled={cargando}
                                />
                            </Form.Group>
                        </Col>
                        {puedeVerTodo && (
                            <Col xs={12} md={3} className="px-1 px-md-2 mt-2 mt-md-0">
                                <Form.Group>
                                    <Form.Label className="fw-bold text-primary mb-1" style={{ fontSize: '0.8rem' }}>
                                        <FontAwesomeIcon icon={faStore} /> Sucursal
                                    </Form.Label>
                                    <Form.Select
                                        size="sm"
                                        value={idSucursalSeleccionada}
                                        onChange={(e) => setIdSucursalSeleccionada(e.target.value)}
                                        className="shadow-sm"
                                        disabled={cargando || !Array.isArray(sucursales) || sucursales.length === 0}
                                    >
                                        <option value="0">Todas (Consolidado)</option>
                                        {Array.isArray(sucursales) && sucursales.map(suc => (
                                            <option key={suc.id_sucursal} value={suc.id_sucursal}>
                                                {suc.nombre}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        )}
                        <Col xs={12} md={esSuperAdmin ? 3 : 4} className="px-1 px-md-2 mt-2 mt-md-0">
                            <Button variant="primary" size="sm" className="w-100 fw-bold shadow-sm py-2 py-md-1" onClick={cargarReportes} disabled={cargando}>
                                {cargando ? 'Generando...' : 'Aplicar Filtros'}
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* MENSAJE DE ERROR */}
            {error && (
                <Alert variant="danger" className="shadow-sm mb-3" style={{ flexShrink: 0 }}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    Hubo un problema: {error}
                </Alert>
            )}

            {/* CONTENIDO PRINCIPAL */}
            {cargando ? (
                <Loader texto="Calculando estadísticas y métricas..." />
            ) : (
                !error && (
                    <div className="flex-grow-1 d-flex flex-column overflow-x-hidden" style={{ minHeight: 0 }}>
                        {/* TARJETAS DE TOTALES (KPIS) */}
                        <Row className="g-2 mb-3 m-0" style={{ flexShrink: 0 }}>
                            <Col xs={6} lg={3} className="px-1 px-md-2">
                                <Card className="shadow-sm border-0 border-start border-primary border-4 h-100">
                                    <Card.Body className="p-2 p-md-3">
                                        <h6 className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '0.7rem' }}>Ventas Brutas</h6>
                                        <div className="fw-bold mb-0 text-dark fs-5 fs-md-3">
                                            {Currency.formatear(resumenGlobal.ventasTotales, '$')}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col xs={6} lg={3} className="px-1 px-md-2">
                                <Card className="shadow-sm border-0 border-start border-danger border-4 h-100">
                                    <Card.Body className="p-2 p-md-3">
                                        <h6 className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '0.7rem' }}>Costo Mercancía</h6>
                                        <div className="fw-bold mb-0 text-dark fs-5 fs-md-3">
                                            {Currency.formatear(resumenGlobal.costoTotal, '$')}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col xs={6} lg={3} className="px-1 px-md-2">
                                <Card className="shadow-sm border-0 border-start border-success border-4 h-100 bg-success bg-opacity-10">
                                    <Card.Body className="p-2 p-md-3">
                                        <h6 className="text-success fw-bold text-uppercase mb-1" style={{ fontSize: '0.7rem' }}>Utilidad Estimada</h6>
                                        <div className="fw-bold text-success mb-0 fs-5 fs-md-3">
                                            {Currency.formatear(resumenGlobal.utilidad, '$')}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col xs={6} lg={3} className="px-1 px-md-2">
                                <Card className="shadow-sm border-0 border-start border-warning border-4 h-100">
                                    <Card.Body className="p-2 p-md-3">
                                        <h6 className="text-muted fw-bold text-uppercase mb-1 text-truncate" style={{ fontSize: '0.7rem' }}>Por Cobrar</h6>
                                        <div className="fw-bold mb-0 text-dark fs-5 fs-md-3">
                                            {Currency.formatear(resumenGlobal.porCobrar, '$')}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* CONTENEDOR DE PESTAÑAS */}
                        <Card className="shadow-sm border-0 mb-2 mx-0 d-flex flex-column flex-grow-1" style={{ minHeight: '350px' }}>
                            <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                                <div className="overflow-x-auto px-2 px-md-3 pt-2" style={{ whiteSpace: 'nowrap', borderBottom: '1px solid #dee2e6', flexShrink: 0 }}>
                                    <Nav variant="tabs" className="border-bottom-0 custom-tabs d-inline-flex flex-nowrap w-100 m-0">
                                        <Nav.Item><Nav.Link eventKey="ventas" className="text-nowrap">Gráficos de Ventas</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="movimientos" className="text-nowrap"><FontAwesomeIcon icon={faClipboardList} className="me-1" /> Salidas</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="entradas" className="text-nowrap"><FontAwesomeIcon icon={faTruckLoading} className="me-1" /> Entradas</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="ingresos" className="text-nowrap"><FontAwesomeIcon icon={faHandHoldingDollar} className="me-1" /> Dinero Recibido</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="proveedores" className="text-nowrap"><FontAwesomeIcon icon={faStore} className="me-1" /> Proveedores</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="totalizacion_stock" className="text-nowrap">Totalización de Stock</Nav.Link></Nav.Item>
                                        <Nav.Item><Nav.Link eventKey="alertas" className="text-nowrap text-danger"><FontAwesomeIcon icon={faExclamationTriangle} className="me-1" /> Alertas Stock</Nav.Link></Nav.Item>
                                    </Nav>
                                </div>

                                <Card.Body className="p-0 position-relative flex-grow-1" style={{ overflow: 'hidden' }}>
                                    <div className="position-absolute w-100 h-100" style={{ overflowY: 'auto' }}>
                                        <Tab.Content className="p-2 p-md-3">
                                            {/* TAB 1: GRÁFICOS DE VENTAS */}
                                            <Tab.Pane eventKey="ventas">
                                                <Row className="g-3">
                                                    <Col xs={12} lg={8}>
                                                        <Card className="shadow-sm border-0 h-100">
                                                            <Card.Body className="p-1 p-md-2">
                                                                <h6 className="fw-bold text-secondary text-center mb-3">
                                                                    <FontAwesomeIcon icon={faMoneyBillTrendUp} className="me-1" /> Tendencia de Ventas
                                                                </h6>
                                                                <div style={{ width: '100%', height: 260 }}>
                                                                    <ResponsiveContainer>
                                                                        <LineChart data={datosVentas} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                                                            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                                            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} tick={{ fontSize: 10 }} />
                                                                            <RechartsTooltip formatter={(value) => [`$${value}`, undefined]} />
                                                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                                                            <Line type="monotone" name="Ventas" dataKey="ventas" stroke="#c72b7c" strokeWidth={3} />
                                                                            <Line type="monotone" name="Costos" dataKey="costo" stroke="#dc3545" strokeWidth={2} />
                                                                        </LineChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                            </Card.Body>
                                                        </Card>
                                                    </Col>
                                                    <Col xs={12} lg={4}>
                                                        <Card className="shadow-sm border-0 h-100">
                                                            <Card.Body className="d-flex flex-column justify-content-center align-items-center p-2">
                                                                <h6 className="fw-bold text-secondary text-center">
                                                                    <FontAwesomeIcon icon={faBox} className="me-1" /> Top Productos
                                                                </h6>
                                                                <div style={{ width: '100%', height: 180 }}>
                                                                    <ResponsiveContainer>
                                                                        <PieChart>
                                                                            <Pie
                                                                                data={datosTopProductos}
                                                                                cx="50%"
                                                                                cy="50%"
                                                                                innerRadius={45}
                                                                                outerRadius={70}
                                                                                paddingAngle={5}
                                                                                dataKey="value"
                                                                            >
                                                                                {datosTopProductos.map((entry, index) => (
                                                                                    <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                                                                                ))}
                                                                            </Pie>
                                                                            <RechartsTooltip />
                                                                        </PieChart>
                                                                    </ResponsiveContainer>
                                                                </div>
                                                                <div className="w-100 px-2 px-md-3 mt-2" style={{ fontSize: '0.8rem' }}>
                                                                    {datosTopProductos.map((item, index) => (
                                                                        <div key={index} className="d-flex justify-content-between align-items-center mb-1">
                                                                            <span className="text-truncate" style={{ maxWidth: '70%' }}>
                                                                                <span style={{ color: COLORES[index % COLORES.length] }}>● </span> {item.name}
                                                                            </span>
                                                                            <Badge bg="light" text="dark" className="border">{item.value} Und</Badge>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </Card.Body>
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            </Tab.Pane>

                                            {/* TAB 2: SALIDAS / MOVIMIENTOS */}
                                            <Tab.Pane eventKey="movimientos">
                                                <Table hover size="sm" className="align-middle mb-0 text-center custom-table w-100">
                                                    <thead className="table-light sticky-top shadow-sm">
                                                        <tr>
                                                            <th className="text-start ps-3">Fecha/Hora</th>
                                                            <th className="text-start">Producto</th>
                                                            <th>Cant.</th>
                                                            <th className="d-none d-md-table-cell">Motivo / Ref</th>
                                                            <th className="d-none d-sm-table-cell">Operador</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {datosMovimientos.length === 0 ? (
                                                            <tr><td colSpan="5" className="text-center text-muted py-4">No hay salidas registradas.</td></tr>
                                                        ) : (
                                                            datosMovimientos.map((row, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="text-start ps-3 text-secondary" style={{ fontSize: '0.8rem' }}>
                                                                        {formatearFechaHoraVE(row.fecha)}
                                                                    </td>
                                                                    <td className="text-start fw-bold" style={{ fontSize: '0.85rem' }}>
                                                                        {row.producto}
                                                                        <span className="text-muted d-block fst-italic mt-1 d-md-none" style={{ fontSize: '0.7rem' }}>
                                                                            {row.id_cliente !== 1 ? `Venta #${row.id_venta}` : row.motivo_real}
                                                                        </span>
                                                                    </td>
                                                                    <td className="fw-bold text-danger">
                                                                        {Number(row.cantidad) > 0 ? `-${row.cantidad}` : row.cantidad}
                                                                    </td>
                                                                    <td className="d-none d-md-table-cell">
                                                                        <span className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                                                                            {row.id_cliente !== 1 ? `Venta #${row.id_venta}` : row.motivo_real}
                                                                        </span>
                                                                    </td>
                                                                    <td className="d-none d-sm-table-cell text-muted" style={{ fontSize: '0.8rem' }}>
                                                                        <strong>{row.usuario}</strong>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </Tab.Pane>

                                            {/* TAB 3: ENTRADAS DE MERCANCÍA */}
                                            <Tab.Pane eventKey="entradas">
                                                <Table hover size="sm" className="align-middle mb-0 text-center custom-table w-100">
                                                    <thead className="table-light sticky-top shadow-sm">
                                                        <tr>
                                                            <th className="text-start ps-3">Fecha/Hora</th>
                                                            <th className="text-start">Producto Ingresado</th>
                                                            <th>Cant.</th>
                                                            <th className="d-none d-md-table-cell">Proveedor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {datosEntradas.length === 0 ? (
                                                            <tr><td colSpan="4" className="text-center text-muted py-4">No hay entradas registradas.</td></tr>
                                                        ) : (
                                                            datosEntradas.map((row, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="text-start ps-3 text-secondary" style={{ fontSize: '0.8rem' }}>
                                                                        {formatearFechaHoraVE(row.fecha)}
                                                                    </td>
                                                                    <td className="text-start fw-bold" style={{ fontSize: '0.85rem' }}>
                                                                        {row.producto}
                                                                        <span className="text-muted d-block fst-italic mt-1 d-md-none" style={{ fontSize: '0.7rem' }}>
                                                                            Prov: {row.proveedor}
                                                                        </span>
                                                                    </td>
                                                                    <td className="fw-bold text-success">+{row.cantidad}</td>
                                                                    <td className="d-none d-md-table-cell text-muted" style={{ fontSize: '0.8rem' }}>
                                                                        {row.proveedor}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </Tab.Pane>

                                            {/* TAB 4: DINERO RECIBIDO (INGRESOS CON FECHA DE PAGO) */}
                                            <Tab.Pane eventKey="ingresos">
                                                <Table hover size="sm" className="align-middle mb-0 text-center custom-table w-100">
                                                    <thead className="table-light sticky-top shadow-sm">
                                                        <tr>
                                                            <th className="text-start ps-3">Fecha/Hora (Pago)</th>
                                                            <th>Referencia</th>
                                                            <th className="d-none d-md-table-cell">Método</th>
                                                            <th>Monto USD</th>
                                                            <th className="d-none d-sm-table-cell">Equivalente Bs</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {datosIngresos.length === 0 ? (
                                                            <tr><td colSpan="5" className="text-center text-muted py-4">No hay ingresos registrados.</td></tr>
                                                        ) : (
                                                            datosIngresos.map((row, idx) => (
                                                                <tr key={idx} className={row.es_vuelto ? "table-danger" : ""}>
                                                                    <td className="text-start ps-3 text-secondary" style={{ fontSize: '0.8rem' }}>
                                                                        {formatearFechaHoraVE(row.fecha)}
                                                                    </td>
                                                                    <td className="fw-bold text-muted" style={{ fontSize: '0.85rem' }}>
                                                                        Venta #{row.id_venta}
                                                                        {row.es_vuelto ? <Badge bg="danger" className="ms-2">VUELTO</Badge> : null}
                                                                        <div className="d-md-none text-primary mt-1" style={{ fontSize: '0.7rem' }}>{row.metodo}</div>
                                                                    </td>
                                                                    <td className="d-none d-md-table-cell text-primary fw-bold" style={{ fontSize: '0.8rem' }}>
                                                                        {row.metodo}
                                                                    </td>
                                                                    <td className={`fw-bold ${row.es_vuelto ? 'text-danger' : 'text-success'}`}>
                                                                        {Currency.formatear(row.monto_usd, '$')}
                                                                    </td>
                                                                    <td className="d-none d-sm-table-cell text-muted" style={{ fontSize: '0.8rem' }}>
                                                                        {Currency.formatear(Currency.multiplicar(row.monto_usd, tasaBcv), 'Bs')}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </Tab.Pane>

                                            {/* TAB 5: PROVEEDORES */}
                                            <Tab.Pane eventKey="proveedores">
                                                <Table hover size="sm" className="align-middle mb-0 text-center custom-table w-100">
                                                    <thead className="table-light sticky-top shadow-sm">
                                                        <tr>
                                                            <th className="text-start ps-3">Proveedor / Origen</th>
                                                            <th>N° Compras</th>
                                                            <th>Artículos Adquiridos</th>
                                                            <th>Inversión (USD)</th>
                                                            <th className="d-none d-sm-table-cell">Equivalente Bs</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {datosProveedores.length === 0 ? (
                                                            <tr><td colSpan="5" className="text-center text-muted py-4">No hay compras a proveedores registradas en este período.</td></tr>
                                                        ) : (
                                                            datosProveedores.map((row, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="text-start ps-3 fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
                                                                        {row.proveedor}
                                                                    </td>
                                                                    <td className="text-muted fw-bold">{row.total_compras}</td>
                                                                    <td className="fw-bold text-primary">+{row.total_articulos_comprados} Und</td>
                                                                    <td className="fw-bold text-danger">
                                                                        {Currency.formatear(row.inversion_total_usd, '$')}
                                                                    </td>
                                                                    <td className="d-none d-sm-table-cell text-muted" style={{ fontSize: '0.8rem' }}>
                                                                        {Currency.formatear(Currency.multiplicar(row.inversion_total_usd, tasaBcv), 'Bs')}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </Tab.Pane>

                                            {/* TAB 6: TOTALIZACIÓN DE STOCK */}
                                            <Tab.Pane eventKey="totalizacion_stock">
                                                <Row className="g-2 mb-3 align-items-center bg-light p-2 rounded m-0">
                                                    <Col xs={12} md={4}>
                                                        <Form.Group className="d-flex align-items-center gap-2">
                                                            <Form.Label className="fw-bold text-secondary mb-0 text-nowrap" style={{ fontSize: '0.85rem' }}>Proveedor:</Form.Label>
                                                            <Form.Select
                                                                size="sm"
                                                                value={proveedorFiltro}
                                                                onChange={(e) => setProveedorFiltro(e.target.value)}
                                                                className="shadow-sm bg-white"
                                                            >
                                                                <option value="Todos">Todos</option>
                                                                {proveedoresUnicos.map((prov, i) => (
                                                                    <option key={i} value={prov}>{prov}</option>
                                                                ))}
                                                            </Form.Select>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col xs={12} md={4}>
                                                        <InputGroup size="sm" className="shadow-sm">
                                                            <InputGroup.Text className="bg-white"><FontAwesomeIcon icon={faSearch} className="text-muted" /></InputGroup.Text>
                                                            <Form.Control
                                                                id="buscador_stock"
                                                                placeholder="Buscar producto, SKU, categoría, talla..."
                                                                value={busquedaStock}
                                                                onChange={(e) => setBusquedaStock(e.target.value)}
                                                                ref={buscadorStockRef}
                                                            />
                                                            {busquedaStock && (
                                                                <Button variant="outline-secondary" onClick={() => setBusquedaStock('')} className="bg-white border-start-0">
                                                                    <FontAwesomeIcon icon={faXmark} />
                                                                </Button>
                                                            )}
                                                        </InputGroup>
                                                    </Col>
                                                    <Col xs={12} md={4} className="d-flex justify-content-md-end gap-3 mt-2 mt-md-0">
                                                        <div className="text-dark" style={{ fontSize: '0.85rem' }}>
                                                            <strong>Totales:</strong> <span className="badge bg-primary fs-6">
                                                                {totalesStock.totalArticulos} Unds
                                                            </span>
                                                        </div>
                                                        <div className="text-dark" style={{ fontSize: '0.85rem' }}>
                                                            <strong>Inversión:</strong> <span className="badge bg-success fs-6">
                                                                {Currency.formatear(totalesStock.inversionTotal, '$')}
                                                            </span>
                                                        </div>
                                                    </Col>
                                                </Row>
                                                <Table hover size="sm" className="align-middle mb-0 text-center custom-table w-100">
                                                    <thead className="table-light sticky-top shadow-sm">
                                                        <tr>
                                                            <th className="text-start ps-3">Producto / Presentación</th>
                                                            <th>Categoría</th>
                                                            <th>Último Proveedor</th>
                                                            <th>Costo Unit.</th>
                                                            <th>Stock Disponible</th>
                                                            <th>Inversión Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {stockFiltrado.length === 0 ? (
                                                            <tr><td colSpan="6" className="text-center text-muted py-4">No hay existencias registradas para el filtro seleccionado.</td></tr>
                                                        ) : (
                                                            stockFiltrado.map((row, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="text-start ps-3 fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
                                                                        {row.producto}
                                                                        {(row.talla || row.color || row.codigo_barras) && (
                                                                            <div className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>
                                                                                {row.talla ? `Talla: ${row.talla} ` : ''}
                                                                                {row.talla && row.color ? '| ' : ''}
                                                                                {row.color ? `Color: ${row.color} ` : ''}
                                                                                {row.codigo_barras ? `[${row.codigo_barras}]` : ''}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-secondary">{row.categoria || 'N/A'}</td>
                                                                    <td><span className="badge bg-light text-dark border">{row.proveedor_principal}</span></td>
                                                                    <td className="fw-bold text-secondary">
                                                                        {Currency.formatear(row.costo_unitario, '$')}
                                                                    </td>
                                                                    <td className={`fw-bold ${row.stock_actual <= 0 ? 'text-danger' : 'text-primary'}`}>
                                                                        {row.stock_actual} Unds
                                                                    </td>
                                                                    <td className="fw-bold text-success">
                                                                        {Currency.formatear(row.inversion_total, '$')}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </Tab.Pane>

                                            {/* TAB 7: ALERTAS DE STOCK */}
                                            <Tab.Pane eventKey="alertas">
                                                <Table hover size="sm" className="align-middle mb-0 text-center custom-table w-100">
                                                    <thead className="table-light sticky-top shadow-sm">
                                                        <tr>
                                                            <th className="text-start ps-3">Producto</th>
                                                            <th className="d-none d-md-table-cell">Categoría</th>
                                                            <th>Stock</th>
                                                            <th className="d-none d-sm-table-cell">Límite</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {datosReorden.length === 0 ? (
                                                            <tr><td colSpan="4" className="text-center py-4 text-success fw-bold">Ningún producto requiere reabastecimiento.</td></tr>
                                                        ) : (
                                                            datosReorden.map((row, idx) => (
                                                                <tr key={idx} className="table-danger">
                                                                    <td className="text-start ps-3 fw-bold text-dark" style={{ fontSize: '0.85rem' }}>{row.producto}</td>
                                                                    <td className="d-none d-md-table-cell">{row.categoria || 'N/A'}</td>
                                                                    <td className="text-danger fw-bold">{row.stock_actual}</td>
                                                                    <td className="text-secondary fw-bold d-none d-sm-table-cell">{row.punto_reorden}</td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </Table>
                                            </Tab.Pane>
                                        </Tab.Content>
                                    </div>
                                </Card.Body>
                            </Tab.Container>
                        </Card>
                    </div>
                )
            )}
        </Container>
    );
}