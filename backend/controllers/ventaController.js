import db from '../config/db.js';

const executeQuery = (connection, sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

export const registrarVenta = async (req, res) => {
    const { id_cliente, total_pagado_usd, descuento_usd = 0, items, pagos, motivo_ajuste, aplica_mora } = req.body;
    const id_usuario = req.user?.id_usu || 2;
    const id_sucursal = req.user?.id_sucursal || 1;

    if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'La venta debe contener al menos un producto.' });
    }
    if (total_pagado_usd < 0 || descuento_usd < 0) {
        return res.status(400).json({ success: false, message: 'Los montos no pueden ser negativos.' });
    }

    db.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ success: false, message: 'Error de conexión a la base de datos.' });
        try {
            await new Promise((resolve, reject) => connection.beginTransaction(err => err ? reject(err) : resolve()));

            let totalRealVenta = 0;
            for (const item of items) {
                if (item.cantidad <= 0) throw new Error(`Cantidad inválida para el producto.`);
                const sqlCheckInfo = `
                    SELECT pp.precio_venta_usd, IFNULL(inv.stock, 0) as stock_actual
                    FROM presentaciones_producto pp
                    LEFT JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
                    WHERE pp.id_presentacion = ?
                `;
                const dbInfo = await executeQuery(connection, sqlCheckInfo, [id_sucursal, item.id_presentacion]);
                if (dbInfo.length === 0) throw new Error(`El producto con ID ${item.id_presentacion} no existe.`);
                const stockDisponible = dbInfo[0].stock_actual;
                const precioReal = dbInfo[0].precio_venta_usd;
                if (item.cantidad > stockDisponible) {
                    throw new Error(`Stock insuficiente. Intentaste vender ${item.cantidad}, pero solo quedan ${stockDisponible} disponibles.`);
                }
                totalRealVenta += (item.cantidad * precioReal);
            }

            const aplicaMoraValue = (aplica_mora === false) ? 0 : 1;
            const resultVenta = await executeQuery(
                connection,
                `INSERT INTO ventas (id_cliente, fecha, total_pagado, descuento_usd, motivo_ajuste, id_usuario, id_sucursal, recargo_mora, aplica_mora) 
                 VALUES (?, NOW(), ?, ?, ?, ?, ?, 0.00, ?)`,
                [id_cliente, total_pagado_usd, descuento_usd, motivo_ajuste, id_usuario, id_sucursal, aplicaMoraValue]
            );
            const id_venta = resultVenta.insertId;

            for (const item of items) {
                const dbInfo = await executeQuery(connection, `SELECT precio_venta_usd FROM presentaciones_producto WHERE id_presentacion = ?`, [item.id_presentacion]);
                const precioReal = dbInfo[0].precio_venta_usd;
                const subtotal = item.cantidad * precioReal;

                await executeQuery(
                    connection,
                    `INSERT INTO detalles_venta (id_venta, id_presentacion, cantidad_vendida, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)`,
                    [id_venta, item.id_presentacion, item.cantidad, precioReal, subtotal]
                );
                await executeQuery(
                    connection,
                    `UPDATE inventario_sucursales SET stock = stock - ? WHERE id_presentacion = ? AND id_sucursal = ?`,
                    [item.cantidad, item.id_presentacion, id_sucursal]
                );
            }

            if (pagos && pagos.length > 0) {
                for (const pago of pagos) {
                    if (pago.monto_usd <= 0) throw new Error("El monto de pago no puede ser 0 o negativo.");
                    
                    await executeQuery(
                        connection,
                        `INSERT INTO pagos_venta (id_venta, id_metodo_pago, monto_usd, es_vuelto) VALUES (?, ?, ?, ?)`,
                        [id_venta, pago.id_metodo, pago.monto_usd, pago.es_vuelto ? 1 : 0]
                    );

                    if (pago.id_metodo === 120009 && !pago.es_vuelto) {
                        let monto_a_debitar = Number(pago.monto_usd);
                        
                        const notas = await executeQuery(
                            connection,
                            `SELECT id_nota, saldo_restante_usd 
                             FROM notas_credito 
                             WHERE id_cliente = ? AND estado = 'DISPONIBLE' 
                             ORDER BY fecha_emision ASC`,
                            [id_cliente]
                        );

                        let saldo_disponible_total = notas.reduce((sum, n) => sum + Number(n.saldo_restante_usd), 0);
                        if (saldo_disponible_total < monto_a_debitar) {
                            throw new Error(`Fondos insuficientes en Notas de Crédito. Dispone de $${saldo_disponible_total.toFixed(2)}.`);
                        }

                        for (let nota of notas) {
                            if (monto_a_debitar <= 0) break;
                            let saldo_nota = Number(nota.saldo_restante_usd);

                            if (saldo_nota <= monto_a_debitar) {
                                monto_a_debitar -= saldo_nota;
                                await executeQuery(
                                    connection,
                                    `UPDATE notas_credito SET saldo_restante_usd = 0, estado = 'USADA' WHERE id_nota = ?`,
                                    [nota.id_nota]
                                );
                            } else {
                                let nuevo_saldo = saldo_nota - monto_a_debitar;
                                monto_a_debitar = 0;
                                await executeQuery(
                                    connection,
                                    `UPDATE notas_credito SET saldo_restante_usd = ? WHERE id_nota = ?`,
                                    [nuevo_saldo, nota.id_nota]
                                );
                            }
                        }
                    }
                }
            }

            await new Promise((resolve, reject) => connection.commit(err => err ? reject(err) : resolve()));
            res.status(201).json({ success: true, id_venta, message: 'Venta procesada exitosamente.' });
            connection.release();
        } catch (error) {
            connection.rollback(() => connection.release());
            res.status(400).json({ success: false, message: error.message || 'Ocurrió un error al procesar la venta.' });
        }
    });
};

