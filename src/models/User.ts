import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface UserAttributes {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'user' | 'admin';
    avatar?: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLogin?: Date;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    encryptedMasterKey?: string;
    keySalt?: string;
    storageUsed: number;
    storageLimit: number;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'isActive' | 'emailVerified' | 'twoFactorEnabled' | 'storageUsed' | 'storageLimit' | 'avatar'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: string;
    public email!: string;
    public passwordHash!: string;
    public name!: string;
    public role!: 'user' | 'admin';
    public avatar?: string;
    public isActive!: boolean;
    public emailVerified!: boolean;
    public lastLogin?: Date;
    public twoFactorEnabled!: boolean;
    public twoFactorSecret?: string;
    public encryptedMasterKey?: string;
    public keySalt?: string;
    public storageUsed!: number;
    public storageLimit!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public readonly deletedAt?: Date;

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.passwordHash);
    }

    async updateStorage(size: number): Promise<void> {
        this.storageUsed += size;
        await this.save();
    }
}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('user', 'admin'),
            defaultValue: 'user'
        },
        avatar: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        emailVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        lastLogin: {
            type: DataTypes.DATE
        },
        twoFactorEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        twoFactorSecret: {
            type: DataTypes.STRING(100)
        },
        encryptedMasterKey: {
            type: DataTypes.TEXT
        },
        keySalt: {
            type: DataTypes.STRING(64)
        },
        storageUsed: {
            type: DataTypes.BIGINT,
            defaultValue: 0
        },
        storageLimit: {
            type: DataTypes.BIGINT,
            defaultValue: 1073741824
        }
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true,
        underscored: true,
        paranoid: true
    }
);

export default User;