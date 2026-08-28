import express from 'express';
import * as userCtrl from '../controllers/userController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, requerirPermiso('ADMINISTRACION'),userCtrl.obtenerUsuarios);
router.post('/', verificarToken, requerirPermiso('ADMINISTRACION'), userCtrl.registrarUsuario);
router.put('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), userCtrl.actualizarUsuario);
router.delete('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), userCtrl.eliminarUsuario);

export default router;