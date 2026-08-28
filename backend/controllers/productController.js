import db from '../config/db.js';

const queryPromise = (sql, params) => new Promise((resolve, reject) => db.query(sql, params, (err, results) => err ? reject(err) : resolve(results)));

const generarCodigo13 = (id, index) => {
    const timePart = Date.now().toString().slice(-8); 
    const idPart = id.toString().padStart(3, '0').slice(-3);
    const idxPart = index.toString().padStart(1, '0').slice(-1);
    return `2${timePart}${idPart}${idxPart}`; 
};

const validarIntegridadProducto = (nombre, margen, presentaciones) => {
    if (!nombre || nombre.trim().length < 3) return 'El nombre base del producto debe tener al menos 3 letras.';
    if (Number(margen) < 0) return 'El margen de ganancia no puede ser negativo.';
    if (presentaciones && presentaciones.length > 0) {
        for (let p of presentaciones) {
            if (Number(p.costo_usd) < 0 || Number(p.precio_venta_usd) < 0) return 'Los costos y precios no pueden ser negativos.';
            if (Number(p.stock) < 0) return 'El stock inicial no puede ser negativo.';
        }
    }
    return null;
};

export const obtenerProductos = async (req, res) => {
    const id_sucursal = req.user?.id_sucursal || 1;
    try {
       const sql = `
            SELECT p.*, 
                   c.descrip_categ as categoria, 
                   GROUP_CONCAT(pr.codigo_barras SEPARATOR ', ') as codigos_sku,
                   GROUP_CONCAT(
                       CONCAT(
                           IFNULL(pr.id_presentacion, 0), '::', 
                           IFNULL(NULLIF(TRIM(pr.talla), ''), 'N/A'), '::', 
                           IFNULL(NULLIF(TRIM(pr.color), ''), 'N/A'), '::', 
                           IFNULL(pr.precio_venta_usd, 0), '::', 
                           IFNULL(inv.stock, 0)
                       ) SEPARATOR '||'
                   ) as lista_variantes,
                   SUM(IFNULL(inv.stock, 0)) as stock_total_sucursal
            FROM productos p
            LEFT JOIN categorias_producto c ON p.categ_prod = c.id_categ
            JOIN presentaciones_producto pr ON p.id_prod = pr.id_producto
            JOIN inventario_sucursales inv ON pr.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
            GROUP BY p.id_prod, c.descrip_categ
            ORDER BY p.id_prod DESC
        `;
        const results = await queryPromise(sql, [id_sucursal]);
        res.status(200).json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener productos.' });
    }
};