export const obtenerVentas = async (req, res) => {
    const id_sucursal_token = req.user?.id_sucursal ? Number(req.user.id_sucursal) : 1;
    const rol_usuario = req.user?.rol_usu ? Number(req.user.rol_usu) : 2;
    const req_sucursal = req.query.id_sucursal ? Number(req.query.id_sucursal) : null;
    const { fecha_inicio, fecha_fin } = req.query; 

    let sql = `
        SELECT v.id_venta, v.fecha, v.total_pagado, v.descuento_usd, v.motivo_ajuste,
               c.ra_soc_cli as cliente, c.ced_rif_cli,
               CONCAT(e.nom_emp, ' ', e.ape_emp) AS operador,
               s.nombre as sucursal,
               (SELECT MAX(fecha) FROM pagos_venta pv WHERE pv.id_venta = v.id_venta) as fecha_ultimo_pago
        FROM ventas v 
        LEFT JOIN clientes c ON v.id_cliente = c.id_cli 
        LEFT JOIN usuarios u ON v.id_usuario = u.id_usu
        LEFT JOIN empleados e ON u.emp_usu = e.id_emp
        LEFT JOIN sucursales s ON v.id_sucursal = s.id_sucursal
        WHERE v.id_cliente != 1
    `;
    const params = [];

    if (rol_usuario === 1 && req_sucursal) {
        sql += ` AND v.id_sucursal = ?`;
        params.push(req_sucursal);
    } else {
        sql += ` AND v.id_sucursal = ?`;
        params.push(id_sucursal_token);
    }

    if (fecha_inicio && fecha_fin) {
        sql += ` AND (DATE(v.fecha) BETWEEN ? AND ? OR DATE((SELECT MAX(fecha) FROM pagos_venta pv WHERE pv.id_venta = v.id_venta)) BETWEEN ? AND ?)`;
        params.push(fecha_inicio, fecha_fin, fecha_inicio, fecha_fin);
    }

    sql += ` ORDER BY v.fecha DESC LIMIT 150`;

    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al consultar ventas.' });
        res.status(200).json(results);
    });
};

