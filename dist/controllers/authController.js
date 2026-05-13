"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class AuthController {
    /**
     * Регистрация пользователя
     */
    async register(req, res) {
        try {
            console.log('📝 Register request:', req.body);
            const { email, password, name } = req.body;
            if (!email || !password || !name) {
                res.status(400).json({
                    success: false,
                    error: 'Все поля обязательны'
                });
                return;
            }
            const existingUser = await User_1.default.findOne({
                where: { email: email.toLowerCase() }
            });
            if (existingUser) {
                res.status(400).json({
                    success: false,
                    error: 'Пользователь уже существует'
                });
                return;
            }
            // В методе register добавьте проверку сложности пароля
            const checkPasswordStrength = (password) => {
                const checks = [
                    { test: password.length >= 8, message: 'Пароль должен содержать минимум 8 символов' },
                    { test: /[A-Z]/.test(password), message: 'Пароль должен содержать заглавную букву' },
                    { test: /[a-z]/.test(password), message: 'Пароль должен содержать строчную букву' },
                    { test: /[0-9]/.test(password), message: 'Пароль должен содержать цифру' },
                    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: 'Пароль должен содержать специальный символ' }
                ];
                for (const check of checks) {
                    if (!check.test) {
                        return { isValid: false, message: check.message };
                    }
                }
                return { isValid: true };
            };
            // Используйте в методе register
            const passwordStrength = checkPasswordStrength(password);
            if (!passwordStrength.isValid) {
                res.status(400).json({
                    success: false,
                    error: passwordStrength.message
                });
                return;
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const user = await User_1.default.create({
                id: (0, uuid_1.v4)(),
                email: email.toLowerCase(),
                passwordHash: hashedPassword,
                name: name.trim(),
                storageLimit: 1073741824
            });
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_ACCESS_SECRET || 'secret_key', { expiresIn: '7d' });
            console.log('✅ User registered:', user.email);
            res.status(201).json({
                success: true,
                message: 'Регистрация успешна',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });
        }
        catch (error) {
            console.error('❌ Register error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка регистрации'
            });
        }
    }
    /**
     * Вход пользователя - ИСПРАВЛЕННАЯ ВЕРСИЯ
     */
    async login(req, res) {
        try {
            console.log('🔐 Login request for:', req.body.email);
            const { email, password } = req.body;
            if (!email || !password) {
                console.log('❌ Missing email or password');
                res.status(400).json({
                    success: false,
                    error: 'Email и пароль обязательны'
                });
                return;
            }
            // Поиск пользователя
            const user = await User_1.default.findOne({
                where: { email: email.toLowerCase() }
            });
            if (!user) {
                console.log('❌ User not found:', email);
                res.status(401).json({
                    success: false,
                    error: 'Неверный email или пароль'
                });
                return;
            }
            // Проверка пароля
            const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isValidPassword) {
                console.log('❌ Invalid password for:', email);
                res.status(401).json({
                    success: false,
                    error: 'Неверный email или пароль'
                });
                return;
            }
            // Обновление времени последнего входа
            await user.update({ lastLogin: new Date() });
            // Создание JWT токена
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_ACCESS_SECRET || 'secret_key', { expiresIn: '7d' });
            console.log('✅ User logged in:', user.email);
            res.json({
                success: true,
                message: 'Вход выполнен успешно',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });
        }
        catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Ошибка при входе'
            });
        }
    }
    /**
     * Получение текущего пользователя
     */
    async getMe(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                res.status(401).json({
                    success: false,
                    error: 'Не авторизован'
                });
                return;
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || 'secret_key');
            const user = await User_1.default.findByPk(decoded.userId, {
                attributes: { exclude: ['passwordHash'] }
            });
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'Пользователь не найден'
                });
                return;
            }
            res.json({
                success: true,
                user
            });
        }
        catch (error) {
            console.error('Get me error:', error);
            res.status(401).json({
                success: false,
                error: 'Недействительный токен'
            });
        }
    }
}
exports.default = new AuthController();
//# sourceMappingURL=authController.js.map