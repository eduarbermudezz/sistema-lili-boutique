import express from 'express';
import * as roleCtrl from '../controllers/roleController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, roleCtrl.obtenerRoles);

export default router;