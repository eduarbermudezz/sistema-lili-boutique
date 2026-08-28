import express from 'express';
import * as categoryCtrl from '../controllers/categoryController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, categoryCtrl.obtenerCategorias);
router.post('/', verificarToken, requerirPermiso('ADMINISTRACION'), categoryCtrl.crearCategoria);
router.put('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), categoryCtrl.actualizarCategoria);
router.delete('/:id', verificarToken, requerirPermiso('ADMINISTRACION'), categoryCtrl.eliminarCategoria);

export default router;