import express from 'express';
import { registrarEntrada } from '../controllers/entradaController.js';
import { verificarToken, requerirPermiso } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verificarToken, requerirPermiso('ENTRADAS'), registrarEntrada); 

export default router;