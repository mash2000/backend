"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordValidation = exports.fileUploadValidation = exports.loginValidation = exports.registerValidation = exports.validateName = exports.validatePassword = exports.validateEmail = exports.validate = void 0;
const express_validator_1 = require("express-validator");
// Middleware для проверки ошибок валидации
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            errors: errors.array(),
            message: 'Ошибка валидации данных'
        });
        return;
    }
    next();
};
exports.validate = validate;
// Валидация email
exports.validateEmail = (0, express_validator_1.body)('email')
    .isEmail()
    .withMessage('Введите корректный email адрес')
    .normalizeEmail()
    .trim();
// Валидация пароля
exports.validatePassword = (0, express_validator_1.body)('password')
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
exports.validateName = (0, express_validator_1.body)('name')
    .notEmpty()
    .withMessage('Имя обязательно')
    .isLength({ min: 2, max: 50 })
    .withMessage('Имя должно быть от 2 до 50 символов')
    .matches(/^[a-zA-Zа-яА-Я\s-]+$/)
    .withMessage('Имя может содержать только буквы, пробелы и дефисы')
    .trim();
// Комбинированная валидация для регистрации (без confirmPassword)
exports.registerValidation = [
    exports.validateEmail,
    exports.validatePassword,
    exports.validateName,
    exports.validate
];
// Валидация для входа
exports.loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .withMessage('Введите корректный email')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Введите пароль'),
    exports.validate
];
// Валидация загрузки файла
exports.fileUploadValidation = [
    (0, express_validator_1.body)('name')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Название файла не должно превышать 255 символов')
        .trim(),
    (0, express_validator_1.body)('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic должен быть булевым значением'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('Теги должны быть массивом'),
    exports.validate
];
// Валидация смены пароля
exports.changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword')
        .notEmpty()
        .withMessage('Введите текущий пароль'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('Новый пароль должен содержать минимум 8 символов')
        .matches(/[A-Z]/)
        .withMessage('Пароль должен содержать заглавную букву')
        .matches(/[a-z]/)
        .withMessage('Пароль должен содержать строчную букву')
        .matches(/[0-9]/)
        .withMessage('Пароль должен содержать цифру'),
    exports.validate
];
//# sourceMappingURL=validation.js.map