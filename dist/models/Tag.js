"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTag = exports.Tag = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const File_1 = __importDefault(require("./File"));
class Tag extends sequelize_1.Model {
}
exports.Tag = Tag;
Tag.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true
    }
}, {
    sequelize: database_1.default,
    tableName: 'tags'
});
// Many-to-many relationship
const FileTag = database_1.default.define('FileTag', {
    fileId: {
        type: sequelize_1.DataTypes.UUID,
        references: { model: File_1.default, key: 'id' },
        onDelete: 'CASCADE'
    },
    tagId: {
        type: sequelize_1.DataTypes.UUID,
        references: { model: Tag, key: 'id' },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'file_tags',
    timestamps: false
});
exports.FileTag = FileTag;
File_1.default.belongsToMany(Tag, { through: FileTag, as: 'tags', foreignKey: 'fileId' });
Tag.belongsToMany(File_1.default, { through: FileTag, as: 'files', foreignKey: 'tagId' });
//# sourceMappingURL=Tag.js.map