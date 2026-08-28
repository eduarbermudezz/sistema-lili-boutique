import express from 'express';
import * as headquaterCtrl from '../controllers/headquaterController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, requerirPermiso('ADMINISTRACION'), headquaterCtrl.obtenerSucursales);
router.post('/', verificarToken, requerirPermiso('ADMINISTRACION'), headquaterCtrl.registrarSucursal);
router.put('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), headquaterCtrl.actualizarSucursal);
router.delete('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), headquaterCtrl.eliminarSucursal);

export default router;
