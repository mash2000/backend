import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import File from '../models/File';
import { Tag, FileTag } from '../models/Tag';
import { AuthRequest } from '../middleware/auth';

// Создаем директории для загрузки
const uploadDir = path.join(__dirname, '../../uploads/temp');
const encryptedDir = path.join(__dirname, '../../uploads/encrypted');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(encryptedDir)) {
    fs.mkdirSync(encryptedDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.pdf', '.mid', '.midi', '.txt', '.lyrics'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'));
        }
    }
});

export class FileController {
    async uploadFile(req: AuthRequest, res: Response): Promise<void> {
        const uploadSingle = upload.single('file');

        uploadSingle(req, res, async (err: any) => {
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
                const ext = path.extname(file.originalname).toLowerCase();
                let fileType: 'audio' | 'score' | 'lyrics' | 'midi' | 'other' = 'other';
                
                if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(ext)) {
                    fileType = 'audio';
                } else if (['.pdf', '.mscz', '.mscx'].includes(ext)) {
                    fileType = 'score';
                } else if (['.txt', '.lyrics'].includes(ext)) {
                    fileType = 'lyrics';
                } else if (['.mid', '.midi'].includes(ext)) {
                    fileType = 'midi';
                }

                // Извлекаем базовые метаданные из имени файла
                const fileName = path.basename(file.originalname, ext);
                const metadata: any = {
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
                const encryptedPath = path.join(encryptedDir, `${uuidv4()}${ext}`);
                fs.copyFileSync(file.path, encryptedPath);

                // Парсим теги из JSON строки
                let tagArray: string[] = [];
                if (tags) {
                    try {
                        tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
                    } catch {
                        tagArray = [];
                    }
                }

                // Сохраняем в базу данных
                const newFile = await File.create({
                    id: uuidv4(),
                    userId: user.id,
                    name: name || file.originalname,
                    originalName: file.originalname,
                    type: fileType,
                    format: ext.substring(1).toUpperCase(),
                    size: file.size,
                    duration: metadata.duration,
                    path: `/uploads/encrypted/${path.basename(encryptedPath)}`,
                    encryptedPath: encryptedPath,
                    encryptionMetadata: { encrypted: true },
                    metadata: metadata,
                    isPublic: isPublic === 'true',
                    isProtected: true,
                    downloadCount: 0
                });

                console.log('✅ File saved to database:', newFile.id);

                // Добавляем теги
                if (tagArray.length > 0) {
                    for (const tagName of tagArray) {
                        if (tagName && tagName.trim()) {
                            const [tag] = await Tag.findOrCreate({
                                where: { name: tagName.toLowerCase().trim() }
                            });
                            await FileTag.create({
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
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }

                console.log(`✅ File uploaded successfully: ${newFile.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) by ${user.email}`);

                res.status(201).json({
                    success: true,
                    message: 'File uploaded successfully',
                    file: {
                        id: newFile.id,
                        name: newFile.name,
                        originalName: newFile.originalName,
                        type: newFile.type,
                        format: newFile.format,
                        size: newFile.size,
                        duration: newFile.duration,
                        createdAt: newFile.createdAt,
                        tags: tagArray,
                        metadata: metadata
                    },
                    storageUsed: currentStorage + file.size,
                    storageLimit: user.storageLimit
                });
            } catch (error: any) {
                console.error('❌ Upload error:', error);
                console.error('Error stack:', error.stack);
                
                // Очищаем временный файл
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                
                res.status(500).json({ 
                    success: false,
                    error: 'File upload failed',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });
    }

    async getFiles(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page = 1, limit = 20, type, search, sort = 'createdAt', order = 'DESC' } = req.query;
            
            console.log('📡 Get files request for user:', req.user.id);
            console.log('Query params:', { page, limit, type, search, sort, order });
            
            const where: any = { userId: req.user.id };
            
            if (type && type !== 'all' && type !== 'favorites') {
                where.type = type;
                console.log('Filtering by type:', type);
            }
            
            if (search) {
                where.name = { [Op.iLike]: `%${search}%` };
            }

            // Определяем поле сортировки
            let sortColumn = 'createdAt';
            if (sort === 'date') sortColumn = 'createdAt';
            else if (sort === 'name') sortColumn = 'name';
            else if (sort === 'size') sortColumn = 'size';
            else if (sort === 'type') sortColumn = 'type';

            const files = await File.findAndCountAll({
                where,
                limit: parseInt(limit as string),
                offset: (parseInt(page as string) - 1) * parseInt(limit as string),
                order: [[sortColumn, order as string]],
                attributes: ['id', 'name', 'originalName', 'type', 'format', 'size', 'duration', 'path', 'metadata', 'favorite', 'createdAt']
            });

            console.log(`✅ Found ${files.count} files for user ${req.user.id}`);
            
            // Преобразуем путь для клиента
            const filesWithUrl = files.rows.map(file => {
                const fileData = file.toJSON();
                fileData.path = `http://localhost:5000${fileData.path}`;
                return fileData;
            });

            res.json({
                files: filesWithUrl,
                total: files.count,
                page: parseInt(page as string),
                totalPages: Math.ceil(files.count / parseInt(limit as string))
            });
        } catch (error) {
            console.error('Get files error:', error);
            res.status(500).json({ error: 'Failed to retrieve files', details: error.message });
        }
    }

    async getFileById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            const file = await File.findOne({
                where: { id, userId: req.user.id },
                include: [{ model: Tag, as: 'tags' }]
            });

            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }

            // Преобразуем путь для клиента
            const fileData = file.toJSON();
            fileData.path = `http://localhost:5000${fileData.path}`;

            res.json({ file: fileData });
        } catch (error) {
            console.error('Get file error:', error);
            res.status(500).json({ error: 'Failed to retrieve file' });
        }
    }

    async deleteFile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            const file = await File.findOne({
                where: { id, userId: req.user.id }
            });

            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }

