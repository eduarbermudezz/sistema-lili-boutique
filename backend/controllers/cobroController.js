import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

export const obtenerCuentasPorCobrar = async (req, res) => {
    try {
        const sucursal = req.query.sucursal;
        const configMora = await queryPromise("SELECT monto_mora FROM configuracion WHERE id_config = 1", []);
        const montoMora = configMora[0]?.monto_mora || 3.00;

        const sqlMora = `
            UPDATE ventas v
            INNER JOIN (
                SELECT id_venta, (IFNULL(SUM(subtotal), 0) - IFNULL(SUM(IFNULL(cantidad_devuelta, 0) * IFNULL(precio_unitario, 0)), 0)) as total_vendido
                FROM detalles_venta
                GROUP BY id_venta
            ) d ON v.id_venta = d.id_venta
            SET v.recargo_mora = ${montoMora}
            WHERE DATEDIFF(NOW(), v.fecha) > 15
               AND (IFNULL(v.recargo_mora, 0) = 0 OR v.recargo_mora != ${montoMora})
               AND v.id_cliente != 1
               AND v.aplica_mora = 1
               AND IFNULL(v.total_pagado, 0) < (d.total_vendido - IFNULL(v.descuento_usd, 0) - 0.01)
        `;
        await queryPromise(sqlMora, []);

        let whereVentas = "v.id_cliente != 1";
        let params = [];

        if (sucursal && sucursal !== 'todas') {
            whereVentas += " AND v.id_sucursal = ?";
            params.push(sucursal);
        }

       const sql = `
            SELECT 
                c.id_cli,
                c.ra_soc_cli,
                c.ced_rif_cli,
                COUNT(v.id_venta) as facturas_pendientes,
                SUM(v.deuda_factura) as saldo_pendiente
            FROM clientes c
            INNER JOIN (
                SELECT 
                v.id_venta, 
                v.id_cliente,
                ((IFNULL(SUM(dv.subtotal), 0) - IFNULL(SUM(IFNULL(dv.cantidad_devuelta, 0) * IFNULL(dv.precio_unitario, 0)), 0)) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0)) as monto_total,
                ((IFNULL(SUM(dv.subtotal), 0) - IFNULL(SUM(IFNULL(dv.cantidad_devuelta, 0) * IFNULL(dv.precio_unitario, 0)), 0)) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0) - IFNULL(v.total_pagado, 0)) as deuda_factura
                FROM ventas v
                LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
                WHERE ${whereVentas}
                GROUP BY v.id_venta, v.id_cliente, v.descuento_usd, v.recargo_mora, v.total_pagado
                HAVING deuda_factura > 0.01
            ) v ON c.id_cli = v.id_cliente
            GROUP BY c.id_cli, c.ra_soc_cli, c.ced_rif_cli
            ORDER BY c.id_cli DESC
        `;

        const results = await queryPromise(sql, params);
        res.status(200).json(results);
    } catch (err) {
        console.error('Error en cobros:', err);
        res.status(500).json({ message: 'Error al calcular deudas y moras.' });
    }
};

