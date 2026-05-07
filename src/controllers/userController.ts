import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import File from '../models/File';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Настройка multer для загрузки аватаров
const avatarDir = path.join(__dirname, '../../uploads/avatars');

// Создаем директорию если не существует
if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed (JPEG, PNG, GIF, WEBP)'));
        }
    }
});

export class UserController {
    async getProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['passwordHash', 'encryptedMasterKey', 'keySalt', 'twoFactorSecret'] }
            });
            res.json({ user });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    }

    async updateProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, email } = req.body;
            
            // Проверяем, не занят ли email другим пользователем
            if (email && email !== req.user.email) {
                const existingUser = await User.findOne({ where: { email } });
                if (existingUser) {
                    res.status(400).json({ error: 'Email already in use' });
                    return;
                }
            }
            
            await req.user.update({ 
                name: name || req.user.name,
                email: email || req.user.email
            });
            
            res.json({ 
                success: true, 
                message: 'Profile updated successfully',
                user: {
                    id: req.user.id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role,
                    avatar: req.user.avatar,
                    createdAt: req.user.createdAt
                }
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }

    async getStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user.id;
            
            const totalFiles = await File.count({ where: { userId } });
            const totalSize = await File.sum('size', { where: { userId } }) || 0;
            
            const audioFiles = await File.count({ where: { userId, type: 'audio' } });
            const scoreFiles = await File.count({ where: { userId, type: 'score' } });
            const lyricsFiles = await File.count({ where: { userId, type: 'lyrics' } });
            const midiFiles = await File.count({ where: { userId, type: 'midi' } });
            
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const recentlyAdded = await File.count({ 
                where: { userId, createdAt: { [Op.gte]: weekAgo } } 
            });
            
            const favorites = await File.count({ where: { userId, favorite: true } });

            res.json({
                totalFiles,
                totalSize,
                audioFiles,
                scoreFiles,
                lyricsFiles,
                midiFiles,
                recentlyAdded,
                favorites,
                storageUsed: totalSize,
                storageLimit: req.user.storageLimit
            });
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }

    // Смена пароля
    async changePassword(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { currentPassword, newPassword } = req.body;
            
            if (!currentPassword || !newPassword) {
                res.status(400).json({ error: 'All fields are required' });
                return;
            }
            
            if (newPassword.length < 6) {
                res.status(400).json({ error: 'Password must be at least 6 characters' });
                return;
            }
            
            // Проверяем текущий пароль
            const isValid = await req.user.validatePassword(currentPassword);
            if (!isValid) {
                res.status(401).json({ error: 'Current password is incorrect' });
                return;
            }
            
            // Хешируем новый пароль
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // Обновляем пароль
            await req.user.update({ passwordHash: hashedPassword });
            
            res.json({ success: true, message: 'Password changed successfully' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Failed to change password' });
        }
    }

    // Обновление аватара
    async updateAvatar(req: AuthRequest, res: Response): Promise<void> {
        const upload = uploadAvatar.single('avatar');
        
        upload(req, res, async (err: any) => {
            if (err) {
                console.error('Avatar upload error:', err);
                res.status(400).json({ error: err.message });
                return;
            }
            
            try {
                const file = req.file;
                
                if (!file) {
                    res.status(400).json({ error: 'No file uploaded' });
                    return;
                }
                
                console.log('📸 Avatar upload:', {
                    fileName: file.filename,
                    size: file.size,
                    mimetype: file.mimetype
                });
                
                // Удаляем старый аватар если существует
                if (req.user.avatar) {
                    const oldAvatarPath = path.join(avatarDir, path.basename(req.user.avatar));
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);
                        console.log('🗑️ Old avatar deleted:', oldAvatarPath);
                    }
                }
                
                // Сохраняем путь к аватару
                const avatarUrl = `/uploads/avatars/${file.filename}`;
                await req.user.update({ avatar: avatarUrl });
                
                console.log('✅ Avatar updated successfully:', avatarUrl);
                
                res.json({ 
                    success: true, 
                    message: 'Avatar updated successfully',
                    avatar: avatarUrl
                });
            } catch (error) {
                console.error('Update avatar error:', error);
                res.status(500).json({ error: 'Failed to update avatar' });
            }
        });
    }
    
    // Удаление аватара
    async deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (req.user.avatar) {
                const avatarPath = path.join(avatarDir, path.basename(req.user.avatar));
                if (fs.existsSync(avatarPath)) {
                    fs.unlinkSync(avatarPath);
                    console.log('🗑️ Avatar deleted:', avatarPath);
                }
                await req.user.update({ avatar: null });
            }
            
            res.json({ success: true, message: 'Avatar deleted successfully' });
        } catch (error) {
            console.error('Delete avatar error:', error);
            res.status(500).json({ error: 'Failed to delete avatar' });
        }
    }
}