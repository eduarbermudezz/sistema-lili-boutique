import db from '../config/db.js';

const executeQuery = (connection, sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

export const registrarEntrada = async (req, res) => {
    const { id_prov, total_costo_usd, items } = req.body;

    const id_usuario = req.user?.id_usu || req.user?.id;
    const id_sucursal = req.user?.id_sucursal || 1; 

    if (!id_usuario) return res.status(401).json({ message: 'Error: No se pudo identificar al usuario. Inicie sesión nuevamente.' });

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'La entrada debe contener al menos un producto.' });
    }
    if (Number(total_costo_usd) < 0) {
        return res.status(400).json({ message: 'El costo total de la entrada no puede ser negativo.' });
    }
    for (const item of items) {
        if (Number(item.cantidad) <= 0) return res.status(400).json({ message: 'No puedes ingresar un producto con cantidad 0 o negativa.' });
        if (Number(item.costo_unitario_usd) < 0) return res.status(400).json({ message: 'El costo unitario de un producto no puede ser negativo.' });
    }

   
    db.getConnection(async (err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return res.status(500).json({ message: 'Error de conexión al servidor.' });
        }

        try {
            await new Promise((resolve, reject) => { connection.beginTransaction(err => err ? reject(err) : resolve()); });

           const sqlEntrada = `INSERT INTO entradas_inventario (id_usuario, id_sucursal, id_prov, total_costo_usd, fecha) VALUES (?, ?, ?, ?, NOW())`;
            const resultEntrada = await executeQuery(connection, sqlEntrada, [
                id_usuario,
                id_sucursal,
                id_prov || null,
                Number(total_costo_usd) || 0
            ]);
            
            const idEntrada = resultEntrada.insertId;

            const sqlDetalles = `INSERT INTO detalles_entrada (id_entrada, id_presentacion, id_producto, cantidad_recibida, costo_unitario_usd, subtotal_usd) VALUES ?`;
            const valoresDetalles = items.map(item => [
                idEntrada,
                item.id_presentacion,
                item.id_prod || null, 
                Number(item.cantidad),
                Number(item.costo_unitario_usd) || 0,
                (Number(item.cantidad) * (Number(item.costo_unitario_usd) || 0))
            ]);

            await executeQuery(connection, sqlDetalles, [valoresDetalles]);

            const promesasInventario = items.map(async (item) => {
                const cantidadIngresada = Number(item.cantidad);
                const nuevoCostoUsd = Number(item.costo_unitario_usd) || 0;
                const idPresentacion = item.id_presentacion;

                const sqlUpdateStock = `
                    INSERT INTO inventario_sucursales (id_presentacion, id_sucursal, stock) 
                    VALUES (?, ?, ?) 
                    ON DUPLICATE KEY UPDATE stock = stock + VALUES(stock)
                `;
                await executeQuery(connection, sqlUpdateStock, [idPresentacion, id_sucursal, cantidadIngresada]);

                const sqlUpdateCosto = `
                    UPDATE presentaciones_producto 
                    SET costo_usd = ?
                    WHERE id_presentacion = ?
                `;
                await executeQuery(connection, sqlUpdateCosto, [nuevoCostoUsd, idPresentacion]);

                const sqlUpdatePrecios = `
                    UPDATE presentaciones_producto pp
                    JOIN productos p ON pp.id_producto = p.id_prod
                    SET pp.precio_venta_usd = IF(
                        p.margen_ganancia < 100, 
                        ? / (1 - (p.margen_ganancia / 100)), 
                        ? + (? * (p.margen_ganancia / 100))
                    )
                    WHERE pp.id_presentacion = ?
                `;
                await executeQuery(connection, sqlUpdatePrecios, [nuevoCostoUsd, nuevoCostoUsd, nuevoCostoUsd, idPresentacion]);
            });

            await Promise.all(promesasInventario);

            await new Promise((resolve, reject) => {
                connection.commit(err => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            res.status(201).json({ message: 'Entrada de inventario procesada con éxito.', id_entrada: idEntrada });

        } catch (error) {
            await new Promise((resolve) => connection.rollback(() => resolve()));
            console.error("Error en la transacción de entrada:", error);
            res.status(500).json({ message: 'Error al registrar la entrada. Intente de nuevo.' });

        } finally {
            connection.release();
        }
    });
};