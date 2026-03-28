import { Router } from 'express';
import { FileController } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';
import { fileUploadValidation } from '../middleware/validation';

const router = Router();
const fileController = new FileController();

router.get('/', authenticate, fileController.getFiles);
router.get('/:id', authenticate, fileController.getFileById);
router.post('/', authenticate, uploadLimiter, fileUploadValidation, fileController.uploadFile);
router.put('/:id', authenticate, fileController.updateFileMetadata);
router.delete('/:id', authenticate, fileController.deleteFile);
router.get('/:id/download', authenticate, fileController.downloadFile);

export default router;