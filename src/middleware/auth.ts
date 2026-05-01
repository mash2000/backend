import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ 
                success: false,
                error: 'Требуется авторизация' 
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_ACCESS_SECRET || 'secret_key';
        
        const decoded = jwt.verify(token, secret) as any;
        
        // Загружаем пользователя из базы данных
        const user = await User.findByPk(decoded.userId);
        
        if (!user) {
            res.status(401).json({ 
                success: false,
                error: 'Пользователь не найден' 
            });
            return;
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ 
            success: false,
            error: 'Недействительный токен' 
        });
    }
};