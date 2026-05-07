import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// Профиль
router.get('/profile', authenticate, userController.getProfile.bind(userController));
router.put('/profile', authenticate, userController.updateProfile.bind(userController));

// Статистика
router.get('/stats', authenticate, userController.getStats.bind(userController));

// Смена пароля
router.post('/change-password', authenticate, userController.changePassword.bind(userController));

// Аватар
router.post('/avatar', authenticate, userController.updateAvatar.bind(userController));
router.delete('/avatar', authenticate, userController.deleteAvatar.bind(userController));

export default router;