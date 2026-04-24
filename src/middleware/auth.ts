import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
        
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false,
            error: 'Недействительный токен' 
        });
    }
};