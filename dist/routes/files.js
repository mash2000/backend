"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileController_1 = require("../controllers/fileController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
const fileController = new fileController_1.FileController();
// Все маршруты требуют аутентификации
router.use(auth_1.authenticate);
// GET /api/files - получение списка файлов
router.get('/', fileController.getFiles);
// GET /api/files/:id - получение файла по ID
router.get('/:id', fileController.getFileById);
// POST /api/files - загрузка файла
router.post('/', rateLimiter_1.uploadLimiter, validation_1.fileUploadValidation, fileController.uploadFile);
// PUT /api/files/:id - обновление метаданных файла
router.put('/:id', fileController.updateFileMetadata);
// DELETE /api/files/:id - удаление файла
router.delete('/:id', fileController.deleteFile);
// GET /api/files/:id/download - скачивание файла
router.get('/:id/download', fileController.downloadFile);
exports.default = router;
//# sourceMappingURL=files.js.map