export const crearProducto = async (req, res) => {
    const { nombre_base, categ_prod, margen_ganancia, presentaciones, usa_margen_categoria } = req.body;
    const id_sucursal = req.user?.id_sucursal || 1;

    const errorVal = validarIntegridadProducto(nombre_base, margen_ganancia, presentaciones);
    if (errorVal) return res.status(400).json({ message: errorVal });

    if (presentaciones && presentaciones.length > 0) {
        const codigosInput = presentaciones
            .map(p => p.codigo_barras?.trim())
            .filter(c => c && c !== '');

        if (codigosInput.length > 0) {
            try {
                const sqlCheck = `SELECT codigo_barras FROM presentaciones_producto WHERE codigo_barras IN (?) LIMIT 1`;
                const resCheck = await queryPromise(sqlCheck, [codigosInput]);
                
                if (resCheck.length > 0) {
                    return res.status(400).json({ message: `El SKU/Código de barras '${resCheck[0].codigo_barras}' ya está siendo utilizado por otro producto en el inventario.` });
                }
            } catch (err) {
                console.error("Error validando SKUs en creación:", err);
                return res.status(500).json({ message: 'Error interno validando los códigos SKU.' });
            }
        }
    }

    db.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ message: 'Error de conexión.' });
        const queryTx = (sql, params) => new Promise((resolve, reject) => connection.query(sql, params, (e, r) => e ? reject(e) : resolve(r)));
        try {
            await new Promise((res, rej) => connection.beginTransaction(e => e ? rej(e) : res()));
            const sqlProd = `INSERT INTO productos (nombre_base, categ_prod, margen_ganancia, usa_margen_categoria) VALUES (?, ?, ?, ?)`;
           const resultProd = await queryTx(sqlProd, [nombre_base, categ_prod || null, margen_ganancia, usa_margen_categoria ? 1 : 0]);
            const idProdNuevo = resultProd.insertId;
            
            if (presentaciones && presentaciones.length > 0) {
                for (const [index, p] of presentaciones.entries()) {
                    const codigoBarrasFinal = (p.codigo_barras && p.codigo_barras.trim() !== '')
                        ? p.codigo_barras.trim()
                        : generarCodigo13(idProdNuevo, index);
                        
                    const sqlPres = `
                        INSERT INTO presentaciones_producto 
                          (id_producto, codigo_barras, talla, color, costo_usd, precio_venta_usd, cant_minima_mayor, punto_reorden) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    const resPres = await queryTx(sqlPres, [
                        idProdNuevo,
                        codigoBarrasFinal,
                        p.talla || null,
                        p.color || null,
                        p.costo_usd || 0,
                        p.precio_venta_usd || 0,
                        p.cant_minima_mayor || 0,
                        p.punto_reorden || 0
                    ]);
                    const sqlInv = `INSERT INTO inventario_sucursales (id_presentacion, id_sucursal, stock) VALUES (?, ?, ?)`;
                    await queryTx(sqlInv, [resPres.insertId, id_sucursal, p.stock || 0]);
                }
            }
            await new Promise((res, rej) => connection.commit(e => e ? rej(e) : res()));
            res.status(201).json({ message: "Producto y variantes creados" });
        } catch (error) {
            connection.rollback();
            console.error(error);
            res.status(500).json({ message: 'Error al registrar.' });
        } finally {
            connection.release();
        }
    });
};

export const actualizarProducto = async (req, res) => {
    const id = req.params.id;
    const { presentaciones, usa_margen_categoria } = req.body;

    const nombreFinal = req.body.nombre_base;
    const categoriaFinal = req.body.categ_prod || null;
    const margenSeguro = Number(req.body.margen_ganancia) || 0;
    const usaMargenCatInt = usa_margen_categoria ? 1 : 0;
    const id_sucursal = req.user?.id_sucursal || 1;
    
    const errorVal = validarIntegridadProducto(nombreFinal, margenSeguro, presentaciones);
    if (errorVal) return res.status(400).json({ message: errorVal });
    
    if (presentaciones && presentaciones.length > 0) {
        const codigosInput = presentaciones
            .map(p => p.codigo_barras?.trim())
            .filter(c => c && c !== '');

        if (codigosInput.length > 0) {
            try {
                const sqlCheck = `SELECT codigo_barras FROM presentaciones_producto WHERE codigo_barras IN (?) AND id_producto != ? LIMIT 1`;
                const resCheck = await queryPromise(sqlCheck, [codigosInput, id]);
                
                if (resCheck.length > 0) {
                    return res.status(400).json({ message: `El SKU/Código '${resCheck[0].codigo_barras}' no puede usarse porque ya pertenece a otro producto distinto.` });
                }
            } catch (err) {
                console.error("Error validando SKUs en actualización:", err);
                return res.status(500).json({ message: 'Error interno validando los códigos SKU.' });
            }
        }
    }

    db.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ message: "Error de conexión." });
        const queryTx = (sql, params) => new Promise((resolve, reject) => connection.query(sql, params, (e, r) => e ? reject(e) : resolve(r)));
        try {
            await new Promise((resolve, reject) => connection.beginTransaction(e => e ? reject(e) : resolve()));
            const sqlUpdateProd = `UPDATE productos SET nombre_base = ?, categ_prod = ?, margen_ganancia = ?, usa_margen_categoria = ? WHERE id_prod = ?`;
            await queryTx(sqlUpdateProd, [nombreFinal, categoriaFinal, margenSeguro, usaMargenCatInt, id]);
            
            if (presentaciones && presentaciones.length > 0) {
                const idsAConservar = presentaciones.filter(p => p.id_presentacion).map(p => p.id_presentacion);
                if (idsAConservar.length > 0) {
                    await queryTx(`DELETE FROM presentaciones_producto WHERE id_producto = ? AND id_presentacion NOT IN (?)`, [id, idsAConservar]);
                } else {
                    await queryTx(`DELETE FROM presentaciones_producto WHERE id_producto = ?`, [id]);
                }
                
                for (const [index, p] of presentaciones.entries()) {
                    const costoSeguro = Number(p.costo_usd) || 0;
                    let precioVentaCalculado = margenSeguro < 100 ? costoSeguro / (1 - (margenSeguro / 100)) : costoSeguro + (costoSeguro * (margenSeguro / 100));
                    
                    const codigoBarrasFinal = (p.codigo_barras && p.codigo_barras.trim() !== '')
                        ? p.codigo_barras.trim()
                        : generarCodigo13(id, index);
                        
                    if (p.id_presentacion) {
                        const sqlUpdatePres = `
                            UPDATE presentaciones_producto 
                              SET talla = ?, color = ?, codigo_barras = ?, costo_usd = ?, precio_venta_usd = ?, 
                                  cant_minima_mayor = ?, punto_reorden = ? 
                              WHERE id_presentacion = ?
                        `;
                        await queryTx(sqlUpdatePres, [
                            p.talla || null,
                            p.color || null,
                            codigoBarrasFinal,
                            costoSeguro,
                            precioVentaCalculado,
                            p.cant_minima_mayor || 0,
                            p.punto_reorden || 0,
                            p.id_presentacion
                        ]);
                        const sqlInv = `INSERT INTO inventario_sucursales (id_presentacion, id_sucursal, stock) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE stock = ?`;
                        await queryTx(sqlInv, [p.id_presentacion, id_sucursal, Number(p.stock) || 0, Number(p.stock) || 0]);
                    } else {
                        const sqlInsertPres = `
                            INSERT INTO presentaciones_producto 
                              (id_producto, talla, color, codigo_barras, costo_usd, precio_venta_usd, cant_minima_mayor, punto_reorden) 
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        const resPres = await queryTx(sqlInsertPres, [
                            id,
                            p.talla || null,
                            p.color || null,
                            codigoBarrasFinal,
                            costoSeguro,
                            precioVentaCalculado,
                            p.cant_minima_mayor || 0,
                            p.punto_reorden || 0
                        ]);
                        const sqlInv = `INSERT INTO inventario_sucursales (id_presentacion, id_sucursal, stock) VALUES (?, ?, ?)`;
                        await queryTx(sqlInv, [resPres.insertId, id_sucursal, Number(p.stock) || 0]);
                    }
                }
            }
            await new Promise((resolve, reject) => connection.commit(e => e ? reject(e) : resolve()));
            res.status(200).json({ message: "¡Producto actualizado correctamente!" });
        } catch (error) {
            connection.rollback();
            console.error(error);
            if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(400).json({ message: "No puedes eliminar una variante con ventas registradas." });
            res.status(500).json({ message: "Error interno al actualizar el producto." });
        } finally {
            connection.release();
        }
    });
};

