"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class JWTService {
    constructor() {
        this.accessSecret = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
        this.accessExpires = process.env.JWT_ACCESS_EXPIRES || '15m';
        this.refreshExpires = process.env.JWT_REFRESH_EXPIRES || '7d';
    }
    generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.accessSecret, {
            expiresIn: this.accessExpires
        });
    }
    generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.refreshSecret, {
            expiresIn: this.refreshExpires
        });
    }
    verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.accessSecret);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    verifyRefreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.refreshSecret);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    generateTokens(payload) {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload)
        };
    }
}
exports.default = new JWTService();
//# sourceMappingURL=jwtService.js.map