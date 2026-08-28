import mysql from 'mysql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const db = mysql.createPool({
    connectionLimit: 20,
    connectTimeout: 40000,
    acquireTimeout: 40000,
    timeout: 40000,
    host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'sistema',
    port: Number(process.env.DB_PORT) || 4000,
    ssl: process.env.DB_HOST === 'localhost' ? false : { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    
    timezone: '-04:00',
    dateStrings: true
});

db.on('connection', (connection) => {
    connection.query("SET time_zone = '-04:00';", (err) => {
        if (err) console.error('Error al forzar zona horaria:', err.message);
    });
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
    } else {
        console.log(`✅ Connected to ${process.env.DB_HOST === 'localhost' ? 'Local MySQL' : 'TiDB'} database!`);
        connection.release();
    }
});

export default db;