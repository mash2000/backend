import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

class AuthController {
    /**
     * Регистрация пользователя
     */
    async register(req: Request, res: Response): Promise<void> {
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

            const existingUser = await User.findOne({ 
                where: { email: email.toLowerCase() } 
            });
            
            if (existingUser) {
                res.status(400).json({ 
                    success: false,
                    error: 'Пользователь уже существует' 
                });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                id: uuidv4(),
                email: email.toLowerCase(),
                passwordHash: hashedPassword,
                name: name.trim(),
                storageLimit: 1073741824
            });

            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_ACCESS_SECRET || 'secret_key',
                { expiresIn: '7d' }
            );

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
        } catch (error: any) {
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
    async login(req: Request, res: Response): Promise<void> {
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
            const user = await User.findOne({ 
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
            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
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
            const token = jwt.sign(
                { userId: user.id, email: user.email, role: user.role },
                process.env.JWT_ACCESS_SECRET || 'secret_key',
                { expiresIn: '7d' }
            );

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
        } catch (error: any) {
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
    async getMe(req: Request, res: Response): Promise<void> {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                res.status(401).json({ 
                    success: false,
                    error: 'Не авторизован' 
                });
                return;
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret_key') as any;
            
            const user = await User.findByPk(decoded.userId, {
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
        } catch (error) {
            console.error('Get me error:', error);
            res.status(401).json({ 
                success: false,
                error: 'Недействительный токен' 
            });
        }
    }
}

export default new AuthController();