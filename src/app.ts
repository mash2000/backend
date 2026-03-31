import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import sequelize from './config/database';
import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import userRoutes from './routes/user';
import searchRoutes from './routes/search';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('combined', { 
    stream: { 
        write: (message: string) => logger.info(message.trim()) 
    } 
}));

// Rate limiting
app.use('/api', apiLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/user', userRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

app.get('/', (req: Request, res: Response) => {
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

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Error handler
app.use(errorHandler);

// Create upload directories if they don't exist
const uploadDirs = ['uploads/temp', 'uploads/encrypted', 'logs'];
uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// Database connection and server start
const startServer = async () => {
    try {
        await sequelize.authenticate();
        logger.info('✅ Database connected successfully');
        
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        logger.info('✅ Database synchronized');

        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
            logger.info(`📍 API URL: http://localhost:${PORT}/api`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;