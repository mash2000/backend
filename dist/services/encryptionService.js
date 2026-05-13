"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = require("stream/promises");
const fs_1 = require("fs");
class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 12;
    }
    generateKey() {
        return crypto_1.default.randomBytes(this.keyLength);
    }
    async encryptFile(inputPath, outputPath, key) {
        const iv = crypto_1.default.randomBytes(this.ivLength);
        const cipher = crypto_1.default.createCipheriv(this.algorithm, key, iv);
        // Приводим к типу CipherGCM для доступа к getAuthTag
        const gcmCipher = cipher;
        const input = (0, fs_1.createReadStream)(inputPath);
        const output = (0, fs_1.createWriteStream)(outputPath);
        await (0, promises_1.pipeline)(input, gcmCipher, output);
        return {
            iv: iv.toString('hex'),
            authTag: gcmCipher.getAuthTag().toString('hex')
        };
    }
    async decryptFile(inputPath, outputPath, key, iv, authTag) {
        const decipher = crypto_1.default.createDecipheriv(this.algorithm, key, Buffer.from(iv, 'hex'));
        const gcmDecipher = decipher;
        gcmDecipher.setAuthTag(Buffer.from(authTag, 'hex'));
        const input = (0, fs_1.createReadStream)(inputPath);
        const output = (0, fs_1.createWriteStream)(outputPath);
        await (0, promises_1.pipeline)(input, gcmDecipher, output);
    }
    encryptKey(key, masterKey) {
        const iv = crypto_1.default.randomBytes(this.ivLength);
        const cipher = crypto_1.default.createCipheriv(this.algorithm, masterKey, iv);
        const gcmCipher = cipher;
        const encrypted = Buffer.concat([
            gcmCipher.update(key),
            gcmCipher.final()
        ]);
        return JSON.stringify({
            iv: iv.toString('hex'),
            data: encrypted.toString('hex'),
            tag: gcmCipher.getAuthTag().toString('hex')
        });
    }
    decryptKey(encryptedData, masterKey) {
        const { iv, data, tag } = JSON.parse(encryptedData);
        const decipher = crypto_1.default.createDecipheriv(this.algorithm, masterKey, Buffer.from(iv, 'hex'));
        const gcmDecipher = decipher;
        gcmDecipher.setAuthTag(Buffer.from(tag, 'hex'));
        return Buffer.concat([
            gcmDecipher.update(Buffer.from(data, 'hex')),
            gcmDecipher.final()
        ]);
    }
    deriveKeyFromPassword(password, salt) {
        return crypto_1.default.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
    }
    generateSalt() {
        return crypto_1.default.randomBytes(16);
    }
}
exports.default = new EncryptionService();
//# sourceMappingURL=encryptionService.js.map