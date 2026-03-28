import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

class JWTService {
    private accessSecret: jwt.Secret;
    private refreshSecret: jwt.Secret;
    private accessExpires: string;
    private refreshExpires: string;

    constructor() {
        this.accessSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
        this.accessExpires = process.env.JWT_ACCESS_EXPIRES || '15m';
        this.refreshExpires = process.env.JWT_REFRESH_EXPIRES || '7d';
    }

    generateAccessToken(payload: TokenPayload): string {
        return jwt.sign(payload, this.accessSecret, {
            expiresIn: this.accessExpires
        } as jwt.SignOptions);
    }

    generateRefreshToken(payload: TokenPayload): string {
        return jwt.sign(payload, this.refreshSecret, {
            expiresIn: this.refreshExpires
        } as jwt.SignOptions);
    }

    verifyAccessToken(token: string): TokenPayload | null {
        try {
            const decoded = jwt.verify(token, this.accessSecret) as TokenPayload;
            return decoded;
        } catch (error) {
            return null;
        }
    }

    verifyRefreshToken(token: string): TokenPayload | null {
        try {
            const decoded = jwt.verify(token, this.refreshSecret) as TokenPayload;
            return decoded;
        } catch (error) {
            return null;
        }
    }

    generateTokens(payload: TokenPayload): { accessToken: string; refreshToken: string } {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload)
        };
    }
}

export default new JWTService();