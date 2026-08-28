import express from 'express';
import * as employeeCtrl from '../controllers/employeeController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, requerirPermiso('ADMINISTRACION'), employeeCtrl.obtenerEmpleados);
router.post('/', verificarToken, requerirPermiso('ADMINISTRACION'), employeeCtrl.registrarEmpleado);
router.put('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), employeeCtrl.actualizarEmpleado);
router.delete('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), employeeCtrl.eliminarEmpleado);

export default router;