import { Model, Optional } from 'sequelize';
interface FileAttributes {
    id: string;
    userId: string;
    name: string;
    originalName: string;
    type: 'audio' | 'score' | 'lyrics' | 'midi' | 'other';
    format: string;
    size: number;
    duration?: number;
    path: string;
    encryptedPath: string;
    encryptionMetadata: any;
    metadata?: any;
    thumbnail?: string;
    isPublic: boolean;
    isProtected: boolean;
    favorite: boolean;
    downloadCount: number;
    lastAccessed?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
interface FileCreationAttributes extends Optional<FileAttributes, 'id' | 'isPublic' | 'isProtected' | 'favorite' | 'downloadCount' | 'encryptionMetadata'> {
}
declare class File extends Model<FileAttributes, FileCreationAttributes> implements FileAttributes {
    id: string;
    userId: string;
    name: string;
    originalName: string;
    type: 'audio' | 'score' | 'lyrics' | 'midi' | 'other';
    format: string;
    size: number;
    duration?: number;
    path: string;
    encryptedPath: string;
    encryptionMetadata: any;
    metadata?: any;
    thumbnail?: string;
    isPublic: boolean;
    isProtected: boolean;
    favorite: boolean;
    downloadCount: number;
    lastAccessed?: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly deletedAt?: Date;
}
export default File;
//# sourceMappingURL=File.d.ts.map