import { Response } from 'express';
import { Op } from 'sequelize';
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
            
            console.log('📊 Getting stats for user:', userId);
            
            // Параллельные запросы для лучшей производительности
            const [
                totalFilesResult,
                totalSizeResult,
                audioFilesResult,
                scoreFilesResult,
                lyricsFilesResult,
                midiFilesResult,
                recentlyAddedResult,
                favoritesResult
            ] = await Promise.all([
                File.count({ where: { userId } }),
                File.sum('size', { where: { userId } }),
                File.count({ where: { userId, type: 'audio' } }),
                File.count({ where: { userId, type: 'score' } }),
                File.count({ where: { userId, type: 'lyrics' } }),
                File.count({ where: { userId, type: 'midi' } }),
                File.count({ 
                    where: { 
                        userId, 
                        createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
                    } 
                }),
                File.count({ where: { userId, favorite: true } })
            ]);
            
            const stats = {
                totalFiles: totalFilesResult || 0,
                totalSize: totalSizeResult || 0,
                audioFiles: audioFilesResult || 0,
                scoreFiles: scoreFilesResult || 0,
                lyricsFiles: lyricsFilesResult || 0,
                midiFiles: midiFilesResult || 0,
                recentlyAdded: recentlyAddedResult || 0,
                favorites: favoritesResult || 0,
                storageUsed: totalSizeResult || 0,
                storageLimit: req.user.storageLimit
            };

            console.log('📊 Stats calculated:', stats);

            res.json(stats);
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }
}