import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import File from './File';

interface TagAttributes {
    id: string;
    name: string;
    createdAt?: Date;
}

interface TagCreationAttributes extends Optional<TagAttributes, 'id'> {}

class Tag extends Model<TagAttributes, TagCreationAttributes> implements TagAttributes {
    public id!: string;
    public name!: string;
    public readonly createdAt!: Date;
}

Tag.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        }
    },
    {
        sequelize,
        tableName: 'tags'
    }
);

// Many-to-many relationship
const FileTag = sequelize.define('FileTag', {
    fileId: {
        type: DataTypes.UUID,
        references: { model: File, key: 'id' },
        onDelete: 'CASCADE'
    },
    tagId: {
        type: DataTypes.UUID,
        references: { model: Tag, key: 'id' },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'file_tags',
    timestamps: false
});

File.belongsToMany(Tag, { through: FileTag, as: 'tags', foreignKey: 'fileId' });
Tag.belongsToMany(File, { through: FileTag, as: 'files', foreignKey: 'tagId' });

export { Tag, FileTag };