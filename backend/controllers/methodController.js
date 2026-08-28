import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const validarDatosMetodo = (descripcion) => {
    if (!descripcion || descripcion.trim().length < 3 || descripcion.trim().length > 30) {
        return 'La descripción del método debe tener entre 3 y 30 caracteres.';
    }
    return null;
};

export const obtenerMetodosPago = async (req, res) => {
    const sql = 'SELECT id_metodo, descripcion, moneda FROM metodos_pago ORDER BY id_metodo DESC';
    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos al obtener metodos.' });
    }
};

export const crearMetodoPago = async (req, res) => {
    const { descripcion, moneda } = req.body;
    const errorValidacion = validarDatosMetodo(descripcion);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const sql = 'INSERT INTO metodos_pago (descripcion, moneda) VALUES (?, ?)';
    try {
        const result = await queryPromise(sql, [descripcion, moneda]);

        res.status(201).json({
            message: 'Método registrado exitosamente.',
            id_metodo: result.insertId
        });
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos al registrar método.' });
    }
};

export const actualizarMetodoPago = async (req, res) => {
    const { id } = req.params;
    const { descripcion, moneda } = req.body;

    if (id == 120009) {
        return res.status(403).json({ message: 'No se puede editar el método "Nota de Crédito".' });
    }

    const errorValidacion = validarDatosMetodo(descripcion);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    try {
        const sql = `UPDATE metodos_pago SET descripcion = ?, moneda = ? WHERE id_metodo = ?`;
        const result = await queryPromise(sql, [descripcion, moneda, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Método no encontrado.' });

        res.status(200).json({ message: 'Método actualizado correctamente.' });
   } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos al actualizar método.' });
    }
};

export const eliminarMetodoPago = async (req, res) => {
    const { id } = req.params;

    if (id == 120009) {
        return res.status(403).json({ message: ' No se puede eliminar el método "Nota de Crédito".' });
    }

    try {
        await queryPromise('DELETE FROM metodos_pago WHERE id_metodo = ?', [id]);
        res.status(200).json({ message: 'Método eliminado correctamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(400).json({
                message: 'No se puede eliminar porque ya hay ventas registradas con este método.'
            });
        }
        res.status(500).json({ message: 'Error en la base de datos al eliminar método.' });
    }
};