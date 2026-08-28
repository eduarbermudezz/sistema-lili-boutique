import express from 'express';
import { obtenerProductos, eliminarProducto, crearProducto, obtenerPresentacionesPorProducto, actualizarProducto, buscarProductoEscaneado } from '../controllers/productController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, obtenerProductos);
router.post('/', verificarToken, requerirPermiso('PRODUCTOS'), crearProducto);
router.get('/buscar', verificarToken, buscarProductoEscaneado);
router.delete('/:id', verificarToken, requerirPermiso('PRODUCTOS'), eliminarProducto);
router.get('/:id/presentaciones', verificarToken, obtenerPresentacionesPorProducto);
router.put('/:id', verificarToken, requerirPermiso('PRODUCTOS'), actualizarProducto);

export default router;