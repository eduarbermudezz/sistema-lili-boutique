import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const validarDatosProveedor = (nombre) => {
    if (!nombre || nombre.trim().length < 3) {
        return 'El nombre debe tener al menos 3 caracteres.';
    }
    return null;
};

export const obtenerProveedores = async (req, res) => {
    const sql = `
        SELECT 
        p.id_prov, p.nombre
        FROM proveedores p
        ORDER BY p.id_prov DESC
    `;

    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) {
        console.error('Error al consultar proveedores:', err);
        res.status(500).json({ message: 'Error en la base de datos.' });
    }
};


export const crearProveedor = async (req, res) => {
    const { nombre } = req.body;

    const errorValidacion = validarDatosProveedor(nombre);
    if (errorValidacion) {
        return res.status(400).json({ message: errorValidacion });
    }

    const sql = `
        INSERT INTO proveedores (nombre) 
        VALUES (?)
    `;

    try {
        const result = await queryPromise(sql, [nombre]);
        res.status(201).json({
            message: 'Proveedor registrado exitosamente.',
            id_prov: result.insertId,
            nombre
        });
    } catch (err) {
        console.error('Error al insertar proveedor:', err);
        res.status(500).json({ message: 'Error en la base de datos al crear proveedor.' });
    }
};

export const actualizarProveedor = async (req, res) => {
    const { id } = req.params;

    const { nombre } = req.body;

    const errorValidacion = validarDatosProveedor( nombre );
    if (errorValidacion) {
        return res.status(400).json({ message: errorValidacion });
    }

    const sql = `
        UPDATE proveedores
        SET nombre = ?
        WHERE id_prov = ?
    `;

    try {
        const result = await queryPromise(sql, [nombre, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Proveedor no encontrado.' });
        }
        res.status(200).json({ message: 'Proveedor actualizado exitosamente.' });
    } catch (err) {
        console.error('Error al actualizar proveedor:', err);
        res.status(500).json({ message: 'Error en la base de datos al actualizar proveedor.' });
    }
};

export const eliminarProveedor = async (req, res) => {
    const { id } = req.params;

    try {
        await queryPromise('DELETE FROM proveedores WHERE id_prov = ?', [id]);
        res.status(200).json({ message: 'Proveedor eliminado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(400).json({
                message: 'No puedes eliminar este proveedor porque tiene productos asociados en el sistema.'
            });
        }

        console.error('Error al eliminar proveedor:', err);
        res.status(500).json({ message: 'Error en la base de datos al eliminar proveedor.' });
    }
};