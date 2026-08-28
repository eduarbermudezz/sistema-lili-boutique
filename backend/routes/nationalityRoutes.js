import express from 'express';
import { obtenerNacionalidades } from '../controllers/nationalityController.js';
import { verificarToken} from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verificarToken, obtenerNacionalidades);

export default router;