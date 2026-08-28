import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const loginUsuario = (req, res) => {
    const reqUsuario = req.body.usuario || req.body.username;
    const contrasena = req.body.contrasena || req.body.password;
    
    if (!reqUsuario || !contrasena) {
        return res.status(400).json({ message: 'El usuario y la contraseña son obligatorios.' });
    }

  const sql = `
        SELECT u.*, e.nom_emp, e.ape_emp, s.nombre as nombre_sucursal
        FROM usuarios u 
        LEFT JOIN empleados e ON u.emp_usu = e.id_emp 
        LEFT JOIN sucursales s ON u.id_sucursal = s.id_sucursal
        WHERE u.usuario = ?
    `;
    
    db.query(sql, [reqUsuario], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Error de conexión con la base de datos.' });
        
        if (results.length === 0) {
            return res.status(401).json({ message: 'El usuario ingresado no existe.' });
        }

        const user = results[0];
        if (user.estatus === 'INACTIVO') {
            return res.status(403).json({ message: 'Este usuario se encuentra deshabilitado. Contacte al administrador.' });
        }
        
        try {
            let isMatch = false;
            if (user.contra_hash && user.contra_hash.startsWith('$2b$')) {
                isMatch = await bcrypt.compare(contrasena, user.contra_hash);
            } else {
                isMatch = (contrasena === user.contra_hash);
                if (isMatch) {
                    const hashed = await bcrypt.hash(contrasena, 10);
                    db.query("UPDATE usuarios SET contra_hash = ? WHERE id_usu = ?", [hashed, user.id_usu]);
                }
            }

            if (!isMatch) {
                return res.status(401).json({ message: 'Contraseña incorrecta.' });
            }

         const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                console.error("Falta configurar JWT_SECRET en las variables de entorno para el Login.");
                return res.status(500).json({ message: 'Error interno de configuración del servidor.' });
            }

           const token = jwt.sign(
                { id_usu: user.id_usu, rol_usu: user.rol_usu, id_sucursal: user.id_sucursal }, 
                jwtSecret, 
                { expiresIn: '12h' }
            );

            db.query("INSERT INTO bitacora_auditoria (id_usuario, accion, modulo, descripcion) VALUES (?, 'LOGIN', 'ACCESO', 'Inicio de sesión exitoso')", [user.id_usu]);
            db.query("UPDATE usuarios SET ultimo_login = NOW() WHERE id_usu = ?", [user.id_usu]);

            const sqlPermisos = `
                SELECT p.cod_permiso 
                FROM permisos p 
                INNER JOIN permisos_usuario pu ON p.id_permiso = pu.id_permiso 
                WHERE pu.id_usu = ?
            `;

            db.query(sqlPermisos, [user.id_usu], (errPermisos, resultadosPermisos) => {
                if (errPermisos) return res.status(500).json({ message: 'Error al obtener permisos' });

                const listaPermisos = resultadosPermisos.map(p => p.cod_permiso);
                const nombreCompleto = (user.nom_emp && user.ape_emp) ? `${user.nom_emp} ${user.ape_emp}` : user.usuario;

                res.status(200).json({
                    message: 'Login exitoso',
                    token,
                   usuario: { 
                        id_usu: user.id_usu, 
                        usuario: user.usuario, 
                        rol_usu: user.rol_usu, 
                        id_sucursal: user.id_sucursal, 
                        nombre_sucursal: user.nombre_sucursal || 'Sede Principal',
                        nombre: nombreCompleto
                    },
                    permisos: listaPermisos
                });
            });

        } catch (error) {
            res.status(500).json({ message: 'Error interno procesando la seguridad.' });
        }
    });
};