import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const validarDatosSucursal = (nombre, direccion) => {
    if (!nombre || nombre.trim().length < 3 || nombre.trim().length > 30) return 'El nombre de la sucursal debe tener al menos 3 caracteres.';
    if (!direccion || direccion.trim().length < 3 || direccion.trim().length > 50) return 'La dirección debe ser más larga.';
    return null;
};

export const obtenerSucursales = async (req, res) => {
    const sql = 'SELECT * FROM sucursales ORDER BY id_sucursal DESC';
    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos al obtener sucursales.' });
    }
};

export const registrarSucursal = async (req, res) => {
    const { nombre, direccion } = req.body;
    const errorValidacion = validarDatosSucursal(nombre, direccion);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const sql = `INSERT INTO sucursales (nombre, direccion) VALUES (?, ?)`;
    try {
        const result = await queryPromise(sql, [nombre, direccion]);

        res.status(201).json({
            message: 'Sucursal registrada exitosamente.',
            id_sucursal: result.insertId
        });
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos al registrar sucursal.' });
    }
};

export const actualizarSucursal = async (req, res) => {
    const { id } = req.params;
    const { nombre, direccion } = req.body;
    const errorValidacion = validarDatosSucursal(nombre, direccion);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    try {
        const sql = `UPDATE sucursales SET nombre = ?, direccion = ? WHERE id_sucursal = ?`;
        const result = await queryPromise(sql, [nombre, direccion, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Sucursal no encontrada.' });

        res.status(200).json({ message: 'Sucursal actualizada correctamente.' });
    } catch (err) {
        es.status(500).json({ message: 'Error en la base de datos al actualizar sucursal.' });
    }
};

export const eliminarSucursal = async (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === 1) {
        return res.status(403).json({ message: 'Prohibido eliminar la sucursal principal.' });
    }
    try {
        const result = await queryPromise('DELETE FROM sucursales WHERE id_sucursal = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Sucursal no fue encontrada.' });
        }

        res.status(200).json({ message: 'Sucursal eliminada exitosamente' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(400).json({
                message: 'Tiene registros asociados en otras secciones del sistema.'
            });
        }
        res.status(500).json({ message: 'Error en la base de datos al eliminar sucursal.' });
    }
};
