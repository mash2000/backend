import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    next();
};

export const registerValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').notEmpty().trim().isLength({ min: 2, max: 100 }),
    validate
];

export const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate
];

export const fileUploadValidation = [
    body('name').optional().trim().isLength({ max: 255 }),
    body('isPublic').optional().isBoolean(),
    body('tags').optional().isArray(),
    validate
];