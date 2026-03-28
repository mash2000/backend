import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import File from '../models/File';
import auditService from '../services/auditService';
import sequelize from '../config/database';

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
            const { name, avatar } = req.body;
            
            await req.user.update({ name, avatar });
            
            await auditService.log({
                userId: req.user.id,
                action: 'UPDATE_PROFILE',
                resourceType: 'user',
                resourceId: req.user.id,
                ip: req.ip || 'unknown',
                userAgent: req.get('user-agent') || 'unknown',
                timestamp: new Date()
            });

            res.json({
                message: 'Profile updated successfully',
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    name: req.user.name,
                    avatar: req.user.avatar
                }
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }

    async getStats(req: AuthRequest, res: Response): Promise<void> {
        try {
            const totalFiles = await File.count({ where: { userId: req.user.id } });
            
            // Получаем количество файлов по типам
            const filesByType = await File.findAll({
                where: { userId: req.user.id },
                attributes: [
                    'type',
                    [sequelize.fn('COUNT', sequelize.col('type')), 'count']
                ],
                group: ['type']
            });

            const recentFiles = await File.findAll({
                where: { userId: req.user.id },
                limit: 10,
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'name', 'type', 'size', 'createdAt']
            });

            res.json({
                totalFiles,
                storageUsed: req.user.storageUsed,
                storageLimit: req.user.storageLimit,
                storageUsedPercent: (req.user.storageUsed / req.user.storageLimit) * 100,
                filesByType,
                recentFiles
            });
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }
}