export const obtenerFacturasDeudor = async (req, res) => {
    const { id_cliente } = req.params;
    const sucursal = req.query.sucursal;
    let whereClause = "v.id_cliente = ? AND v.id_cliente != 1";
    let params = [id_cliente];

    if (sucursal && sucursal !== 'todas') {
        whereClause += " AND v.id_sucursal = ?";
        params.push(sucursal);
    }

    const sqlFacturas = `
        SELECT 
            v.id_venta,
            v.fecha,
            v.aplica_mora,
            DATEDIFF(NOW(), v.fecha) as dias_transcurridos,
            IFNULL(v.recargo_mora, 0) as recargo_mora,
            IFNULL(v.descuento_usd, 0) as descuento_usd,
            ((IFNULL(SUM(dv.subtotal), 0) - IFNULL(SUM(IFNULL(dv.cantidad_devuelta, 0) * IFNULL(dv.precio_unitario, 0)), 0)) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0)) as monto_total,
            IFNULL(v.total_pagado, 0) as monto_pagado,
            ((IFNULL(SUM(dv.subtotal), 0) - IFNULL(SUM(IFNULL(dv.cantidad_devuelta, 0) * IFNULL(dv.precio_unitario, 0)), 0)) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0) - IFNULL(v.total_pagado, 0)) as deuda_factura
        FROM ventas v
        LEFT JOIN detalles_venta dv ON v.id_venta = dv.id_venta
        WHERE ${whereClause}
        GROUP BY v.id_venta, v.fecha, v.descuento_usd, v.total_pagado, v.recargo_mora
        HAVING deuda_factura > 0.01
        ORDER BY v.fecha DESC
    `;

    try {
        const facturas = await queryPromise(sqlFacturas, params);
        for (let i = 0; i < facturas.length; i++) {
            const idVenta = facturas[i].id_venta;

            const sqlDetalles = `
                SELECT 
                    dv.cantidad_vendida, 
                    dv.precio_unitario, 
                    dv.subtotal,
                    p.nombre_base
                FROM detalles_venta dv
                JOIN presentaciones_producto pp ON dv.id_presentacion = pp.id_presentacion
                JOIN productos p ON pp.id_producto = p.id_prod
                WHERE dv.id_venta = ?
            `;
            facturas[i].detalles = await queryPromise(sqlDetalles, [idVenta]);

            const sqlPagos = `
                SELECT pv.monto_usd, mp.descripcion 
                FROM pagos_venta pv
                JOIN metodos_pago mp ON pv.id_metodo_pago = mp.id_metodo
                WHERE pv.id_venta = ?
            `;
            facturas[i].pagos = await queryPromise(sqlPagos, [idVenta]);
        }
        res.status(200).json(facturas);
    } catch (err) {
        console.error('Error al consultar facturas:', err);
        res.status(500).json({ message: 'Error al consultar facturas detalladas.' });
    }
};

