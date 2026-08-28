import express from 'express';
import { obtenerReporteGerencial } from '../controllers/reportesController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/resumen', verificarToken, requerirPermiso('REPORTES'), obtenerReporteGerencial);
export default router;