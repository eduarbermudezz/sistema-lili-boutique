import express from 'express';
import * as clientCtrl from '../controllers/clientController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, clientCtrl.obtenerClientes);
router.post('/', verificarToken, clientCtrl.crearCliente);
router.delete('/:id', verificarToken, requerirPermiso('CLIENTES'), clientCtrl.eliminarCliente);
router.put('/:id', verificarToken, requerirPermiso('CLIENTES'), clientCtrl.actualizarCliente);

router.get('/:id/saldo', verificarToken, clientCtrl.obtenerSaldoFavor);

export default router;