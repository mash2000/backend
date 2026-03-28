import crypto from 'crypto';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

class EncryptionService {
    private algorithm: string = 'aes-256-gcm';
    private keyLength: number = 32;
    private ivLength: number = 12;

    generateKey(): Buffer {
        return crypto.randomBytes(this.keyLength);
    }

    async encryptFile(
        inputPath: string,
        outputPath: string,
        key: Buffer
    ): Promise<{ iv: string; authTag: string }> {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, key, iv);
        
        // Приводим к типу CipherGCM для доступа к getAuthTag
        const gcmCipher = cipher as unknown as crypto.CipherGCM;
        
        const input = createReadStream(inputPath);
        const output = createWriteStream(outputPath);

        await pipeline(input, gcmCipher, output);

        return {
            iv: iv.toString('hex'),
            authTag: gcmCipher.getAuthTag().toString('hex')
        };
    }

    async decryptFile(
        inputPath: string,
        outputPath: string,
        key: Buffer,
        iv: string,
        authTag: string
    ): Promise<void> {
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            key,
            Buffer.from(iv, 'hex')
        );
        
        const gcmDecipher = decipher as unknown as crypto.DecipherGCM;
        gcmDecipher.setAuthTag(Buffer.from(authTag, 'hex'));

        const input = createReadStream(inputPath);
        const output = createWriteStream(outputPath);

        await pipeline(input, gcmDecipher, output);
    }

    encryptKey(key: Buffer, masterKey: Buffer): string {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, masterKey, iv);
        const gcmCipher = cipher as unknown as crypto.CipherGCM;

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

    decryptKey(encryptedData: string, masterKey: Buffer): Buffer {
        const { iv, data, tag } = JSON.parse(encryptedData);
        
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            masterKey,
            Buffer.from(iv, 'hex')
        );
        
        const gcmDecipher = decipher as unknown as crypto.DecipherGCM;
        gcmDecipher.setAuthTag(Buffer.from(tag, 'hex'));

        return Buffer.concat([
            gcmDecipher.update(Buffer.from(data, 'hex')),
            gcmDecipher.final()
        ]);
    }

    deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
        return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
    }

    generateSalt(): Buffer {
        return crypto.randomBytes(16);
    }
}

export default new EncryptionService();