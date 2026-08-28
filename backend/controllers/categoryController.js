import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const validarDatosCategoria = (nombre) => {
    if (!nombre || nombre.trim().length < 3 || nombre.trim().length > 30) return 'El nombre de la categoria debe tener al menos 3 caracteres.';
    return null;
};

export const obtenerCategorias = async (req, res) => {
    const sql = 'SELECT * FROM categorias_producto';
    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos al obtener categorias.' });
    }
};

export const crearCategoria = async (req, res) => {
    const { descrip_categ, margen_ganancia_defecto } = req.body;
    const errorValidacion = validarDatosCategoria(descrip_categ);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const margen = (margen_ganancia_defecto !== '' && margen_ganancia_defecto !== null && margen_ganancia_defecto !== undefined)
        ? parseFloat(margen_ganancia_defecto)
        : null;

    const sql = 'INSERT INTO categorias_producto (descrip_categ, margen_ganancia_defecto) VALUES (?, ?)';

    try {
        const result = await queryPromise(sql, [descrip_categ, margen]);

        res.status(201).json({
            message: 'Categoría registrada exitosamente.',
            id_categ: result.insertId,
            descrip_categ,
            margen_ganancia_defecto: margen
        });
    } catch (err) {
        console.error("Error al crear categoría:", err);
        res.status(500).json({ message: 'Error en la base de datos al registrar categoría.' });
    }
};

export const actualizarCategoria = (req, res) => {
    const { id } = req.params;
    const { descrip_categ, margen_ganancia_defecto } = req.body;

    const errorValidacion = validarDatosCategoria(descrip_categ);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const margen = (margen_ganancia_defecto !== '' && margen_ganancia_defecto !== null && margen_ganancia_defecto !== undefined)
        ? parseFloat(margen_ganancia_defecto)
        : null;

    db.getConnection(async (err, connection) => {
        if (err) {
            console.error("❌ Error al obtener conexión para transacción:", err);
            return res.status(500).json({ message: 'Error de conexión a la base de datos.' });
        }

        const queryTx = (sql, params) => new Promise((resolve, reject) => {
            connection.query(sql, params, (e, r) => e ? reject(e) : resolve(r));
        });

        try {
            await new Promise((resolve, reject) => connection.beginTransaction(e => e ? reject(e) : resolve()));

            const resultCat = await queryTx('UPDATE categorias_producto SET descrip_categ = ?, margen_ganancia_defecto = ? WHERE id_categ = ?', [descrip_categ, margen, id]);

            if (resultCat.affectedRows === 0) {
                throw new Error("NOT_FOUND");
            }

            if (margen !== null) {
                await queryTx('UPDATE productos SET margen_ganancia = ? WHERE categ_prod = ? AND usa_margen_categoria = 1', [margen, id]);

                const sqlUpdatePrecios = `
                    UPDATE presentaciones_producto pp
                    JOIN productos p ON pp.id_producto = p.id_prod
                    SET pp.precio_venta_usd = IF(
                        p.margen_ganancia < 100,
                        pp.costo_usd / (1 - (p.margen_ganancia / 100)),
                        pp.costo_usd + (pp.costo_usd * (p.margen_ganancia / 100))
                    )
                    WHERE p.categ_prod = ? AND p.usa_margen_categoria = 1
                `;
                await queryTx(sqlUpdatePrecios, [id]);
            }

            await new Promise((resolve, reject) => connection.commit(e => e ? reject(e) : resolve()));
            res.status(200).json({ message: 'Categoría actualizada y precios recalculados exitosamente.' });

        } catch (error) {
            connection.rollback();

            console.error("Error actualizando categoría (Rollback ejecutado):", error);

            if (error.message === "NOT_FOUND") {
                return res.status(404).json({ message: 'La categoría que intentas actualizar no fue encontrada.' });
            }

            res.status(500).json({ message: 'Error en la base de datos al actualizar la categoría y recalcular precios.' });
        } finally {
            connection.release();
        }
    });
};

export const eliminarCategoria = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await queryPromise('DELETE FROM categorias_producto WHERE id_categ = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'La categoría no fue encontrada.' });
        }

        res.status(200).json({ message: 'Categoría eliminada exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(400).json({
                message: 'Tiene registros asociados en otras secciones del sistema.'
            });
        }
        console.error("Error eliminando categoría:", err);
        res.status(500).json({ message: 'Error en la base de datos al eliminar categoría.' });
    }
};