export const obtenerDetalleVenta = async (req, res) => {
    const { id } = req.params;
    try {
        const ventaSql = `
            SELECT v.id_venta, v.id_cliente, v.fecha, v.total_pagado, v.descuento_usd, v.recargo_mora,
            c.ra_soc_cli as cliente, c.ced_rif_cli,
            CONCAT(e.nom_emp, ' ', e.ape_emp) AS operador,
            s.nombre as sucursal
    FROM ventas v
            LEFT JOIN clientes c ON v.id_cliente = c.id_cli 
            LEFT JOIN usuarios u ON v.id_usuario = u.id_usu
            LEFT JOIN empleados e ON u.emp_usu = e.id_emp
            LEFT JOIN sucursales s ON v.id_sucursal = s.id_sucursal
            WHERE v.id_venta = ?`;

       const detallesSql = `
    SELECT dv.id_presentacion, dv.cantidad_vendida as cantidad, dv.precio_unitario, dv.subtotal,
            dv.cantidad_devuelta, p.nombre_base 
    FROM detalles_venta dv
    JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
    JOIN productos p ON pp.id_producto = p.id_prod
    WHERE dv.id_venta = ?`;

        const pagosSql = `
            SELECT pv.monto_usd, pv.es_vuelto, mp.descripcion as metodo, pv.fecha
            FROM pagos_venta pv
            JOIN metodos_pago mp ON pv.id_metodo_pago = mp.id_metodo
            WHERE pv.id_venta = ?
            ORDER BY pv.fecha ASC`;

        db.query(ventaSql, [id], (err, ventaRes) => {
            if (err || ventaRes.length === 0) return res.status(404).json({ message: 'Venta no encontrada' });
            db.query(detallesSql, [id], (err, detallesRes) => {
                if (err) return res.status(500).json({ message: 'Error al obtener detalles' });
                db.query(pagosSql, [id], (err, pagosRes) => {
                    if (err) return res.status(500).json({ message: 'Error al obtener pagos' });
                    res.status(200).json({
                        ...ventaRes[0],
                        items: detallesRes,
                        pagos: pagosRes
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ message: 'Error interno' });
    }
};

export const obtenerMetodosPago = async (req, res) => {
    try {
        db.query('SELECT * FROM metodos_pago', (err, results) => {
            if (err) {
                console.error('Error al consultar métodos de pago:', err);
                return res.status(500).json({ message: 'Error al obtener los métodos de pago.' });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error('Error interno:', error);
        res.status(500).json({ message: 'Error interno al procesar los métodos de pago.' });
    }
};

export const procesarDevolucion = async (req, res) => {
    const { id_venta, id_cliente, items_devueltos } = req.body;
    const id_sucursal = req.user?.id_sucursal || 1;
    const id_usuario = req.user?.id_usu || 2;

    if (!id_venta || !id_cliente) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
    }
    if (!items_devueltos || items_devueltos.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay artículos seleccionados para devolver.' });
    }

    db.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ success: false, message: 'Error de conexión a la base de datos.' });
        try {
            await new Promise((resolve, reject) => connection.beginTransaction(err => err ? reject(err) : resolve()));
            
            let total_valor_devuelto = 0;
            
            for (const item of items_devueltos) {
                if (item.cantidad <= 0) throw new Error("La cantidad a devolver debe ser mayor a cero.");
                
                const sqlCheckDetalle = `
                    SELECT id_detalle, cantidad_vendida, precio_unitario, IFNULL(cantidad_devuelta, 0) as cantidad_devuelta 
                     FROM detalles_venta 
                     WHERE id_venta = ? AND id_presentacion = ?
                `;
                const detalleOriginal = await executeQuery(connection, sqlCheckDetalle, [id_venta, item.id_presentacion]);
                
                if (detalleOriginal.length === 0) {
                    throw new Error(`El artículo seleccionado no pertenece a la venta original.`);
                }

                const { id_detalle, cantidad_vendida, precio_unitario, cantidad_devuelta } = detalleOriginal[0];
                const disponibleParaDevolver = cantidad_vendida - cantidad_devuelta;

                if (item.cantidad > disponibleParaDevolver) {
                    throw new Error(`No puedes devolver ${item.cantidad} unidad(es). Máximo disponible: ${disponibleParaDevolver}.`);
                }

                const valor_devuelto = item.cantidad * precio_unitario;
                total_valor_devuelto += valor_devuelto;

                await executeQuery(
                    connection,
                    `UPDATE inventario_sucursales 
                      SET stock = stock + ? 
                      WHERE id_presentacion = ? AND id_sucursal = ?`,
                    [item.cantidad, item.id_presentacion, id_sucursal]
                );

                await executeQuery(
                    connection,
                    `UPDATE detalles_venta 
                      SET cantidad_devuelta = cantidad_devuelta + ? 
                      WHERE id_detalle = ?`,
                    [item.cantidad, id_detalle]
                );
            }

          const sqlVenta = `
                SELECT descuento_usd, recargo_mora, total_pagado,
                       (SELECT SUM(subtotal - (IFNULL(cantidad_devuelta, 0) * precio_unitario)) 
                        FROM detalles_venta WHERE id_venta = ?) AS nuevo_subtotal
                FROM ventas WHERE id_venta = ?
            `;
            const resVenta = await executeQuery(connection, sqlVenta, [id_venta, id_venta]);
            const { descuento_usd, recargo_mora, total_pagado, nuevo_subtotal } = resVenta[0];

            const nuevo_total_factura = (Number(nuevo_subtotal) - Number(descuento_usd) + Number(recargo_mora));

            let saldo_a_favor = Number(total_pagado) - nuevo_total_factura;

            const sqlNotasPrevias = `SELECT SUM(monto_usd) as emitido FROM notas_credito WHERE id_venta_origen = ?`;
            const resNotasPrevias = await executeQuery(connection, sqlNotasPrevias, [id_venta]);
            const notas_emitidas = Number(resNotasPrevias[0].emitido) || 0;

            let monto_nota_credito = saldo_a_favor > 0 ? saldo_a_favor - notas_emitidas : 0;

            let id_nota_generada = null;
            if (monto_nota_credito > 0.01) {
                const resultNota = await executeQuery(
                    connection,
                    `INSERT INTO notas_credito (id_cliente, id_venta_origen, monto_usd, saldo_restante_usd, estado)
                       VALUES (?, ?, ?, ?, 'DISPONIBLE')`,
                    [id_cliente, id_venta, monto_nota_credito, monto_nota_credito]
                );
                id_nota_generada = resultNota.insertId;
            }

            let descBitacora = `Reingreso por devolución (Venta #${id_venta}). Valor prendas: $${total_valor_devuelto.toFixed(2)}.`;
            if (nuevo_total_factura > 0 || total_pagado < (nuevo_total_factura + total_valor_devuelto)) {
                descBitacora += ` La deuda de la factura se redujo automáticamente.`;
            }
            if (monto_nota_credito > 0.01) descBitacora += ` Se generó nota de crédito #${id_nota_generada} por $${monto_nota_credito.toFixed(2)}.`;

            await executeQuery(
                connection,
                `INSERT INTO bitacora_auditoria (id_usuario, accion, modulo, descripcion)
                  VALUES (?, 'DEVOLUCION', 'INVENTARIO', ?)`,
                [id_usuario, descBitacora]
            );

            await new Promise((resolve, reject) => connection.commit(err => err ? reject(err) : resolve()));

            res.status(201).json({ 
                 success: true, 
                 message: descBitacora, 
                 id_nota: id_nota_generada 
            });
            connection.release();
        } catch (error) {
            connection.rollback(() => connection.release());
            res.status(400).json({ success: false, message: error.message || 'Ocurri  un error al procesar la devoluci n.' });
        }
    });
};