import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

export const obtenerPermisos = async (req, res) => {
    try {
        const todosPermisos = await queryPromise("SELECT * FROM permisos", []);
        const mapeo = await queryPromise("SELECT id_usu, id_permiso FROM permisos_usuario", []);
        res.status(200).json({ todosPermisos, mapeo });
    } catch (err) {
        console.error("Error cargando permisos de usuario:", err);
        res.status(200).json({ todosPermisos: [], mapeo: [] });
    }
};

export const asignarPermisosUsuario = async (req, res) => {
    const { id_usu, permisos } = req.body;
    try {
        await queryPromise('DELETE FROM permisos_usuario WHERE id_usu = ?', [id_usu]);
        if (permisos && permisos.length > 0) {
            const values = permisos.map(p => [id_usu, p]);
            await queryPromise('INSERT INTO permisos_usuario (id_usu, id_permiso) VALUES ?', [values]);
        }
        res.status(200).json({ message: "Permisos actualizados correctamente." });
    } catch (err) {
        res.status(500).json({ message: 'Error al actualizar permisos de usuario.' });
    }
};