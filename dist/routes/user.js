"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const userController = new userController_1.UserController();
// Профиль
router.get('/profile', auth_1.authenticate, userController.getProfile.bind(userController));
router.put('/profile', auth_1.authenticate, userController.updateProfile.bind(userController));
// Статистика
router.get('/stats', auth_1.authenticate, userController.getStats.bind(userController));
// Смена пароля
router.post('/change-password', auth_1.authenticate, userController.changePassword.bind(userController));
// Аватар
router.post('/avatar', auth_1.authenticate, userController.updateAvatar.bind(userController));
router.delete('/avatar', auth_1.authenticate, userController.deleteAvatar.bind(userController));
exports.default = router;
//# sourceMappingURL=user.js.map