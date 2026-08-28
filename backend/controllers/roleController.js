import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

export const obtenerRoles = async (req, res) => {
    const sql = `SELECT * FROM roles`;
    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) { res.status(500).json({ message: 'Error al obtener roles.' }); }
};

