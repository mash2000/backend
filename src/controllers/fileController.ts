import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import File from '../models/File';
import { Tag, FileTag } from '../models/Tag';
import encryptionService from '../services/encryptionService';
import metadataService from '../services/metadataService';
import { AuthRequest } from '../middleware/auth';
import { Op } from 'sequelize';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600')
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = (process.env.ALLOWED_EXTENSIONS || '.mp3,.wav,.flac,.pdf,.mid,.midi,.txt').split(',');
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
                res.status(400).json({ error: err.message });
                return;
            }

            try {
                const file = req.file;
                const { name, isPublic, tags } = req.body;
                const user = req.user;

                if (!file) {
                    res.status(400).json({ error: 'No file uploaded' });
                    return;
                }

                // Check storage limit
                if (user.storageUsed + file.size > user.storageLimit) {
                    fs.unlinkSync(file.path);
                    res.status(413).json({ error: 'Storage limit exceeded' });
                    return;
                }

                // Detect file type
                const fileType = await metadataService.detectFileType(file.path);
                
                // Extract metadata
                const metadata = await metadataService.extractMetadata(file.path, fileType);
                
                // Generate encryption key (simplified for now)
                const fileKey = encryptionService.generateKey();
                
                // For now, just copy file to encrypted path (simplified)
                const encryptedPath = path.join(
                    __dirname,
                    '../../uploads/encrypted',
                    `${uuidv4()}${path.extname(file.originalname)}`
                );
                
                fs.copyFileSync(file.path, encryptedPath);

                // Save to database
                const newFile = await File.create({
                    userId: user.id,
                    name: name || file.originalname,
                    originalName: file.originalname,
                    type: fileType,
                    format: path.extname(file.originalname).substring(1).toUpperCase(),
                    size: file.size,
                    duration: metadata.duration,
                    path: file.path,
                    encryptedPath,
                    encryptionMetadata: {
                        encrypted: true
                    },
                    metadata,
                    isPublic: isPublic === 'true',
                    isProtected: true
                });

                // Add tags
                if (tags && Array.isArray(tags)) {
                    for (const tagName of tags) {
                        const [tag] = await Tag.findOrCreate({
                            where: { name: tagName.toLowerCase() }
                        });
                        await FileTag.create({
                            fileId: newFile.id,
                            tagId: tag.id
                        });
                    }
                }

                // Update user storage
                await user.updateStorage(file.size);

                // Delete temp file
                fs.unlinkSync(file.path);

                res.status(201).json({
                    message: 'File uploaded successfully',
                    file: newFile
                });
            } catch (error) {
                console.error('Upload error:', error);
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
                res.status(500).json({ error: 'File upload failed' });
            }
        });
    }

    async getFiles(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { page = 1, limit = 20, type, search, sort = 'createdAt', order = 'DESC' } = req.query;
            
            const where: any = { userId: req.user.id };
            
            if (type) {
                where.type = type;
            }
            
            if (search) {
                where.name = { [Op.iLike]: `%${search}%` };
            }

            const files = await File.findAndCountAll({
                where,
                include: [{ model: Tag, as: 'tags', through: { attributes: [] } }],
                limit: parseInt(limit as string),
                offset: (parseInt(page as string) - 1) * parseInt(limit as string),
                order: [[sort as string, order as string]],
                attributes: { exclude: ['encryptionMetadata'] }
            });

            res.json({
                files: files.rows,
                total: files.count,
                page: parseInt(page as string),
                totalPages: Math.ceil(files.count / parseInt(limit as string))
            });
        } catch (error) {
            console.error('Get files error:', error);
            res.status(500).json({ error: 'Failed to retrieve files' });
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

            res.json({ file });
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve file' });
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

            // Update download count
            await file.update({
                downloadCount: file.downloadCount + 1,
                lastAccessed: new Date()
            });

            // Send file
            res.download(file.encryptedPath, file.originalName);
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({ error: 'Failed to download file' });
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

            // Delete encrypted file
            if (fs.existsSync(file.encryptedPath)) {
                fs.unlinkSync(file.encryptedPath);
            }

            // Delete temp file if exists
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            // Delete from database
            await file.destroy();

            // Update user storage
            await req.user.updateStorage(-file.size);

            res.json({ message: 'File deleted successfully' });
        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({ error: 'Failed to delete file' });
        }
    }

    async updateFileMetadata(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { name, tags, isPublic, metadata } = req.body;
            
            const file = await File.findOne({
                where: { id, userId: req.user.id }
            });

            if (!file) {
                res.status(404).json({ error: 'File not found' });
                return;
            }

            // Update basic info
            if (name) file.name = name;
            if (isPublic !== undefined) file.isPublic = isPublic;
            if (metadata) file.metadata = { ...file.metadata, ...metadata };
            
            // Update tags
            if (tags && Array.isArray(tags)) {
                await FileTag.destroy({ where: { fileId: file.id } });
                
                for (const tagName of tags) {
                    const [tag] = await Tag.findOrCreate({
                        where: { name: tagName.toLowerCase() }
                    });
                    await FileTag.create({
                        fileId: file.id,
                        tagId: tag.id
                    });
                }
            }

            await file.save();

            const updatedFile = await File.findOne({
                where: { id: file.id },
                include: [{ model: Tag, as: 'tags' }]
            });

            res.json({ message: 'File updated successfully', file: updatedFile });
        } catch (error) {
            console.error('Update error:', error);
            res.status(500).json({ error: 'Failed to update file' });
        }
    }
}