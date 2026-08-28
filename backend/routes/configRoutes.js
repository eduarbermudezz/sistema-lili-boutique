import express from 'express';
import * as configController from '../controllers/configController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, configController.obtenerConfiguracion);
router.get('/actualizar-tasas-manual', verificarToken, configController.actualizarTasasManual);
router.put('/tasas', verificarToken, requerirPermiso('TASA_PAGO'), configController.guardarTasasManuales);
router.put('/mora', verificarToken, requerirPermiso('TASA_MORA'), configController.actualizarMora);
export default router;