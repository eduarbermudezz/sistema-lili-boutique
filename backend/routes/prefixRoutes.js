import express from 'express';
import { obtenerPrefijos } from '../controllers/prefixController.js';
import { verificarToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, obtenerPrefijos);

export default router;