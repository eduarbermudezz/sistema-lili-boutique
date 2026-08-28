import express from 'express';
import * as permitionCtrl from '../controllers/permitionController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, permitionCtrl.obtenerPermisos);
router.post('/usuario/asignar', verificarToken, requerirPermiso('ADMINISTRACION'), permitionCtrl.asignarPermisosUsuario);

export default router;