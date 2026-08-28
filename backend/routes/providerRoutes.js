import express from 'express';
import { obtenerProveedores, crearProveedor, eliminarProveedor, actualizarProveedor} from '../controllers/providerController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, obtenerProveedores);
router.post('/', verificarToken, requerirPermiso('PROVEEDORES'), crearProveedor);
router.delete('/:id', verificarToken, requerirPermiso('PROVEEDORES'), eliminarProveedor);
router.put('/:id', verificarToken, requerirPermiso('PROVEEDORES'), actualizarProveedor);

export default router;