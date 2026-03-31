import { Router } from 'express';
import { FileController } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { fileUploadValidation } from '../middleware/validation';

const router = Router();
const fileController = new FileController();

// Все маршруты требуют аутентификации
router.use(authenticate);

// GET /api/files - получение списка файлов
router.get('/', fileController.getFiles);

// GET /api/files/:id - получение файла по ID
router.get('/:id', fileController.getFileById);

// POST /api/files - загрузка файла
router.post('/', uploadLimiter, fileUploadValidation, fileController.uploadFile);

// PUT /api/files/:id - обновление метаданных файла
router.put('/:id', fileController.updateFileMetadata);

// DELETE /api/files/:id - удаление файла
router.delete('/:id', fileController.deleteFile);

// GET /api/files/:id/download - скачивание файла
router.get('/:id/download', fileController.downloadFile);

export default router;