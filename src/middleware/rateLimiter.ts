import rateLimit from 'express-rate-limit';

// Определяем, нужно ли применять ограничения
const isRateLimitEnabled = process.env.ENABLE_RATE_LIMIT === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

// В режиме разработки - очень мягкие ограничения
const developmentLimits = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 attempts (практически без ограничений)
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
};

// В безопасном/продакшн режиме - строгие ограничения
const secureLimits = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false
};

// Выбираем конфигурацию в зависимости от режима
const getLimits = () => {
    if (isDevelopment && !isRateLimitEnabled) {
        return developmentLimits;
    }
    return secureLimits;
};

export const authLimiter = rateLimit({
    ...getLimits(),
    message: { error: 'Слишком много попыток, пожалуйста, попробуйте позже' }
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment && !isRateLimitEnabled ? 1000 : 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: isDevelopment && !isRateLimitEnabled ? 500 : 50,
    message: { error: 'Upload limit reached, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});