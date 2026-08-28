import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import cron from 'node-cron';
import { google } from 'googleapis';
import db from '../config/db.js'; 

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "https://developers.google.com/oauthplayground");
auth.setCredentials({ refresh_token: REFRESH_TOKEN });
const driveService = google.drive({ version: 'v3', auth });

const generarYSubirRespaldo = () => {
    console.log("Iniciando respaldo automático...");
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    
    const date = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
    const fileName = `backup_auto_${DB_NAME}_${date}.sql`;
    
    const dir = path.join(os.tmpdir(), 'backups_lili_pos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const backupPath = path.join(dir, fileName);

    const mysqldumpPath = `"${path.join(process.cwd(), 'tools', 'mysqldump.exe')}"`;
    
    let command = `${mysqldumpPath} -h ${DB_HOST} -P 4000 -u ${DB_USER}`;
    if (DB_PASSWORD) command += ` -p"${DB_PASSWORD}"`; 
    command += ` --ssl ${DB_NAME} > "${backupPath}"`;

    exec(command, async (error) => {
        if (error) {
            console.error("❌ Error al generar mysqldump para Drive:", error);
            return;
        }
        
        console.log(`Respaldo temporal generado. Subiendo a Google Drive...`);
        try {
            const oldFiles = await driveService.files.list({
                q: `'${FOLDER_ID}' in parents and trashed = false`,
                fields: 'files(id, name)'
            });

            for (const file of oldFiles.data.files) {
                await driveService.files.delete({ fileId: file.id });
            }

            await driveService.files.create({
                resource: { name: fileName, parents: [FOLDER_ID] }, 
                media: { mimeType: 'application/sql', body: fs.createReadStream(backupPath) }, 
                fields: 'id'
            });

            console.log(`✅ ¡Éxito! Nuevo respaldo subido a Drive`);
        } catch (uploadError) {
            console.error("❌ Error al procesar en Google Drive:", uploadError.message);
        } finally {
            if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        }
    });
};

export const iniciarCronBackup = () => {
    cron.schedule('0 9,21 * * *', () => {
        db.query('SELECT backup_activo FROM configuracion WHERE id_config = 1', (err, results) => {
            if (err) return console.error("Error consultando el estado del backup:", err);
            
            if (results.length > 0 && results[0].backup_activo === 1) {
                generarYSubirRespaldo();
            } else {
                console.log("⏰ Respaldo omitido: El sistema está DESACTIVADO.");
            }
        });
    }, { scheduled: true, timezone: "America/Caracas" });
    console.log("✅ Servicio de respaldos automáticos iniciado.");
};