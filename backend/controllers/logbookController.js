import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

export const obtenerBitacora = async (req, res) => {
    const sql = `SELECT b.*, u.usuario FROM bitacora_auditoria b LEFT JOIN usuarios u ON b.id_usuario = u.id_usu ORDER BY b.fecha DESC LIMIT 150`;
    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos al obtener bitácora.' });
    }
};

export const vaciarBitacora = async (req, res) => {
    try {
        await queryPromise("DELETE FROM bitacora_auditoria", []);
        res.status(200).json({ message: 'Historial limpiado exitosamente.' });
    } catch (err) {
        res.status(500).json({ message: 'Error al limpiar la bitácora.' });
    }
};