export const registrarAbono = async (req, res) => {
    const { id_venta, pagos } = req.body;
    const pagosArray = pagos || [{
        id_metodo: req.body.id_metodo_pago,
        monto_usd: req.body.monto_usd,
        es_vuelto: req.body.es_vuelto || false
    }];

    db.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ message: 'Error de conexión.' });
        try {
            await new Promise((res, rej) => connection.beginTransaction(e => e ? rej(e) : res()));

           const sqlDeuda = `
                SELECT v.id_cliente, (IFNULL((SELECT IFNULL(SUM(subtotal), 0) - IFNULL(SUM(IFNULL(cantidad_devuelta, 0) * IFNULL(precio_unitario, 0)), 0) FROM detalles_venta WHERE id_venta = v.id_venta), 0) - IFNULL(v.descuento_usd, 0) + IFNULL(v.recargo_mora, 0) - IFNULL(v.total_pagado, 0)) as deuda_restante  
                FROM ventas v WHERE id_venta = ?
            `;
            const resultDeuda = await new Promise((res, rej) => connection.query(sqlDeuda, [id_venta], (e, r) => e ? rej(e) : res(r)));

            if (resultDeuda.length === 0) throw new Error('Venta no encontrada.');

            const deudaRestante = Number(resultDeuda[0].deuda_restante);
            const id_cliente = resultDeuda[0].id_cliente;

            let totalAbonoNeto = 0;
            for (let p of pagosArray) {
                totalAbonoNeto += Number(p.monto_usd);
            }

            if (totalAbonoNeto > (deudaRestante + 0.05)) {
                throw new Error(`El abono neto ($${totalAbonoNeto.toFixed(2)}) supera la deuda restante de la factura ($${deudaRestante.toFixed(2)}). Registre correctamente el vuelto.`);
            }

            for (let p of pagosArray) {
                const montoVal = Number(p.monto_usd);
                const idMetodoReal = p.id_metodo || p.id_metodo_pago;

                if (montoVal !== 0) {
                    const sqlPago = `INSERT INTO pagos_venta (id_venta, id_metodo_pago, monto_usd, es_vuelto) VALUES (?, ?, ?, ?)`;
                    await new Promise((res, rej) => connection.query(sqlPago, [id_venta, idMetodoReal, montoVal, p.es_vuelto ? 1 : 0], (e) => e ? rej(e) : res()));

                    if (idMetodoReal === 120009 && montoVal > 0 && !p.es_vuelto) {
                        let monto_a_debitar = montoVal;

                        const sqlNotas = `SELECT id_nota, saldo_restante_usd FROM notas_credito WHERE id_cliente = ? AND estado = 'DISPONIBLE' ORDER BY fecha_emision ASC`;
                        const notas = await new Promise((res, rej) => connection.query(sqlNotas, [id_cliente], (e, r) => e ? rej(e) : res(r)));

                        let saldo_total = notas.reduce((sum, n) => sum + Number(n.saldo_restante_usd), 0);
                        if (saldo_total < monto_a_debitar) throw new Error(`Saldo a favor insuficiente. Dispone de $${saldo_total.toFixed(2)}.`);

                        for (let nota of notas) {
                            if (monto_a_debitar <= 0) break;
                            let saldo_nota = Number(nota.saldo_restante_usd);

                            if (saldo_nota <= monto_a_debitar) {
                                monto_a_debitar -= saldo_nota;
                                await new Promise((res, rej) => connection.query(`UPDATE notas_credito SET saldo_restante_usd = 0, estado = 'USADA' WHERE id_nota = ?`, [nota.id_nota], (e) => e ? rej(e) : res()));
                            } else {
                                let nuevo_saldo = saldo_nota - monto_a_debitar;
                                monto_a_debitar = 0;
                                await new Promise((res, rej) => connection.query(`UPDATE notas_credito SET saldo_restante_usd = ? WHERE id_nota = ?`, [nuevo_saldo, nota.id_nota], (e) => e ? rej(e) : res()));
                            }
                        }
                    }
                }
            }

            const sqlUpdateVenta = `UPDATE ventas SET total_pagado = total_pagado + ? WHERE id_venta = ?`;
            await new Promise((res, rej) => connection.query(sqlUpdateVenta, [totalAbonoNeto, id_venta], (e) => e ? rej(e) : res()));

            await new Promise((res, rej) => connection.commit(e => e ? rej(e) : res()));
            res.status(201).json({ message: 'Abono registrado con éxito.' });
        } catch (error) {
            connection.rollback();
            res.status(400).json({ message: error.message || 'Error al procesar el abono.' });
        } finally {
            connection.release();
        }
    });
};

export const alternarMora = async (req, res) => {
    const { id_venta } = req.params;
    const { aplicar } = req.body;

    db.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ message: 'Error de conexión.' });
        try {
            const configMora = await new Promise((resolve, reject) => connection.query("SELECT monto_mora FROM configuracion WHERE id_config = 1", (e, r) => e ? reject(e) : resolve(r)));
            const montoMora = configMora[0]?.monto_mora || 3.00;
            const recargo = aplicar ? `IF(DATEDIFF(NOW(), fecha) > 15, ${montoMora}, 0.00)` : '0.00';
            const aplicaVal = aplicar ? 1 : 0;

            const sqlUpdate = `UPDATE ventas SET aplica_mora = ${aplicaVal}, recargo_mora = ${recargo} WHERE id_venta = ?`;

            await new Promise((resolve, reject) => connection.query(sqlUpdate, [id_venta], (e) => e ? reject(e) : resolve()));
            res.status(200).json({ message: 'Estado de mora actualizado.' });
        } catch (error) {
            res.status(500).json({ message: 'Error al actualizar la mora.' });
        } finally {
            connection.release();
        }
    });
};