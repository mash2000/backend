import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import sequelize from '../config/database';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Проверяем соединение с БД
        try {
            await sequelize.authenticate();
        } catch (dbError) {
            console.error('Database connection error in auth:', dbError);
            res.status(503).json({ 
                error: 'Service temporarily unavailable' 
            });
            return;
        }

        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ 
                error: 'No token provided' 
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_ACCESS_SECRET || 'secret_key';
        
        const decoded = jwt.verify(token, secret) as any;
        
        const user = await User.findByPk(decoded.userId);
        
        if (!user) {
            res.status(401).json({ 
                error: 'User not found' 
            });
            return;
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        
        // Не выходим из аккаунта при ошибках соединения
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ error: 'Invalid token' });
        } else if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token expired' });
        } else if (error.code === 'ECONNRESET') {
            res.status(503).json({ error: 'Service temporarily unavailable' });
        } else {
            res.status(500).json({ error: 'Authentication failed' });
        }
    }
};