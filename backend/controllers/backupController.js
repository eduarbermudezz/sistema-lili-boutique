import db from '../config/db.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

export const descargarRespaldo = (req, res) => {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

    const date = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];

    const fileName = `backup_${DB_NAME}_${date}.sql`;

    const dir = path.join(os.tmpdir(), 'backups_lili_pos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const backupPath = path.join(dir, fileName);

    const isWindows = os.platform() === 'win32';

    const mysqldumpPath = isWindows
        ? `"${path.join(process.cwd(), 'tools', 'mysqldump.exe')}"`
        : "mysqldump";

    let command = `${mysqldumpPath} -h ${DB_HOST} -P 4000 -u ${DB_USER}`;
    if (DB_PASSWORD) command += ` -p"${DB_PASSWORD}"`;
    command += ` --ssl ${DB_NAME} > "${backupPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error("Error al generar el respaldo:", error);
            if (error.message.includes('Access denied')) {
                return res.status(500).json({ message: 'Acceso denegado a la base de datos.' });
            }
            return res.status(500).json({ message: `Error ejecutando mysqldump: ${stderr || error.message}` });
        }

        res.download(backupPath, fileName, (err) => {
            if (err) console.error("Error enviando el archivo:", err);
            if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        });
    });
};

export const actualizarEstadoBackup = async (req, res) => {
    const { backup_activo } = req.body;

    try {
        const sql = 'UPDATE configuracion SET backup_activo = ? WHERE id_config = 1';
        const result = await queryPromise(sql, [backup_activo]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Registro de configuración no encontrado en la base de datos.' });
        }

        res.status(200).json({ message: 'Estado del respaldo automático actualizado correctamente.' });
    } catch (err) {
        console.error('Error al actualizar estado del respaldo:', err);
        res.status(500).json({ message: 'Error interno en la base de datos al actualizar el respaldo.' });
    }
};