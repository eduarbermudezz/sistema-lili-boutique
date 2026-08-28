import express from 'express';
import * as ventaCtrl from '../controllers/ventaController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/metodos-pago', verificarToken, ventaCtrl.obtenerMetodosPago);
router.get('/historial', verificarToken, ventaCtrl.obtenerVentas);
router.get('/:id', verificarToken, ventaCtrl.obtenerDetalleVenta);

router.post('/', verificarToken, ventaCtrl.registrarVenta);

router.post('/devolucion', verificarToken, requerirPermiso('DEVOLUCION'), ventaCtrl.procesarDevolucion);

export default router;