import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { 
    registerValidation, 
    loginValidation, 
    changePasswordValidation 
} from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

// Публичные маршруты с ограничением по частоте запросов
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/check-email', authController.checkEmail);

// Маршруты восстановления пароля
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Защищенные маршруты
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);

export default router;