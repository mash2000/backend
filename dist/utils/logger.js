"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const logDir = process.env.LOG_DIR || 'logs';
const transports = [
    new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }),
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
    }),
    new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
    })
];
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports
});
exports.default = logger;
//# sourceMappingURL=logger.js.map