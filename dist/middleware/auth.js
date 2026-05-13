"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const database_1 = __importDefault(require("../config/database"));
const authenticate = async (req, res, next) => {
    try {
        // Проверяем соединение с БД
        try {
            await database_1.default.authenticate();
        }
        catch (dbError) {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await User_1.default.findByPk(decoded.userId);
        if (!user) {
            res.status(401).json({
                error: 'User not found'
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Auth error:', error);
        // Не выходим из аккаунта при ошибках соединения
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ error: 'Invalid token' });
        }
        else if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token expired' });
        }
        else if (error.code === 'ECONNRESET') {
            res.status(503).json({ error: 'Service temporarily unavailable' });
        }
        else {
            res.status(500).json({ error: 'Authentication failed' });
        }
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.js.map