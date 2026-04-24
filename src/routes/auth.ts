import { Router } from 'express';
import authController from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Публичные маршруты
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));

// Защищенные маршруты
router.get('/me', authenticate, authController.getMe.bind(authController));

export default router;