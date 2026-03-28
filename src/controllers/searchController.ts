import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import File from '../models/File';
import { Tag } from '../models/Tag';

export class SearchController {
    async search(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { q, type, tags, from, to, page = 1, limit = 20 } = req.query;

            const where: any = { userId: req.user.id };

            if (q) {
                // Используем ILIKE для поиска (без pg_trgm)
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${q}%` } },
                    { originalName: { [Op.iLike]: `%${q}%` } }
                ];
            }

            if (type) {
                where.type = type;
            }

            if (from) {
                where.createdAt = { [Op.gte]: new Date(from as string) };
            }

            if (to) {
                where.createdAt = { ...where.createdAt, [Op.lte]: new Date(to as string) };
            }

            const include: any[] = [
                {
                    model: Tag,
                    as: 'tags',
                    required: false,
                    through: { attributes: [] }
                }
            ];

            if (tags) {
                const tagNames = (tags as string).split(',');
                include[0].where = { name: { [Op.in]: tagNames } };
                include[0].required = true;
            }

            const files = await File.findAndCountAll({
                where,
                include,
                limit: parseInt(limit as string),
                offset: (parseInt(page as string) - 1) * parseInt(limit as string),
                order: [['createdAt', 'DESC']],
                distinct: true
            });

            res.json({
                files: files.rows,
                total: files.count,
                page: parseInt(page as string),
                totalPages: Math.ceil(files.count / parseInt(limit as string))
            });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    }

    async getTags(req: AuthRequest, res: Response): Promise<void> {
        try {
            const tags = await Tag.findAll({
                include: [{
                    model: File,
                    as: 'files',
                    where: { userId: req.user.id },
                    attributes: [],
                    through: { attributes: [] },
                    required: false
                }]
            });

            // Фильтруем теги, которые имеют файлы
            const tagsWithFiles = tags.filter(tag => (tag as any).files && (tag as any).files.length > 0);

            res.json({ tags: tagsWithFiles });
        } catch (error) {
            console.error('Get tags error:', error);
            res.status(500).json({ error: 'Failed to get tags' });
        }
    }
}