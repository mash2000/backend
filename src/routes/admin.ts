import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate } from '../middleware/auth';

const router = Router();
const adminController = new AdminController();

// Все маршруты требуют аутентификации и прав администратора
router.use(authenticate);

// Пользователи
router.get('/users', adminController.getAllUsers.bind(adminController));
router.get('/users/:id', adminController.getUserById.bind(adminController));
router.post('/users', adminController.createUser.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));
router.post('/users/:id/reset-password', adminController.resetUserPassword.bind(adminController));

// Статистика
router.get('/stats', adminController.getSystemStats.bind(adminController));

export default router;