import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import File from '../models/File';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database';
import path from 'path';
import fs from 'fs';

export class AdminController {
    private checkAdmin(req: AuthRequest, res: Response): boolean {
        if (req.user.role !== 'admin') {
            res.status(403).json({ error: 'Access denied. Admin rights required.' });
            return false;
        }
        return true;
    }

    // Получение всех пользователей
    async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
        if (!this.checkAdmin(req, res)) return;
        
        try {
            const { page = 1, limit = 20, search, role, isActive } = req.query;
            
            const where: any = {};
            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } }
                ];
            }
            if (role) where.role = role;
            if (isActive !== undefined) where.isActive = isActive === 'true';
            
            const users = await User.findAndCountAll({
                where,
                attributes: { exclude: ['passwordHash', 'encryptedMasterKey', 'keySalt', 'twoFactorSecret'] },
                limit: parseInt(limit as string),
                offset: (parseInt(page as string) - 1) * parseInt(limit as string),
                order: [['createdAt', 'DESC']],
                paranoid: false
            });
            
            // Получаем статистику для каждого пользователя
            const usersWithStats = await Promise.all(users.rows.map(async (user) => {
                // Правильный подсчет размера всех файлов пользователя - ИСПРАВЛЕНО
                const totalSizeResult = await File.findOne({
                    where: { userId: user.id },
                    attributes: [[sequelize.fn('SUM', sequelize.col('size')), 'totalSize']],
                    raw: true,
                    paranoid: false
                });
                
                const fileCount = await File.count({ where: { userId: user.id }, paranoid: false });
                // Исправлено: используем правильное обращение к результату
                const totalSize = totalSizeResult && typeof totalSizeResult === 'object' 
                    ? Number((totalSizeResult as any).totalSize || 0) 
                    : 0;
                
                // Формируем URL аватара
                let avatarUrl = null;
                if (user.avatar) {
                    avatarUrl = user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`;
                }
                
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    storageUsed: totalSize,
                    storageLimit: user.storageLimit,
                    fileCount,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin,
                    deletedAt: user.deletedAt,
                    avatar: avatarUrl
                };
            }));
            
            res.json({
                users: usersWithStats,
                total: users.count,
                page: parseInt(page as string),
                totalPages: Math.ceil(users.count / parseInt(limit as string))
            });
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({ error: 'Failed to get users' });
        }
    }

    // Получение пользователя по ID
    async getUserById(req: AuthRequest, res: Response): Promise<void> {
        if (!this.checkAdmin(req, res)) return;
        
        try {
            const { id } = req.params;
            const user = await User.findByPk(id, {
                attributes: { exclude: ['passwordHash', 'encryptedMasterKey', 'keySalt', 'twoFactorSecret'] },
                paranoid: false
            });
            
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            
            const fileCount = await File.count({ where: { userId: user.id }, paranoid: false });
            const totalSizeResult = await File.findOne({
                where: { userId: user.id },
                attributes: [[sequelize.fn('SUM', sequelize.col('size')), 'totalSize']],
                raw: true,
                paranoid: false
            });
            const totalSize = totalSizeResult && typeof totalSizeResult === 'object' 
                ? Number((totalSizeResult as any).totalSize || 0) 
                : 0;
                
            const files = await File.findAll({
                where: { userId: user.id },
                limit: 10,
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'name', 'type', 'size', 'createdAt'],
                paranoid: false
            });
            
            let avatarUrl = null;
            if (user.avatar) {
                avatarUrl = user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`;
            }
            
            res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    storageUsed: totalSize,
                    storageLimit: user.storageLimit,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin,
                    avatar: avatarUrl
                },
                stats: { fileCount, totalSize },
                recentFiles: files
            });
        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({ error: 'Failed to get user' });
        }
    }

    // Создание пользователя
    async createUser(req: AuthRequest, res: Response): Promise<void> {
        if (!this.checkAdmin(req, res)) return;
        
        try {
            const { email, password, name, role, storageLimit } = req.body;
            
            if (!email || !password || !name) {
                res.status(400).json({ error: 'Email, password and name are required' });
                return;
            }
            
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                res.status(400).json({ error: 'User with this email already exists' });
                return;
            }
            
            const passwordHash = await bcrypt.hash(password, 10);
            
            const user = await User.create({
                id: uuidv4(),
                email,
                passwordHash,
                name,
                role: role || 'user',
                storageLimit: storageLimit || 1073741824
            });
            
            res.status(201).json({
                message: 'User created successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    storageLimit: user.storageLimit,
                    createdAt: user.createdAt
                }
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    }

    // Обновление пользователя
    async updateUser(req: AuthRequest, res: Response): Promise<void> {
        if (!this.checkAdmin(req, res)) return;
        
        try {
            const { id } = req.params;
            const { name, email, role, isActive, storageLimit } = req.body;
            
            const user = await User.findByPk(id);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            
            if (email && email !== user.email) {
                const existingUser = await User.findOne({ where: { email } });
                if (existingUser) {
                    res.status(400).json({ error: 'Email already in use' });
                    return;
                }
            }
            
            await user.update({
                name: name || user.name,
                email: email || user.email,
                role: role || user.role,
                isActive: isActive !== undefined ? isActive : user.isActive,
                storageLimit: storageLimit || user.storageLimit
            });
            
            res.json({
                message: 'User updated successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                    storageLimit: user.storageLimit,
                    createdAt: user.createdAt
                }
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    }

    // Сброс пароля пользователя
    async resetUserPassword(req: AuthRequest, res: Response): Promise<void> {
        if (!this.checkAdmin(req, res)) return;
        
        try {
            const { id } = req.params;
            const { newPassword } = req.body;
            
            if (!newPassword || newPassword.length < 6) {
                res.status(400).json({ error: 'Password must be at least 6 characters' });
                return;
            }
            
            const user = await User.findByPk(id);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            
            const passwordHash = await bcrypt.hash(newPassword, 10);
            await user.update({ passwordHash });
            
            res.json({ message: 'Password reset successfully' });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }

    // Удаление пользователя
    async deleteUser(req: AuthRequest, res: Response): Promise<void> {
        if (!this.checkAdmin(req, res)) return;
        
        try {
            const { id } = req.params;
            
            if (id === req.user.id) {
                res.status(400).json({ error: 'Cannot delete your own account' });
                return;
            }
            
            const user = await User.findByPk(id, { paranoid: false });
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            
            console.log(`🗑️ Администратор удаляет пользователя: ${user.email} (${user.id})`);
            
            // Получаем все файлы пользователя
            const files = await File.findAll({ where: { userId: id }, paranoid: false });
            console.log(`📁 Найдено файлов: ${files.length}`);
            
            // Удаляем физические файлы с диска
            for (const file of files) {
                try {
                    if (file.encryptedPath && fs.existsSync(file.encryptedPath)) {
                        fs.unlinkSync(file.encryptedPath);
                        console.log(`✅ Удален файл: ${file.encryptedPath}`);
                    }
                    if (file.path && fs.existsSync(file.path) && file.path !== file.encryptedPath) {
                        fs.unlinkSync(file.path);
                        console.log(`✅ Удален временный файл: ${file.path}`);
                    }
                } catch (err) {
                    console.error(`❌ Ошибка удаления файла ${file.id}:`, err);
                }
            }
            
            // Удаляем связи с тегами
            await sequelize.query(`DELETE FROM file_tags WHERE "fileId" IN (SELECT id FROM files WHERE user_id = :userId)`, {
                replacements: { userId: id }
            });
            console.log(`✅ Удалены связи тегов`);
            
            // Удаляем все файлы пользователя из БД
            await File.destroy({ where: { userId: id }, force: true });
            console.log(`✅ Удалены файлы пользователя из БД`);
            
            // Удаляем аватар пользователя если есть
            if (user.avatar) {
                const avatarPath = path.join(__dirname, '../../uploads/avatars', path.basename(user.avatar));
                if (fs.existsSync(avatarPath)) {
                    fs.unlinkSync(avatarPath);
                    console.log(`✅ Удален аватар: ${avatarPath}`);
                }
            }
            
            // Полное физическое удаление пользователя из БД
            await user.destroy({ force: true });
            console.log(`✅ Пользователь ${user.email} полностью удален из БД`);
            
            res.json({ 
                message: 'User and all associated data permanently deleted',
                deletedFiles: files.length
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }

    // Получение системной статистики
    async getSystemStats(req: AuthRequest, res: Response): Promise<void> {
        if (!this.checkAdmin(req, res)) return;
        
        try {
            const totalUsers = await User.count({ paranoid: false });
            const activeUsers = await User.count({ where: { isActive: true }, paranoid: false });
            const totalFiles = await File.count({ paranoid: false });
            
            // Правильный подсчет общего объема всех файлов - ИСПРАВЛЕНО
            const totalSizeResult = await File.findOne({
                attributes: [[sequelize.fn('SUM', sequelize.col('size')), 'totalSize']],
                raw: true,
                paranoid: false
            });
            const totalSize = totalSizeResult && typeof totalSizeResult === 'object' 
                ? Number((totalSizeResult as any).totalSize || 0) 
                : 0;
            
            // Статистика по ролям с правильными названиями
            const adminCount = await User.count({ where: { role: 'admin' }, paranoid: false });
            const userCount = await User.count({ where: { role: 'user' }, paranoid: false });
            
            const usersByRole = [
                { role: 'admin', count: adminCount, label: '👑 Администраторы' },
                { role: 'user', count: userCount, label: '👤 Пользователи' }
            ];
            
            // Статистика по типам файлов
            const audioFiles = await File.count({ where: { type: 'audio' }, paranoid: false });
            const scoreFiles = await File.count({ where: { type: 'score' }, paranoid: false });
            const lyricsFiles = await File.count({ where: { type: 'lyrics' }, paranoid: false });
            const midiFiles = await File.count({ where: { type: 'midi' }, paranoid: false });
            const otherFiles = await File.count({ where: { type: 'other' }, paranoid: false });
            
            const filesByType = [
                { type: 'audio', count: audioFiles, label: '🎵 Аудио' },
                { type: 'score', count: scoreFiles, label: '📄 Ноты' },
                { type: 'lyrics', count: lyricsFiles, label: '📝 Тексты' },
                { type: 'midi', count: midiFiles, label: '🎹 MIDI' },
                { type: 'other', count: otherFiles, label: '📁 Другие' }
            ];
            
            // Недавние пользователи
            const recentUsers = await User.findAll({
                limit: 5,
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'name', 'email', 'role', 'createdAt', 'avatar'],
                paranoid: false
            });
            
            const recentUsersWithAvatars = recentUsers.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                avatar: user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`) : null
            }));
            
            res.json({
                totalUsers,
                activeUsers,
                totalFiles,
                totalSize,
                usersByRole,
                filesByType,
                recentUsers: recentUsersWithAvatars
            });
        } catch (error) {
            console.error('Get system stats error:', error);
            res.status(500).json({ error: 'Failed to get system stats' });
        }
    }
}

export default AdminController;