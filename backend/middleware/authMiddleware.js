import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const verificarToken = (req, res, next) => {
    let token;
    const authHeader = req.headers['authorization'];
    
    if (authHeader) {
        token = authHeader.split(' ')[1];
    } 
    else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(403).json({ message: 'Acceso denegado: No se proporcionó un token.' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error("🚨 CRÍTICO: Falta configurar JWT_SECRET en las variables de entorno.");
        return res.status(500).json({ message: 'Error interno de configuración del servidor.' });
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Token inválido o expirado. Inicie sesión nuevamente.' });
        
        req.user = decoded; 
        next(); 
    });
};

export const requerirPermiso = (permisoRequerido) => {
    return (req, res, next) => {
      if (req.user && req.user.rol_usu === 1) {
            return next();
        }
        const sql = `
            SELECT 1 
            FROM permisos_usuario pu
            JOIN permisos p ON pu.id_permiso = p.id_permiso
            WHERE pu.id_usu = ? AND p.cod_permiso = ?
        `;
        
        db.query(sql, [req.user.id_usu, permisoRequerido], (err, results) => {
            if (err) return res.status(500).json({ message: 'Error interno verificando permisos' });
            
            if (results.length > 0) {
                return next(); 
            } else {
                return res.status(403).json({ 
                    message: `Prohibido: No tienes el permiso (${permisoRequerido}) para realizar esta acción.` 
                });
            }
        });
    };
};

export const auditarAccion = (id_usuario, accion, modulo, descripcion) => {
    const sql = "INSERT INTO bitacora_auditoria (id_usuario, accion, modulo, descripcion) VALUES (?, ?, ?, ?)";
    db.query(sql, [id_usuario, accion, modulo, descripcion], (err) => {
        if (err) console.error("Error guardando en bitácora:", err);
    });
};