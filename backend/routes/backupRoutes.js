import express from 'express';
import * as backupCtrl from '../controllers/backupController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/respaldo/descargar', verificarToken, requerirPermiso('ADMINISTRACION'), backupCtrl.descargarRespaldo);
router.put('/', verificarToken, requerirPermiso('ADMINISTRACION'), backupCtrl.actualizarEstadoBackup);

export default router;