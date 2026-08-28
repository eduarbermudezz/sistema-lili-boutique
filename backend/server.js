import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js'; 
import userRoutes from './routes/userRoutes.js'; 
import productRoutes from './routes/productRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import nationalityRoutes from './routes/nationalityRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import prefixRoutes from './routes/prefixRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import configRoutes from './routes/configRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import ventaRoutes from './routes/ventaRoutes.js';
import entradaRoutes from './routes/entradaRoutes.js';
import cobroRoutes from './routes/cobroRoutes.js';
import logbookRoutes from './routes/logbookRoutes.js';
import methodRoutes from './routes/methodRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import permitionRoutes from './routes/permitionRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import headquaterRoutes from './routes/headquaterRoutes.js';
import reportesRoutes from './routes/reportesRoutes.js';
import { iniciarCronBackup } from './services/backupService.js';
import { actualizarTodasLasTasas } from './controllers/configController.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001; 

app.use(cors({
    origin: function (origin, callback) { callback(null, true); }, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/clientes', clientRoutes);
app.use('/api/nacionalidades', nationalityRoutes);
app.use('/api/categorias', categoryRoutes);
app.use('/api/prefijos', prefixRoutes);
app.use('/api/proveedores', providerRoutes);
app.use('/api/configuracion', configRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/entradas', entradaRoutes);
app.use('/api/cobros', cobroRoutes);
app.use('/api/bitacora', logbookRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/permisos', permitionRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/sucursales', headquaterRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/empleados', employeeRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/metodos-pago', methodRoutes);

cron.schedule('*/30 8-18 * * 1-5', async () => {
    console.log('[CRON] Iniciando actualización automática de tasas multimoneda...');
    try {
        const tasas = await actualizarTodasLasTasas();
        console.log(`[CRON] ✅ Tasas actualizadas con éxito`);
    } catch (error) {
        console.error('[CRON] ❌ Error:', error.message);
    }
});

iniciarCronBackup();

const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor de Samson Gym ejecutándose en el puerto ${PORT}`);
});