            // Удаляем зашифрованный файл
            if (fs.existsSync(file.encryptedPath)) {
                fs.unlinkSync(file.encryptedPath);
            }

            // Обновляем использование хранилища пользователя
            const currentStorage = req.user.storageUsed || 0;
            await req.user.update({ storageUsed: Math.max(0, currentStorage - file.size) });

            // Удаляем теги
            await FileTag.destroy({ where: { fileId: file.id } });

            // Удаляем из базы данных
            await file.destroy();

            res.json({ success: true, message: 'File deleted successfully' });
        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({ error: 'Failed to delete file' });
        }
    }

    async updateFileMetadata(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, tags, isPublic, favorite, metadata } = req.body;
            
            const file = await File.findOne({
                where: { id, userId: req.user.id }
            });

            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }

            // Обновляем базовую информацию
            if (name) file.name = name;
            if (isPublic !== undefined) file.isPublic = isPublic;
            if (favorite !== undefined) file.favorite = favorite;
            if (metadata) file.metadata = { ...file.metadata, ...metadata };
            
            // Обновляем теги
            if (tags && Array.isArray(tags)) {
                await FileTag.destroy({ where: { fileId: file.id } });
                
                for (const tagName of tags) {
                    if (tagName && tagName.trim()) {
                        const [tag] = await Tag.findOrCreate({
                            where: { name: tagName.toLowerCase().trim() }
                        });
                        await FileTag.create({
                            fileId: file.id,
                            tagId: tag.id
                        });
                    }
                }
            }

            await file.save();

            const updatedFile = await File.findOne({
                where: { id: file.id },
                include: [{ model: Tag, as: 'tags' }]
            });

            res.json({ success: true, message: 'File updated successfully', file: updatedFile });
        } catch (error) {
            console.error('Update error:', error);
            res.status(500).json({ error: 'Failed to update file' });
        }
    }
    
    async downloadFile(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            
            const file = await File.findOne({
                where: { id, userId: req.user.id }
            });

            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }

            // Обновляем счетчик скачиваний
            await file.update({
                downloadCount: (file.downloadCount || 0) + 1,
                lastAccessed: new Date()
            });

            // Отправляем файл
            res.download(file.encryptedPath, file.originalName);
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({ error: 'Failed to download file' });
        }
    }
}

export default new FileController();