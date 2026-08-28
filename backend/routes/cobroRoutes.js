import express from 'express';
const router = express.Router();
import * as cobroCtrl from '../controllers/cobroController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

router.get('/resumen', verificarToken, requerirPermiso('COBRANZAS'), cobroCtrl.obtenerCuentasPorCobrar);
router.get('/cliente/:id_cliente', verificarToken, requerirPermiso('COBRANZAS'), cobroCtrl.obtenerFacturasDeudor);
router.post('/abono', verificarToken, requerirPermiso('COBRANZAS'), cobroCtrl.registrarAbono);
router.put('/mora/:id_venta', verificarToken, requerirPermiso('MORAS'), cobroCtrl.alternarMora);

export default router;