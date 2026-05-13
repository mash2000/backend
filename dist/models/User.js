"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class User extends sequelize_1.Model {
    async validatePassword(password) {
        return bcryptjs_1.default.compare(password, this.passwordHash);
    }
    async updateStorage(size) {
        this.storageUsed += size;
        await this.save();
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    passwordHash: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    name: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('user', 'premium', 'admin'),
        defaultValue: 'user'
    },
    avatar: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true
    },
    emailVerified: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    lastLogin: {
        type: sequelize_1.DataTypes.DATE
    },
    twoFactorEnabled: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    twoFactorSecret: {
        type: sequelize_1.DataTypes.STRING(100)
    },
    encryptedMasterKey: {
        type: sequelize_1.DataTypes.TEXT
    },
    keySalt: {
        type: sequelize_1.DataTypes.STRING(64)
    },
    storageUsed: {
        type: sequelize_1.DataTypes.BIGINT,
        defaultValue: 0
    },
    storageLimit: {
        type: sequelize_1.DataTypes.BIGINT,
        defaultValue: 1073741824
    }
}, {
    sequelize: database_1.default,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    paranoid: true
});
exports.default = User;
//# sourceMappingURL=User.js.map