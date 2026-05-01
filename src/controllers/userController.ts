import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import File from '../models/File';
import sequelize from '../config/database';

export class UserController {
    async getProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['passwordHash', 'encryptedMasterKey', 'keySalt'] }
            });
            res.json({ user });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    }

    async updateProfile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { name, avatar } = req.body;
            await req.user.update({ name, avatar });
            res.json({ message: 'Profile updated successfully', user: req.user });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }

    async getStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user.id;
            
            // Общая статистика
            const totalFiles = await File.count({ where: { userId } });
            const totalSize = await File.sum('size', { where: { userId } }) || 0;
            
            // Статистика по типам файлов
            const audioFiles = await File.count({ where: { userId, type: 'audio' } });
            const scoreFiles = await File.count({ where: { userId, type: 'score' } });
            const lyricsFiles = await File.count({ where: { userId, type: 'lyrics' } });
            const midiFiles = await File.count({ where: { userId, type: 'midi' } });
            
            // Недавно добавленные (за последние 7 дней)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const recentlyAdded = await File.count({ 
                where: { 
                    userId, 
                    createdAt: { [Op.gte]: weekAgo } 
                } 
            });
            
            // Избранные файлы
            const favorites = await File.count({ where: { userId, favorite: true } });

            console.log('Stats for user', userId, {
                totalFiles,
                audioFiles,
                scoreFiles,
                lyricsFiles,
                midiFiles,
                storageUsed: totalSize,
                storageLimit: req.user.storageLimit
            });

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
}