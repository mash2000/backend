"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = __importDefault(require("./config/database"));
const auth_1 = __importDefault(require("./routes/auth"));
const files_1 = __importDefault(require("./routes/files"));
const user_1 = __importDefault(require("./routes/user"));
const search_1 = __importDefault(require("./routes/search"));
const rateLimiter_1 = require("./middleware/rateLimiter");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = __importDefault(require("./utils/logger"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Функция для проверки и восстановления подключения
async function ensureDatabaseConnection() {
    try {
        await database_1.default.authenticate();
        console.log('✅ Database connection is active');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection lost:', error);
        // Пытаемся переподключиться
        try {
            console.log('🔄 Attempting to reconnect...');
            await database_1.default.close();
            await database_1.default.authenticate();
            console.log('✅ Database reconnected successfully');
            return true;
        }
        catch (reconnectError) {
            console.error('❌ Failed to reconnect:', reconnectError);
            return false;
        }
    }
}
// Middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => logger_1.default.info(message.trim())
    }
}));
// Rate limiting
app.use('/api', rateLimiter_1.apiLimiter);
// Настройка CORS для PDF файлов
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Добавьте после других статических маршрутов
app.use('/uploads/avatars', express_1.default.static(path_1.default.join(__dirname, '../uploads/avatars')));
// Настройка статических файлов для PDF
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Accept-Ranges', 'bytes');
        }
    }
}));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/files', files_1.default);
app.use('/api/user', user_1.default);
app.use('/api/search', search_1.default);
app.get('/health', async (req, res) => {
    try {
        await database_1.default.authenticate();
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.get('/', (req, res) => {
    res.json({
        name: 'Archimus API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            files: '/api/files',
            user: '/api/user',
            search: '/api/search'
        }
    });
});
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
// Middleware для проверки соединения перед запросами
app.use(async (req, res, next) => {
    const isConnected = await ensureDatabaseConnection();
    if (!isConnected) {
        res.status(503).json({ error: 'Database connection unavailable' });
        return;
    }
    next();
});
// Error handler
app.use(errorHandler_1.errorHandler);
// Создание директорий для загрузки
const uploadDirs = ['uploads/temp', 'uploads/encrypted', 'uploads/thumbnails', 'logs'];
uploadDirs.forEach(dir => {
    const fullPath = path_1.default.join(__dirname, '..', dir);
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${fullPath}`);
    }
});
// Database connection and server start
const startServer = async () => {
    try {
        await database_1.default.authenticate();
        logger_1.default.info('✅ Database connected successfully');
        await database_1.default.sync({ alter: process.env.NODE_ENV === 'development' });
        logger_1.default.info('✅ Database synchronized');
        app.listen(PORT, () => {
            logger_1.default.info(`🚀 Server running on port ${PORT}`);
            logger_1.default.info(`📝 Environment: ${process.env.NODE_ENV}`);
            logger_1.default.info(`📍 API URL: http://localhost:${PORT}/api`);
        });
    }
    catch (error) {
        logger_1.default.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=app.js.map