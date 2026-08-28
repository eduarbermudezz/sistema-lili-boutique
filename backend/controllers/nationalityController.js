import db from '../config/db.js';

export const obtenerNacionalidades = (req, res) => {
  const sql = 'SELECT * FROM tipos_documento ORDER BY id_tipo ASC';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al consultar nacionalidades:', err);
      return res.status(500).json({ message: 'Error en la base de datos.' });
    }

    res.status(200).json(results);
  });
};
