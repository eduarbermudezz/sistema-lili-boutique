import express from 'express';
import * as logbookCtrl from '../controllers/logbookController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, requerirPermiso('ADMINISTRACION'), logbookCtrl.obtenerBitacora);
router.delete('/', verificarToken, requerirPermiso('ADMINISTRACION'), logbookCtrl.vaciarBitacora);

export default router;