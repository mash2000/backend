"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const sequelize_1 = require("sequelize");
const File_1 = __importDefault(require("../models/File"));
const Tag_1 = require("../models/Tag");
// Создаем директории для загрузки
const uploadDir = path_1.default.join(__dirname, '../../uploads/temp');
const encryptedDir = path_1.default.join(__dirname, '../../uploads/encrypted');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
if (!fs_1.default.existsSync(encryptedDir)) {
    fs_1.default.mkdirSync(encryptedDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.pdf', '.mid', '.midi', '.txt', '.lyrics'];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error('File type not allowed'));
        }
    }
});
class FileController {
    async uploadFile(req, res) {
        const uploadSingle = upload.single('file');
        uploadSingle(req, res, async (err) => {
            if (err) {
                console.error('Multer error:', err);
                res.status(400).json({ error: err.message });
                return;
            }
            try {
                const file = req.file;
                const { name, isPublic, tags } = req.body;
                const user = req.user;
                console.log('Upload request:', {
                    fileName: file?.originalname,
                    userId: user?.id,
                    userEmail: user?.email
                });
                if (!file) {
                    res.status(400).json({ error: 'No file uploaded' });
                    return;
                }
                if (!user || !user.id) {
                    console.error('User not authenticated:', user);
                    res.status(401).json({ error: 'User not authenticated' });
                    return;
                }
                // Определяем тип файла по расширению
                const ext = path_1.default.extname(file.originalname).toLowerCase();
                let fileType = 'other';
                if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(ext)) {
                    fileType = 'audio';
                }
                else if (['.pdf', '.mscz', '.mscx'].includes(ext)) {
                    fileType = 'score';
                }
                else if (['.txt', '.lyrics'].includes(ext)) {
                    fileType = 'lyrics';
                }
                else if (['.mid', '.midi'].includes(ext)) {
                    fileType = 'midi';
                }
                // Извлекаем базовые метаданные из имени файла
                const fileName = path_1.default.basename(file.originalname, ext);
                const metadata = {
                    title: name || fileName,
                    size: file.size,
                    format: ext.substring(1).toUpperCase()
                };
                // Для аудио файлов пытаемся извлечь имя исполнителя из имени файла
                if (fileType === 'audio') {
                    const parts = fileName.split(/[-_]/);
                    if (parts.length >= 2) {
                        metadata.artist = parts[0].trim();
                        metadata.title = parts[1].trim();
                    }
                    // Оценочная длительность (примерно 1 МБ = 1 минута)
                    const sizeInMB = file.size / (1024 * 1024);
                    metadata.duration = Math.floor(sizeInMB * 60);
                }
                // Перемещаем файл в зашифрованную директорию
                const encryptedPath = path_1.default.join(encryptedDir, `${(0, uuid_1.v4)()}${ext}`);
                fs_1.default.copyFileSync(file.path, encryptedPath);
                // Парсим теги из JSON строки
                let tagArray = [];
                if (tags) {
                    try {
                        tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
                    }
                    catch {
                        tagArray = [];
                    }
                }
                // Сохраняем в базу данных
                const newFile = await File_1.default.create({
                    id: (0, uuid_1.v4)(),
                    userId: user.id,
                    name: name || file.originalname,
                    originalName: file.originalname,
                    type: fileType,
                    format: ext.substring(1).toUpperCase(),
                    size: file.size,
                    duration: metadata.duration,
                    path: `/uploads/encrypted/${path_1.default.basename(encryptedPath)}`,
                    encryptedPath: encryptedPath,
                    encryptionMetadata: { encrypted: true },
                    metadata: metadata,
                    isPublic: isPublic === 'true',
                    isProtected: true,
                    downloadCount: 0,
                    favorite: false
                });
                console.log('✅ File saved to database:', newFile.id);
                // Добавляем теги
                if (tagArray.length > 0) {
                    for (const tagName of tagArray) {
                        if (tagName && tagName.trim()) {
                            const [tag] = await Tag_1.Tag.findOrCreate({
                                where: { name: tagName.toLowerCase().trim() }
                            });
                            await Tag_1.FileTag.create({
                                fileId: newFile.id,
                                tagId: tag.id
                            });
                        }
                    }
                }
                // Обновляем использование хранилища пользователя
                const currentStorage = user.storageUsed || 0;
                await user.update({ storageUsed: currentStorage + file.size });
                // Удаляем временный файл
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
                console.log(`✅ File uploaded successfully: ${newFile.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) by ${user.email}`);
                // Формируем ответ с файлом
                const fileResponse = {
                    id: newFile.id,
                    name: newFile.name,
                    originalName: newFile.originalName,
                    type: newFile.type,
                    format: newFile.format,
                    size: newFile.size,
                    duration: newFile.duration,
                    createdAt: newFile.createdAt,
                    path: `http://localhost:5000${newFile.path}`,
                    tags: tagArray,
                    favorite: false,
                    protected: true,
                    metadata: metadata
                };
                res.status(201).json({
                    success: true,
                    message: 'File uploaded successfully',
                    file: fileResponse,
                    storageUsed: currentStorage + file.size,
                    storageLimit: user.storageLimit
                });
            }
            catch (error) {
                console.error('❌ Upload error:', error);
                console.error('Error stack:', error.stack);
                // Очищаем временный файл
                if (req.file && fs_1.default.existsSync(req.file.path)) {
                    fs_1.default.unlinkSync(req.file.path);
                }
                // Возвращаем понятную ошибку
                res.status(500).json({
                    success: false,
                    error: error.message || 'File upload failed',
                    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
                });
            }
        });
    }
    async getFiles(req, res) {
        try {
            const { page = 1, limit = 20, type, search, sort = 'createdAt', order = 'DESC' } = req.query;
            const where = { userId: req.user.id };
            if (type && type !== 'all' && type !== 'favorites') {
                where.type = type;
            }
            if (search) {
                where.name = { [sequelize_1.Op.iLike]: `%${search}%` };
            }
            let sortColumn = 'createdAt';
            if (sort === 'date')
                sortColumn = 'createdAt';
            else if (sort === 'name')
                sortColumn = 'name';
            else if (sort === 'size')
                sortColumn = 'size';
            else if (sort === 'type')
                sortColumn = 'type';
            const files = await File_1.default.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [[sortColumn, order]],
                attributes: { exclude: ['encryptionMetadata', 'encryptedPath'] }
            });
            const filesWithUrl = files.rows.map(file => {
                const fileData = file.toJSON();
                fileData.path = `http://localhost:5000${fileData.path}`;
                return fileData;
            });
            res.json({
                files: filesWithUrl,
                total: files.count,
                page: parseInt(page),
                totalPages: Math.ceil(files.count / parseInt(limit))
            });
        }
        catch (error) {
            console.error('Get files error:', error);
            res.status(500).json({ error: 'Failed to retrieve files' });
        }
    }
    async getFileById(req, res) {
        try {
            const { id } = req.params;
            const file = await File_1.default.findOne({
                where: { id, userId: req.user.id }
            });
            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }
            const fileData = file.toJSON();
            fileData.path = `http://localhost:5000${fileData.path}`;
            res.json({ file: fileData });
        }
        catch (error) {
            console.error('Get file error:', error);
            res.status(500).json({ error: 'Failed to retrieve file' });
        }
    }
    // ✅ УДАЛЕНИЕ ФАЙЛА - физически и из БД (полное удаление)
    async deleteFile(req, res) {
        try {
            const { id } = req.params;
            console.log(`🗑️ Deleting file: ${id} by user: ${req.user.id}`);
            // Находим файл в базе данных (включая soft-deleted)
            const file = await File_1.default.findOne({
                where: { id, userId: req.user.id },
                paranoid: false // Включаем поиск soft-deleted записей
            });
            if (!file) {
                console.log(`❌ File not found: ${id}`);
                res.status(404).json({ error: 'File not found' });
                return;
            }
            console.log(`📁 File info:`, {
                id: file.id,
                name: file.name,
                path: file.path,
                encryptedPath: file.encryptedPath,
                deletedAt: file.deletedAt
            });
            // 1. Удаляем физический файл из директории encrypted
            if (file.encryptedPath && fs_1.default.existsSync(file.encryptedPath)) {
                try {
                    fs_1.default.unlinkSync(file.encryptedPath);
                    console.log(`✅ Deleted encrypted file: ${file.encryptedPath}`);
                }
                catch (err) {
                    console.error(`❌ Failed to delete encrypted file: ${err}`);
                }
            }
            else {
                console.log(`⚠️ Encrypted file not found: ${file.encryptedPath}`);
            }
            // 2. Удаляем временный файл если существует
            if (file.path && fs_1.default.existsSync(file.path) && file.path !== file.encryptedPath) {
                try {
                    fs_1.default.unlinkSync(file.path);
                    console.log(`✅ Deleted temp file: ${file.path}`);
                }
                catch (err) {
                    console.error(`❌ Failed to delete temp file: ${err}`);
                }
            }
            // 3. Удаляем связи с тегами
            await Tag_1.FileTag.destroy({ where: { fileId: file.id }, force: true });
            console.log(`✅ Deleted file-tag relations`);
            // 4. Обновляем использование хранилища пользователя
            const currentStorage = req.user.storageUsed || 0;
            const newStorage = Math.max(0, currentStorage - file.size);
            await req.user.update({ storageUsed: newStorage });
            console.log(`✅ Updated user storage: ${currentStorage} -> ${newStorage}`);
            // 5. ПОЛНОЕ УДАЛЕНИЕ из базы данных (force: true - игнорирует paranoid)
            await file.destroy({ force: true });
            console.log(`✅ Permanently deleted database record`);
            console.log(`✅ File fully deleted: ${file.name}`);
            res.json({
                success: true,
                message: 'File deleted successfully',
                storageUsed: newStorage
            });
        }
        catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({ error: 'Failed to delete file' });
        }
    }
    async updateFileMetadata(req, res) {
        try {
            const { id } = req.params;
            const { name, tags, isPublic, favorite, metadata } = req.body;
            const file = await File_1.default.findOne({
                where: { id, userId: req.user.id }
            });
            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }
            if (name)
                file.name = name;
            if (isPublic !== undefined)
                file.isPublic = isPublic;
            if (favorite !== undefined)
                file.favorite = favorite;
            if (metadata)
                file.metadata = { ...file.metadata, ...metadata };
            if (tags && Array.isArray(tags)) {
                await Tag_1.FileTag.destroy({ where: { fileId: file.id } });
                for (const tagName of tags) {
                    if (tagName && tagName.trim()) {
                        const [tag] = await Tag_1.Tag.findOrCreate({
                            where: { name: tagName.toLowerCase().trim() }
                        });
                        await Tag_1.FileTag.create({
                            fileId: file.id,
                            tagId: tag.id
                        });
                    }
                }
            }
            await file.save();
            const updatedFile = await File_1.default.findOne({
                where: { id: file.id }
            });
            const fileData = updatedFile?.toJSON();
            if (fileData) {
                fileData.path = `http://localhost:5000${fileData.path}`;
            }
            res.json({ success: true, message: 'File updated successfully', file: fileData });
        }
        catch (error) {
            console.error('Update error:', error);
            res.status(500).json({ error: 'Failed to update file' });
        }
    }
    async downloadFile(req, res) {
        try {
            const { id } = req.params;
            const file = await File_1.default.findOne({
                where: { id, userId: req.user.id }
            });
            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }
            if (!fs_1.default.existsSync(file.encryptedPath)) {
                res.status(404).json({ error: 'File not found on server' });
                return;
            }
            await file.update({
                downloadCount: (file.downloadCount || 0) + 1,
                lastAccessed: new Date()
            });
            res.download(file.encryptedPath, file.originalName);
        }
        catch (error) {
            console.error('Download error:', error);
            res.status(500).json({ error: 'Failed to download file' });
        }
    }
}
exports.FileController = FileController;
exports.default = new FileController();
//# sourceMappingURL=fileController.js.map