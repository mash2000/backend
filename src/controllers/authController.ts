import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import User from '../models/User';
import jwtService from '../services/jwtService';
import encryptionService from '../services/encryptionService';

// Временное хранилище для токенов сброса пароля (в продакшене используйте Redis)
const resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

export class AuthController {
    /**
     * Проверка сложности пароля
     */
    private checkPasswordStrength(password: string): { isValid: boolean; message?: string } {
        const checks = [
            { condition: password.length >= 8, message: 'Пароль должен содержать минимум 8 символов' },
            { condition: /[A-Z]/.test(password), message: 'Пароль должен содержать хотя бы одну заглавную букву' },
            { condition: /[a-z]/.test(password), message: 'Пароль должен содержать хотя бы одну строчную букву' },
            { condition: /[0-9]/.test(password), message: 'Пароль должен содержать хотя бы одну цифру' },
            { condition: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: 'Пароль должен содержать хотя бы один специальный символ' }
        ];

        for (const check of checks) {
            if (!check.condition) {
                return { isValid: false, message: check.message };
            }
        }

        return { isValid: true };
    }

    /**
     * Регистрация пользователя
     */
    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, name } = req.body;

            // Проверка на существующего пользователя
            const existingUser = await User.findOne({ 
                where: { 
                    [Op.or]: [
                        { email: email.toLowerCase() }
                    ]
                } 
            });
            
            if (existingUser) {
                res.status(400).json({ 
                    error: 'Пользователь с таким email уже существует',
                    field: 'email'
                });
                return;
            }

            // Проверка сложности пароля
            const passwordStrength = this.checkPasswordStrength(password);
            if (!passwordStrength.isValid) {
                res.status(400).json({ 
                    error: passwordStrength.message,
                    field: 'password'
                });
                return;
            }

            // Хеширование пароля
            const saltRounds = parseInt(process.env.SALT_ROUNDS || '10');
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Генерация мастер-ключа для пользователя
            const masterKey = encryptionService.generateKey();
            const salt = encryptionService.generateSalt();
            const encryptedMasterKey = encryptionService.encryptKey(
                masterKey,
                encryptionService.deriveKeyFromPassword(password, salt)
            );

            // Создание пользователя
            const user = await User.create({
                id: uuidv4(),
                email: email.toLowerCase(),
                passwordHash,
                name: name.trim(),
                encryptedMasterKey,
                keySalt: salt.toString('hex'),
                storageLimit: 1073741824 // 1 GB для обычных пользователей
            });

            // Генерация токенов
            const tokens = jwtService.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role
            });

            console.log(`✅ New user registered: ${user.email} (${user.id})`);

            res.status(201).json({
                success: true,
                message: 'Регистрация успешно завершена',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    storageUsed: user.storageUsed,
                    storageLimit: user.storageLimit
                },
                ...tokens
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ 
                error: 'Ошибка при регистрации. Пожалуйста, попробуйте позже.'
            });
        }
    }

    /**
     * Вход в систему
     */
    async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = req.body;

            // Поиск пользователя
            const user = await User.findOne({ 
                where: { 
                    email: email.toLowerCase(),
                    isActive: true
                } 
            });

            if (!user) {
                res.status(401).json({ 
                    error: 'Неверный email или пароль',
                    field: 'email'
                });
                return;
            }

            // Проверка пароля
            const isValidPassword = await user.validatePassword(password);
            if (!isValidPassword) {
                console.warn(`❌ Failed login attempt for: ${user.email}`);
                res.status(401).json({ 
                    error: 'Неверный email или пароль',
                    field: 'password'
                });
                return;
            }

            // Обновление времени последнего входа
            await user.update({ lastLogin: new Date() });

            // Генерация токенов
            const tokens = jwtService.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role
            });

            console.log(`✅ User logged in: ${user.email} (${user.id})`);

            res.json({
                success: true,
                message: 'Вход выполнен успешно',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    storageUsed: user.storageUsed,
                    storageLimit: user.storageLimit
                },
                ...tokens
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                error: 'Ошибка при входе. Пожалуйста, попробуйте позже.'
            });
        }
    }

    /**
     * Обновление токена
     */
    async refreshToken(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                res.status(401).json({ error: 'Refresh token не предоставлен' });
                return;
            }

            const payload = jwtService.verifyRefreshToken(refreshToken);
            if (!payload) {
                res.status(401).json({ error: 'Недействительный refresh token' });
                return;
            }

            const user = await User.findByPk(payload.userId);
            if (!user || !user.isActive) {
                res.status(401).json({ error: 'Пользователь не найден' });
                return;
            }

            const tokens = jwtService.generateTokens({
                userId: user.id,
                email: user.email,
                role: user.role
            });

            res.json(tokens);
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({ error: 'Ошибка обновления токена' });
        }
    }

    /**
     * Выход из системы
     */
    async logout(req: Request, res: Response): Promise<void> {
        res.json({ 
            success: true,
            message: 'Выход выполнен успешно' 
        });
    }

    /**
     * Смена пароля
     */
    async changePassword(req: Request, res: Response): Promise<void> {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = (req as any).user.id;

            const user = await User.findByPk(userId);
            if (!user) {
                res.status(404).json({ error: 'Пользователь не найден' });
                return;
            }

            // Проверка текущего пароля
            const isValid = await user.validatePassword(currentPassword);
            if (!isValid) {
                res.status(401).json({ 
                    error: 'Неверный текущий пароль',
                    field: 'currentPassword'
                });
                return;
            }

            // Проверка сложности нового пароля
            const passwordStrength = this.checkPasswordStrength(newPassword);
            if (!passwordStrength.isValid) {
                res.status(400).json({ 
                    error: passwordStrength.message,
                    field: 'newPassword'
                });
                return;
            }

            // Хеширование нового пароля
            const newPasswordHash = await bcrypt.hash(newPassword, 10);
            await user.update({ passwordHash: newPasswordHash });

            // Перешифровка мастер-ключа с новым паролем
            const masterKey = encryptionService.decryptKey(
                user.encryptedMasterKey!,
                encryptionService.deriveKeyFromPassword(currentPassword, Buffer.from(user.keySalt!, 'hex'))
            );

            const newSalt = encryptionService.generateSalt();
            const newEncryptedMasterKey = encryptionService.encryptKey(
                masterKey,
                encryptionService.deriveKeyFromPassword(newPassword, newSalt)
            );

            await user.update({
                encryptedMasterKey: newEncryptedMasterKey,
                keySalt: newSalt.toString('hex')
            });

            res.json({ 
                success: true,
                message: 'Пароль успешно изменен' 
            });
        } catch (error) {
            console.error('Password change error:', error);
            res.status(500).json({ error: 'Ошибка смены пароля' });
        }
    }

    /**
     * Проверка email на существование
     */
    async checkEmail(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.query;
            
            if (!email) {
                res.status(400).json({ error: 'Email не указан' });
                return;
            }

            const user = await User.findOne({ 
                where: { email: (email as string).toLowerCase() } 
            });

            res.json({ 
                exists: !!user,
                available: !user
            });
        } catch (error) {
            res.status(500).json({ error: 'Ошибка проверки email' });
        }
    }

    /**
     * Запрос на восстановление пароля
     */
    async forgotPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email) {
                res.status(400).json({ error: 'Email обязателен' });
                return;
            }

            // Поиск пользователя
            const user = await User.findOne({ 
                where: { email: email.toLowerCase() } 
            });

            // Для безопасности не сообщаем, существует ли пользователь
            if (!user) {
                res.json({ 
                    message: 'Если пользователь существует, инструкции отправлены на email' 
                });
                return;
            }

            // Генерация токена сброса
            const resetToken = uuidv4();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // Токен действителен 1 час

            resetTokens.set(resetToken, {
                userId: user.id,
                expiresAt
            });

            console.log(`🔐 Reset token for ${user.email}: ${resetToken}`);
            console.log(`📝 Reset link: http://localhost:3000/reset-password/${resetToken}`);

            res.json({ 
                message: 'Если пользователь существует, инструкции отправлены на email',
                ...(process.env.NODE_ENV === 'development' && { resetToken })
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ error: 'Ошибка при отправке инструкций' });
        }
    }

    /**
     * Сброс пароля
     */
    async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { token, password } = req.body;

            if (!token || !password) {
                res.status(400).json({ error: 'Токен и пароль обязательны' });
                return;
            }

            // Проверка сложности пароля
            const passwordStrength = this.checkPasswordStrength(password);
            if (!passwordStrength.isValid) {
                res.status(400).json({ 
                    error: passwordStrength.message,
                    field: 'password'
                });
                return;
            }

            // Поиск токена
            const resetData = resetTokens.get(token);
            if (!resetData) {
                res.status(400).json({ error: 'Недействительный или просроченный токен' });
                return;
            }

            // Проверка срока действия
            if (resetData.expiresAt < new Date()) {
                resetTokens.delete(token);
                res.status(400).json({ error: 'Токен истек. Запросите сброс пароля заново' });
                return;
            }

            // Поиск пользователя
            const user = await User.findByPk(resetData.userId);
            if (!user) {
                res.status(404).json({ error: 'Пользователь не найден' });
                return;
            }

            // Хеширование нового пароля
            const saltRounds = parseInt(process.env.SALT_ROUNDS || '10');
            const newPasswordHash = await bcrypt.hash(password, saltRounds);

            // Генерация нового мастер-ключа (при сбросе пароля старый пароль неизвестен)
            const newMasterKey = encryptionService.generateKey();
            const newSalt = encryptionService.generateSalt();
            const newEncryptedMasterKey = encryptionService.encryptKey(
                newMasterKey,
                encryptionService.deriveKeyFromPassword(password, newSalt)
            );

            // Обновление пользователя
            await user.update({
                passwordHash: newPasswordHash,
                encryptedMasterKey: newEncryptedMasterKey,
                keySalt: newSalt.toString('hex')
            });

            // Удаление использованного токена
            resetTokens.delete(token);

            console.log(`✅ Password reset successful for: ${user.email}`);

            res.json({ 
                success: true,
                message: 'Пароль успешно изменен' 
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Ошибка при сбросе пароля' });
        }
    }
}