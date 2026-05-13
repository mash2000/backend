"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const User_1 = __importDefault(require("./User"));
class File extends sequelize_1.Model {
}
File.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'user_id'
    },
    name: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    originalName: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false,
        field: 'original_name'
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('audio', 'score', 'lyrics', 'midi', 'other'),
        allowNull: false,
        defaultValue: 'other'
    },
    format: {
        type: sequelize_1.DataTypes.STRING(20),
        allowNull: false
    },
    size: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false
    },
    duration: {
        type: sequelize_1.DataTypes.INTEGER
    },
    path: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false
    },
    encryptedPath: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: false,
        field: 'encrypted_path'
    },
    encryptionMetadata: {
        type: sequelize_1.DataTypes.JSONB,
        defaultValue: {},
        field: 'encryption_metadata'
    },
    metadata: {
        type: sequelize_1.DataTypes.JSONB,
        defaultValue: {}
    },
    thumbnail: {
        type: sequelize_1.DataTypes.STRING(500)
    },
    isPublic: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_public'
    },
    isProtected: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_protected'
    },
    favorite: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    downloadCount: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        field: 'download_count'
    },
    lastAccessed: {
        type: sequelize_1.DataTypes.DATE,
        field: 'last_accessed'
    }
}, {
    sequelize: database_1.default,
    tableName: 'files',
    timestamps: true,
    underscored: true,
    paranoid: true, // soft delete - запись не удаляется, а получает deletedAt
    indexes: [
        { fields: ['user_id'] },
        { fields: ['type'] },
        { fields: ['created_at'] }
    ]
});
File.belongsTo(User_1.default, { foreignKey: 'userId', as: 'user' });
User_1.default.hasMany(File, { foreignKey: 'userId', as: 'files' });
exports.default = File;
//# sourceMappingURL=File.js.map