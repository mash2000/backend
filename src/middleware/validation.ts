import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Middleware для проверки ошибок валидации
export const validate = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ 
            errors: errors.array(),
            message: 'Ошибка валидации данных'
        });
        return;
    }
    next();
};

// Валидация email
export const validateEmail = body('email')
    .isEmail()
    .withMessage('Введите корректный email адрес')
    .normalizeEmail()
    .trim();

// Валидация пароля
export const validatePassword = body('password')
    .isLength({ min: 8 })
    .withMessage('Пароль должен содержать минимум 8 символов')
    .matches(/[A-Z]/)
    .withMessage('Пароль должен содержать хотя бы одну заглавную букву')
    .matches(/[a-z]/)
    .withMessage('Пароль должен содержать хотя бы одну строчную букву')
    .matches(/[0-9]/)
    .withMessage('Пароль должен содержать хотя бы одну цифру')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Пароль должен содержать хотя бы один специальный символ')
    .trim();

// Валидация имени
export const validateName = body('name')
    .notEmpty()
    .withMessage('Имя обязательно')
    .isLength({ min: 2, max: 50 })
    .withMessage('Имя должно быть от 2 до 50 символов')
    .matches(/^[a-zA-Zа-яА-Я\s-]+$/)
    .withMessage('Имя может содержать только буквы, пробелы и дефисы')
    .trim();

// Комбинированная валидация для регистрации (без confirmPassword)
export const registerValidation = [
    validateEmail,
    validatePassword,
    validateName,
    validate
];

// Валидация для входа
export const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Введите корректный email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Введите пароль'),
    validate
];

// Валидация загрузки файла
export const fileUploadValidation = [
    body('name')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Название файла не должно превышать 255 символов')
        .trim(),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic должен быть булевым значением'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Теги должны быть массивом'),
    validate
];

// Валидация смены пароля
export const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Введите текущий пароль'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Новый пароль должен содержать минимум 8 символов')
        .matches(/[A-Z]/)
        .withMessage('Пароль должен содержать заглавную букву')
        .matches(/[a-z]/)
        .withMessage('Пароль должен содержать строчную букву')
        .matches(/[0-9]/)
        .withMessage('Пароль должен содержать цифру'),
    validate
];