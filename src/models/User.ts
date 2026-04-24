import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

interface UserAttributes {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'user' | 'premium' | 'admin';
    isActive: boolean;
    lastLogin?: Date;
    storageUsed: number;
    storageLimit: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'isActive' | 'storageUsed' | 'storageLimit'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: string;
    public email!: string;
    public passwordHash!: string;
    public name!: string;
    public role!: 'user' | 'premium' | 'admin';
    public isActive!: boolean;
    public lastLogin?: Date;
    public storageUsed!: number;
    public storageLimit!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.passwordHash);
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
            type: DataTypes.ENUM('user', 'premium', 'admin'),
            defaultValue: 'user'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        lastLogin: {
            type: DataTypes.DATE
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
        underscored: true
    }
);

export default User;