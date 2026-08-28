import db from '../config/db.js';

export const obtenerPrefijos = (req, res) => {
  const sql = 'SELECT * FROM prefijos_telefono ORDER BY id_pref ASC';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al consultar prefijos:', err);
      return res.status(500).json({ message: 'Error en la base de datos.' });
    }

    res.status(200).json(results);
  });
};
