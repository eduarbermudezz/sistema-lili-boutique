import db from '../config/db.js';
import bcrypt from 'bcrypt';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const validarDatosUsuario = (usuario, contrasena, id_empleado, id_sucursal) => {
    if (!usuario || usuario.trim().length < 3 || usuario.trim().length > 10) return 'El nombre de usuario debe tener entre 3 y 10 caracteres alfanuméricos.';
    if (contrasena && contrasena.trim() !== '' && (contrasena.trim().length < 4 || contrasena.trim().length > 15)) return 'La contraseña es obligatoria para usuarios nuevos (entre 4 y 15 caracteres).';
    if (!id_empleado || id_empleado === '') return 'Debe seleccionar un empleado vinculado al usuario.';
    if (!id_sucursal || id_sucursal === '') return 'Debe seleccionar una sucursal vinculada al usuario.';
    return null;
};

export const obtenerUsuarios = async (req, res) => {
    const sql = `
             SELECT u.id_usu, u.usuario, u.estatus, u.ultimo_login, r.nom_rol, u.rol_usu, u.emp_usu, concat(e.nom_emp,' ', e.ape_emp) as nombre_empleado, u.id_sucursal
        FROM usuarios u
        LEFT JOIN roles r ON u.rol_usu = r.id_rol
        LEFT JOIN empleados e ON u.emp_usu = e.id_emp
        ORDER BY u.id_usu DESC
    `;
    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) { res.status(500).json({ message: 'Error al obtener usuarios.' }); }
};

export const registrarUsuario = async (req, res) => {
    const { usuario, contra_hash, emp_usu, rol_usu, id_sucursal, estatus } = req.body;

    const errorValidacion = validarDatosUsuario(usuario, contra_hash, emp_usu, id_sucursal);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const sql = `INSERT INTO usuarios (usuario, contra_hash, emp_usu, rol_usu, id_sucursal, estatus) VALUES (?, ?, ?, ?, ?, ?)`;
    try {
        if (parseInt(rol_usu) === 1) {
            const count = await queryPromise("SELECT COUNT(*) as total FROM usuarios WHERE rol_usu = 1", []);
            if (count[0].total > 0) return res.status(400).json({ message: 'Ya existe un Superadmin registrado.' });
        }
        const hashed = await bcrypt.hash(contra_hash, 10);

        const result = await queryPromise(sql, [usuario, hashed, emp_usu, rol_usu, id_sucursal, estatus]);

        const nuevoIdUsuario = result.insertId;

        const permisosBase = await queryPromise('SELECT id_permiso_ FROM permisos_rol WHERE id_rol_ = ?', [rol_usu]);

        if (permisosBase.length > 0) {
            const valoresPermisos = permisosBase.map(p => [nuevoIdUsuario, p.id_permiso_]);
            await queryPromise('INSERT INTO permisos_usuario (id_usu, id_permiso) VALUES ?', [valoresPermisos]);
        }

        res.status(201).json({
            message: 'Usuario creado y permisos asignados exitosamente.',
            id_usu: nuevoIdUsuario
        });
    } catch (err) {
        console.error("Error exacto en registrarUsuario:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'El nombre de usuario ya está en uso o el empleado ya tiene un usuario asignado.' });
        }
        res.status(500).json({ message: 'Error en la base de datos al registrar usuario.' });
    }
};

export const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { usuario, contra_hash, emp_usu, rol_usu, id_sucursal, estatus } = req.body;

    const errorValidacion = validarDatosUsuario(usuario, contra_hash, emp_usu, id_sucursal);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    try {
        if (parseInt(rol_usu) === 1) {
            const count = await queryPromise("SELECT COUNT(*) AS total FROM usuarios WHERE rol_usu = 1 AND id_usu != ?", [id]);
            if (count[0].total > 0) return res.status(400).json({ message: 'Ya existe un Superadmin registrado.' });
            if (estatus === 'INACTIVO') return res.status(400).json({ message: 'El Super Administrador no puede ser deshabilitado.' });
        }

        let sql;
        let params;

        if (contra_hash && contra_hash.trim() !== '') {
            const hashed = await bcrypt.hash(contra_hash, 10);
            sql = `UPDATE usuarios SET usuario=?, contra_hash=?, emp_usu=?, rol_usu=?, id_sucursal=?, estatus=? WHERE id_usu=?`;
            params = [usuario, hashed, emp_usu, rol_usu, id_sucursal, estatus, id];
        } else {
            sql = `UPDATE usuarios SET usuario=?, emp_usu=?, rol_usu=?, id_sucursal=?, estatus=? WHERE id_usu=?`;
            params = [usuario, emp_usu, rol_usu, id_sucursal, estatus, id];
        }
        const result = await queryPromise(sql, params);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });

        res.status(200).json({ message: 'Usuario actualizado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'El nombre de usuario ya está en uso o el empleado ya tiene un usuario asignado.' });
        res.status(500).json({ message: 'Error en la base de datos al actualizar usuario.' });
    }
};

export const eliminarUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        const usuarioAEliminar = await queryPromise("SELECT rol_usu FROM usuarios WHERE id_usu = ?", [id]);
        if (usuarioAEliminar.length > 0 && usuarioAEliminar[0].rol_usu === 1) return res.status(403).json({ message: 'No es posible eliminar al Super Administrador.' });


        const result = await queryPromise('DELETE FROM usuarios WHERE id_usu = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'El usuario no fue encontrado.' });
        }

        res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(400).json({
                message: 'Tiene registros asociados en otras secciones del sistema.'
            });
        }
        console.error("Error eliminando usuario:", err);
        res.status(500).json({ message: 'Error en la base de datos al eliminar usuario.' });
    }
};