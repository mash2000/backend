declare class EncryptionService {
    private algorithm;
    private keyLength;
    private ivLength;
    generateKey(): Buffer;
    encryptFile(inputPath: string, outputPath: string, key: Buffer): Promise<{
        iv: string;
        authTag: string;
    }>;
    decryptFile(inputPath: string, outputPath: string, key: Buffer, iv: string, authTag: string): Promise<void>;
    encryptKey(key: Buffer, masterKey: Buffer): string;
    decryptKey(encryptedData: string, masterKey: Buffer): Buffer;
    deriveKeyFromPassword(password: string, salt: Buffer): Buffer;
    generateSalt(): Buffer;
}
declare const _default: EncryptionService;
export default _default;
//# sourceMappingURL=encryptionService.d.ts.map