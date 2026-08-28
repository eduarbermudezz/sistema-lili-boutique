import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

export const obtenerReporteGerencial = async (req, res) => {
    const { fecha_inicio, fecha_fin, id_sucursal } = req.query;

    if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ message: 'Las fechas de inicio y fin son requeridas.' });
    }

    let sucursalActiva = (id_sucursal && id_sucursal !== '0' && id_sucursal !== 'undefined') ? String(id_sucursal) : '0';

    if (req.user && req.user.rol_usu !== 1) {
        sucursalActiva = String(req.user.id_sucursal);
    }

    let sucursalFiltroVentas = '';
    let sucursalFiltroEntradas = '';
    let sucursalFiltroInventario = '';

    let paramsVentas = [fecha_inicio, fecha_fin];
    let paramsEntradas = [fecha_inicio, fecha_fin];
    let paramsInventario = [];

    if (sucursalActiva !== '0') {
        sucursalFiltroVentas = ' AND v.id_sucursal = ?';
        sucursalFiltroEntradas = ' AND e.id_sucursal = ?';
        sucursalFiltroInventario = ' AND inv.id_sucursal = ?';

        paramsVentas.push(sucursalActiva);
        paramsEntradas.push(sucursalActiva);
        paramsInventario.push(sucursalActiva);
    }

    try {
        const resumenGlobalSql = `
            SELECT 
                SUM(
                    IFNULL((
                        SELECT IFNULL(SUM(subtotal), 0) - IFNULL(SUM(IFNULL(cantidad_devuelta, 0) * IFNULL(precio_unitario, 0)), 0)
                        FROM detalles_venta dv 
                        WHERE dv.id_venta = v.id_venta
                    ), 0) - v.descuento_usd + v.recargo_mora
                ) AS ventasTotales,
                SUM(v.descuento_usd) AS totalDescuentos,
                (
                    SELECT SUM((dv.cantidad_vendida - IFNULL(dv.cantidad_devuelta, 0)) * pp.costo_usd)
                    FROM detalles_venta dv
                    JOIN ventas v2 ON dv.id_venta = v2.id_venta
                    JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
                    WHERE v2.id_cliente != 1
                       AND DATE(v2.fecha) BETWEEN ? AND ? ${sucursalFiltroVentas.replace('v.id_sucursal', 'v2.id_sucursal')}
                ) AS costoTotal
            FROM ventas v
            WHERE v.id_cliente != 1
               AND DATE(v.fecha) BETWEEN ? AND ? ${sucursalFiltroVentas}
        `;

        const cuentasPorCobrarSql = `
            SELECT SUM(deuda_factura) AS porCobrar
            FROM (
                SELECT 
                    ROUND(
                        (IFNULL((SELECT IFNULL(SUM(subtotal), 0) - IFNULL(SUM(IFNULL(cantidad_devuelta, 0) * IFNULL(precio_unitario, 0)), 0) FROM detalles_venta dv WHERE dv.id_venta = v.id_venta), 0) - v.descuento_usd + v.recargo_mora)
                        - v.total_pagado, 
                    4) AS deuda_factura
                FROM ventas v
                WHERE v.id_cliente != 1
                   AND DATE(v.fecha) BETWEEN ? AND ? ${sucursalFiltroVentas}
            ) facturas
            WHERE deuda_factura > 0.01
        `;
        
        const ventasDiariasSql = `
            SELECT 
                DATE(v.fecha) AS fecha,
                SUM(IFNULL((SELECT IFNULL(SUM(subtotal), 0) - IFNULL(SUM(IFNULL(cantidad_devuelta, 0) * IFNULL(precio_unitario, 0)), 0) FROM detalles_venta dv WHERE dv.id_venta = v.id_venta), 0) - v.descuento_usd + v.recargo_mora) AS ventas,
                SUM((SELECT SUM((dv2.cantidad_vendida - IFNULL(dv2.cantidad_devuelta, 0)) * pp.costo_usd) FROM detalles_venta dv2 JOIN presentaciones_producto pp ON dv2.id_presentacion = pp.id_presentacion WHERE dv2.id_venta = v.id_venta)) AS costo
            FROM ventas v
            WHERE v.id_cliente != 1
               AND DATE(v.fecha) BETWEEN ? AND ? ${sucursalFiltroVentas}
            GROUP BY DATE(v.fecha)
            ORDER BY DATE(v.fecha) ASC
        `;

        const topProductosSql = `
            SELECT 
                p.nombre_base AS name, 
                SUM(dv.cantidad_vendida - IFNULL(dv.cantidad_devuelta, 0)) AS value
            FROM detalles_venta dv
            JOIN ventas v ON dv.id_venta = v.id_venta
            JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
            JOIN productos p ON pp.id_producto = p.id_prod
            WHERE v.id_cliente != 1 
              AND DATE(v.fecha) BETWEEN ? AND ? ${sucursalFiltroVentas}
            GROUP BY p.id_prod, p.nombre_base
            HAVING value > 0
            ORDER BY value DESC
            LIMIT 5
        `;

        const reordenSql = `
            SELECT 
                p.nombre_base AS producto, 
                c.descrip_categ AS categoria, 
                inv.stock AS stock_actual, 
                pp.punto_reorden
            FROM inventario_sucursales inv
            JOIN presentaciones_producto pp ON inv.id_presentacion = pp.id_presentacion
            JOIN productos p ON pp.id_producto = p.id_prod
            LEFT JOIN categorias_producto c ON p.categ_prod = c.id_categ
            WHERE inv.stock <= pp.punto_reorden ${sucursalFiltroInventario}
            ORDER BY inv.stock ASC
        `;

        const metodosSql = `
            SELECT 
                mp.descripcion AS metodo, 
                SUM(pv.monto_usd) AS total_usd
            FROM pagos_venta pv
            JOIN ventas v ON pv.id_venta = v.id_venta
            JOIN metodos_pago mp ON pv.id_metodo_pago = mp.id_metodo
            WHERE v.id_cliente != 1 
              AND DATE(COALESCE(pv.fecha, v.fecha)) BETWEEN ? AND ? ${sucursalFiltroVentas}
            GROUP BY mp.id_metodo, mp.descripcion
            ORDER BY total_usd DESC
        `;

        const historialMovimientosSql = `
            SELECT 
                v.fecha, 
                p.nombre_base AS producto, 
                (dv.cantidad_vendida - IFNULL(dv.cantidad_devuelta, 0)) AS cantidad,
                IFNULL(v.motivo_ajuste, 'VENTA') AS motivo_real, 
                v.id_venta, 
                v.id_cliente, 
                u.usuario,
                CONCAT(e.nom_emp, ' ', e.ape_emp) AS empleado
            FROM detalles_venta dv
            JOIN ventas v ON dv.id_venta = v.id_venta
            JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
            JOIN productos p ON pp.id_producto = p.id_prod
            JOIN usuarios u ON v.id_usuario = u.id_usu
            LEFT JOIN empleados e ON u.emp_usu = e.id_emp
            WHERE DATE(v.fecha) BETWEEN ? AND ? ${sucursalFiltroVentas}
              AND (dv.cantidad_vendida - IFNULL(dv.cantidad_devuelta, 0)) > 0
            ORDER BY v.fecha DESC
        `;

        const historialEntradasSql = `
            SELECT 
                e.fecha, 
                p.nombre_base AS producto, 
                de.cantidad_recibida AS cantidad,
                IFNULL(prov.nombre, 'SIN PROVEEDOR') AS proveedor
            FROM entradas_inventario e
            JOIN detalles_entrada de ON e.id_entrada = de.id_entrada
            JOIN productos p ON de.id_producto = p.id_prod
            LEFT JOIN proveedores prov ON e.id_prov = prov.id_prov
            WHERE DATE(e.fecha) BETWEEN ? AND ? ${sucursalFiltroEntradas}
            ORDER BY e.fecha DESC
        `;

        const historialIngresosSql = `
            SELECT 
                pv.id_pago, 
                COALESCE(pv.fecha, v.fecha) AS fecha, 
                v.id_venta, 
                mp.descripcion AS metodo, 
                pv.monto_usd, 
                pv.es_vuelto
            FROM pagos_venta pv
            JOIN ventas v ON pv.id_venta = v.id_venta
            JOIN metodos_pago mp ON pv.id_metodo_pago = mp.id_metodo
            WHERE v.id_cliente != 1 
              AND DATE(COALESCE(pv.fecha, v.fecha)) BETWEEN ? AND ? ${sucursalFiltroVentas}
            ORDER BY COALESCE(pv.fecha, v.fecha) DESC
        `;

        const listaPreciosSql = `
            SELECT 
                p.nombre_base AS producto, 
                c.descrip_categ AS categoria, 
                pp.precio_venta_usd
            FROM presentaciones_producto pp
            JOIN productos p ON pp.id_producto = p.id_prod
            LEFT JOIN categorias_producto c ON p.categ_prod = c.id_categ
            JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion
            WHERE inv.stock > 0 ${sucursalFiltroInventario}
            GROUP BY pp.id_presentacion, p.nombre_base, c.descrip_categ, pp.precio_venta_usd
            ORDER BY c.descrip_categ, p.nombre_base ASC
        `;

        const comprasPorProveedorSql = `
            SELECT 
                IFNULL(prov.nombre, 'SIN PROVEEDOR') AS proveedor,
                COUNT(DISTINCT e.id_entrada) AS total_compras,
                SUM(de.cantidad_recibida) AS total_articulos_comprados,
                SUM(de.subtotal_usd) AS inversion_total_usd
            FROM entradas_inventario e
            JOIN detalles_entrada de ON e.id_entrada = de.id_entrada
            LEFT JOIN proveedores prov ON e.id_prov = prov.id_prov
            WHERE DATE(e.fecha) BETWEEN ? AND ? ${sucursalFiltroEntradas}
            GROUP BY prov.id_prov, prov.nombre
            ORDER BY inversion_total_usd DESC
        `;

        const stockTotalizacionSql = `
            SELECT 
                p.nombre_base AS producto,
                pp.talla,
                pp.color,
                pp.codigo_barras,
                c.descrip_categ AS categoria,
                pp.costo_usd AS costo_unitario,
                SUM(inv.stock) AS stock_actual,
                SUM(inv.stock * pp.costo_usd) AS inversion_total,
                IFNULL((
                    SELECT prov.nombre 
                    FROM detalles_entrada de 
                    JOIN entradas_inventario e ON de.id_entrada = e.id_entrada
                    JOIN proveedores prov ON e.id_prov = prov.id_prov
                    WHERE de.id_presentacion = pp.id_presentacion
                    ORDER BY e.fecha DESC 
                    LIMIT 1
                ), 'SIN PROVEEDOR') AS proveedor_principal
            FROM inventario_sucursales inv
            JOIN presentaciones_producto pp ON inv.id_presentacion = pp.id_presentacion
            JOIN productos p ON pp.id_producto = p.id_prod
            LEFT JOIN categorias_producto c ON p.categ_prod = c.id_categ
            WHERE 1=1 ${sucursalFiltroInventario}
            GROUP BY pp.id_presentacion, p.nombre_base, pp.talla, pp.color, pp.codigo_barras, c.descrip_categ, pp.costo_usd
            ORDER BY stock_actual DESC
        `;

        let pResGlobal = [fecha_inicio, fecha_fin];
        if (sucursalActiva !== '0') pResGlobal.push(sucursalActiva);
        pResGlobal.push(fecha_inicio, fecha_fin);
        if (sucursalActiva !== '0') pResGlobal.push(sucursalActiva);

        const [
            resumenRows, porCobrarRows, ventasRows, topRows, reordenRows,
            metodosRows, movRows, entRows, ingRows, preciosRows, provRows, stockRows
        ] = await Promise.all([
            queryPromise(resumenGlobalSql, pResGlobal),
            queryPromise(cuentasPorCobrarSql, paramsVentas),
            queryPromise(ventasDiariasSql, paramsVentas),
            queryPromise(topProductosSql, paramsVentas),
            queryPromise(reordenSql, paramsInventario),
            queryPromise(metodosSql, paramsVentas),
            queryPromise(historialMovimientosSql, paramsVentas),
            queryPromise(historialEntradasSql, paramsEntradas),
            queryPromise(historialIngresosSql, paramsVentas),
            queryPromise(listaPreciosSql, paramsInventario),
            queryPromise(comprasPorProveedorSql, paramsEntradas),
            queryPromise(stockTotalizacionSql, paramsInventario)
        ]);

        const rG = resumenRows[0] || { ventasTotales: 0, costoTotal: 0 };
        const pC = porCobrarRows[0] || { porCobrar: 0 };
        const utilidad = (rG.ventasTotales || 0) - (rG.costoTotal || 0);

        res.status(200).json({
            resumenGlobal: {
                ventasTotales: rG.ventasTotales || 0,
                costoTotal: rG.costoTotal || 0,
                utilidad: utilidad,
                porCobrar: pC.porCobrar || 0
            },
            datosVentas: ventasRows,
            datosTopProductos: topRows,
            datosReorden: reordenRows,
            datosMetodos: metodosRows,
            historialMovimientos: movRows,
            historialEntradas: entRows,
            historialIngresos: ingRows,
            listaPrecios: preciosRows,
            datosProveedores: provRows,
            datosStock: stockRows
        });
    } catch (error) {
        console.error("Error al generar reportes:", error);
        res.status(500).json({ message: 'Error interno al generar el resumen de reportes.' });
    }
};