import express from 'express';
import * as methodCtrl from '../controllers/methodController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, requerirPermiso('ADMINISTRACION'), methodCtrl.obtenerMetodosPago);
router.post('/', verificarToken, requerirPermiso('ADMINISTRACION'), methodCtrl.crearMetodoPago);
router.put('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), methodCtrl.actualizarMetodoPago);
router.delete('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), methodCtrl.eliminarMetodoPago);

export default router;