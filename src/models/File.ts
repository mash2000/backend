import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

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

interface FileCreationAttributes extends Optional<FileAttributes, 'id' | 'isPublic' | 'isProtected' | 'favorite' | 'downloadCount' | 'encryptionMetadata'> {}

class File extends Model<FileAttributes, FileCreationAttributes> implements FileAttributes {
    public id!: string;
    public userId!: string;
    public name!: string;
    public originalName!: string;
    public type!: 'audio' | 'score' | 'lyrics' | 'midi' | 'other';
    public format!: string;
    public size!: number;
    public duration?: number;
    public path!: string;
    public encryptedPath!: string;
    public encryptionMetadata!: any;
    public metadata?: any;
    public thumbnail?: string;
    public isPublic!: boolean;
    public isProtected!: boolean;
    public favorite!: boolean;
    public downloadCount!: number;
    public lastAccessed?: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt?: Date;
}

File.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: User,
                key: 'id'
            },
            onDelete: 'CASCADE',
            field: 'user_id'
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        originalName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'original_name'
        },
        type: {
            type: DataTypes.ENUM('audio', 'score', 'lyrics', 'midi', 'other'),
            allowNull: false,
            defaultValue: 'other'
        },
        format: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        size: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        duration: {
            type: DataTypes.INTEGER
        },
        path: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        encryptedPath: {
            type: DataTypes.STRING(500),
            allowNull: false,
            field: 'encrypted_path'
        },
        encryptionMetadata: {
            type: DataTypes.JSONB,
            defaultValue: {},
            field: 'encryption_metadata'
        },
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        },
        thumbnail: {
            type: DataTypes.STRING(500)
        },
        isPublic: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_public'
        },
        isProtected: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_protected'
        },
        favorite: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        downloadCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'download_count'
        },
        lastAccessed: {
            type: DataTypes.DATE,
            field: 'last_accessed'
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at'
        },
        deletedAt: {
            type: DataTypes.DATE,
            field: 'deleted_at'
        }
    },
    {
        sequelize,
        tableName: 'files',
        paranoid: true,
        timestamps: true,
        underscored: true
    }
);

File.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(File, { foreignKey: 'userId', as: 'files' });

export default File;