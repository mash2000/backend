"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const sequelize_1 = require("sequelize");
const File_1 = __importDefault(require("../models/File"));
const Tag_1 = require("../models/Tag");
class SearchController {
    async search(req, res) {
        try {
            const { q, type, tags, from, to, page = 1, limit = 20 } = req.query;
            const where = { userId: req.user.id };
            if (q) {
                // Используем ILIKE для поиска (без pg_trgm)
                where[sequelize_1.Op.or] = [
                    { name: { [sequelize_1.Op.iLike]: `%${q}%` } },
                    { originalName: { [sequelize_1.Op.iLike]: `%${q}%` } }
                ];
            }
            if (type) {
                where.type = type;
            }
            if (from) {
                where.createdAt = { [sequelize_1.Op.gte]: new Date(from) };
            }
            if (to) {
                where.createdAt = { ...where.createdAt, [sequelize_1.Op.lte]: new Date(to) };
            }
            const include = [
                {
                    model: Tag_1.Tag,
                    as: 'tags',
                    required: false,
                    through: { attributes: [] }
                }
            ];
            if (tags) {
                const tagNames = tags.split(',');
                include[0].where = { name: { [sequelize_1.Op.in]: tagNames } };
                include[0].required = true;
            }
            const files = await File_1.default.findAndCountAll({
                where,
                include,
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [['createdAt', 'DESC']],
                distinct: true
            });
            res.json({
                files: files.rows,
                total: files.count,
                page: parseInt(page),
                totalPages: Math.ceil(files.count / parseInt(limit))
            });
        }
        catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    }
    async getTags(req, res) {
        try {
            const tags = await Tag_1.Tag.findAll({
                include: [{
                        model: File_1.default,
                        as: 'files',
                        where: { userId: req.user.id },
                        attributes: [],
                        through: { attributes: [] },
                        required: false
                    }]
            });
            // Фильтруем теги, которые имеют файлы
            const tagsWithFiles = tags.filter(tag => tag.files && tag.files.length > 0);
            res.json({ tags: tagsWithFiles });
        }
        catch (error) {
            console.error('Get tags error:', error);
            res.status(500).json({ error: 'Failed to get tags' });
        }
    }
}
exports.SearchController = SearchController;
//# sourceMappingURL=searchController.js.map