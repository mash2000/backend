import { Model, Optional } from 'sequelize';
interface UserAttributes {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'user' | 'premium' | 'admin';
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
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'isActive' | 'emailVerified' | 'twoFactorEnabled' | 'storageUsed' | 'storageLimit' | 'avatar'> {
}
declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'user' | 'premium' | 'admin';
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
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly deletedAt?: Date;
    validatePassword(password: string): Promise<boolean>;
    updateStorage(size: number): Promise<void>;
}
export default User;
//# sourceMappingURL=User.d.ts.map