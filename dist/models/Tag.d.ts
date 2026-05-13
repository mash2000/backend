import { Model, Optional } from 'sequelize';
interface TagAttributes {
    id: string;
    name: string;
    createdAt?: Date;
}
interface TagCreationAttributes extends Optional<TagAttributes, 'id'> {
}
declare class Tag extends Model<TagAttributes, TagCreationAttributes> implements TagAttributes {
    id: string;
    name: string;
    readonly createdAt: Date;
}
declare const FileTag: import("sequelize").ModelCtor<Model<any, any>>;
export { Tag, FileTag };
//# sourceMappingURL=Tag.d.ts.map