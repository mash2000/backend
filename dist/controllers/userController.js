"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../models/User"));
const File_1 = __importDefault(require("../models/File"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
// Настройка multer для загрузки аватаров
const avatarDir = path_1.default.join(__dirname, '../../uploads/avatars');
if (!fs_1.default.existsSync(avatarDir)) {
    fs_1.default.mkdirSync(avatarDir, { recursive: true });
}
const avatarStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const uniqueName = `${(0, uuid_1.v4)()}${ext}`;
        cb(null, uniqueName);
    }
});
const uploadAvatar = (0, multer_1.default)({
    storage: avatarStorage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only images are allowed'));
        }
    }
});
class UserController {
    async getProfile(req, res) {
        try {
            const user = await User_1.default.findByPk(req.user.id, {
                attributes: { exclude: ['passwordHash', 'encryptedMasterKey', 'keySalt', 'twoFactorSecret'] }
            });
            res.json({ user });
        }
        catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    }
    async updateProfile(req, res) {
        try {
            const { name, email } = req.body;
            if (email && email !== req.user.email) {
                const existingUser = await User_1.default.findOne({ where: { email } });
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
        }
        catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }
    async getStats(req, res) {
        try {
            const userId = req.user.id;
            const totalFiles = await File_1.default.count({ where: { userId } });
            const totalSize = await File_1.default.sum('size', { where: { userId } }) || 0;
            const audioFiles = await File_1.default.count({ where: { userId, type: 'audio' } });
            const scoreFiles = await File_1.default.count({ where: { userId, type: 'score' } });
            const lyricsFiles = await File_1.default.count({ where: { userId, type: 'lyrics' } });
            const midiFiles = await File_1.default.count({ where: { userId, type: 'midi' } });
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const recentlyAdded = await File_1.default.count({
                where: { userId, createdAt: { [sequelize_1.Op.gte]: weekAgo } }
            });
            const favorites = await File_1.default.count({ where: { userId, favorite: true } });
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
        }
        catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }
    // ✅ Смена пароля
    async changePassword(req, res) {
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
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            // Обновляем пароль
            await req.user.update({ passwordHash: hashedPassword });
            console.log(`✅ Password changed for user: ${req.user.email}`);
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        }
        catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Failed to change password' });
        }
    }
    // Обновление аватара
    async updateAvatar(req, res) {
        const upload = uploadAvatar.single('avatar');
        upload(req, res, async (err) => {
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
                if (req.user.avatar) {
                    const oldAvatarPath = path_1.default.join(avatarDir, path_1.default.basename(req.user.avatar));
                    if (fs_1.default.existsSync(oldAvatarPath)) {
                        fs_1.default.unlinkSync(oldAvatarPath);
                    }
                }
                const avatarUrl = `/uploads/avatars/${file.filename}`;
                await req.user.update({ avatar: avatarUrl });
                res.json({
                    success: true,
                    message: 'Avatar updated successfully',
                    avatar: avatarUrl
                });
            }
            catch (error) {
                console.error('Update avatar error:', error);
                res.status(500).json({ error: 'Failed to update avatar' });
            }
        });
    }
    // Удаление аватара
    async deleteAvatar(req, res) {
        try {
            if (req.user.avatar) {
                const avatarPath = path_1.default.join(avatarDir, path_1.default.basename(req.user.avatar));
                if (fs_1.default.existsSync(avatarPath)) {
                    fs_1.default.unlinkSync(avatarPath);
                }
                await req.user.update({ avatar: null });
            }
            res.json({ success: true, message: 'Avatar deleted successfully' });
        }
        catch (error) {
            console.error('Delete avatar error:', error);
            res.status(500).json({ error: 'Failed to delete avatar' });
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=userController.js.map