export const eliminarProducto = async (req, res) => {
    try {
        await queryPromise('DELETE FROM presentaciones_producto WHERE id_producto = ?', [req.params.id]);
        await queryPromise('DELETE FROM productos WHERE id_prod = ?', [req.params.id]);
        res.status(200).json({ message: 'Producto eliminado exitosamente.' });
    } catch (err) { res.status(400).json({ message: 'No puedes eliminar este producto porque ya tiene ventas registradas.' }); }
};

export const obtenerPresentacionesPorProducto = async (req, res) => {
    const id_sucursal = req.user?.id_sucursal || 1;
    try {
        const sql = `
            SELECT pp.*, inv.stock
            FROM presentaciones_producto pp
            JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
            WHERE pp.id_producto = ?
        `;
        const results = await queryPromise(sql, [id_sucursal, req.params.id]);
        res.status(200).json(results);
    } catch (err) { res.status(500).json({ message: 'Error al consultar presentaciones.' }); }
};

export const buscarProductoEscaneado = async (req, res) => {
    const { q } = req.query;
    const id_sucursal = req.user?.id_sucursal || 1;
    
    const sql = `
        (SELECT pp.id_presentacion, p.id_prod, p.nombre_base, pp.talla, pp.color, 
                pp.costo_usd, pp.precio_venta_usd, pp.cant_minima_mayor, inv.stock as stock_sucursal
         FROM presentaciones_producto pp
         JOIN productos p ON pp.id_producto = p.id_prod
         JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
         WHERE pp.codigo_barras = ? LIMIT 15)
        UNION
        (SELECT pp.id_presentacion, p.id_prod, p.nombre_base, pp.talla, pp.color, 
                pp.costo_usd, pp.precio_venta_usd, pp.cant_minima_mayor, inv.stock as stock_sucursal
         FROM presentaciones_producto pp
         JOIN productos p ON pp.id_producto = p.id_prod
         JOIN inventario_sucursales inv ON pp.id_presentacion = inv.id_presentacion AND inv.id_sucursal = ?
         WHERE p.nombre_base LIKE ? LIMIT 15)
        LIMIT 15
    `;
    try {
        const results = await queryPromise(sql, [id_sucursal, q, id_sucursal, `%${q}%`]);
        res.status(200).json(results);
    } catch (err) { 
        console.error(err);
        res.status(500).json({ message: 'Error en la búsqueda.' }); 
    }
};