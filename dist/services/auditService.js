"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
class AuditService {
    constructor() {
        this.logPath = path_1.default.join(__dirname, '../../logs/audit.log');
    }
    async log(entry) {
        const logEntry = {
            ...entry,
            timestamp: new Date().toISOString()
        };
        logger_1.default.info('Audit:', logEntry);
        // Write to audit file
        try {
            const logDir = path_1.default.dirname(this.logPath);
            if (!fs_1.default.existsSync(logDir)) {
                fs_1.default.mkdirSync(logDir, { recursive: true });
            }
            fs_1.default.appendFileSync(this.logPath, JSON.stringify(logEntry) + '\n');
        }
        catch (error) {
            console.error('Failed to write audit log:', error);
        }
    }
    async getUserActions(userId, limit = 100) {
        const logs = [];
        try {
            if (fs_1.default.existsSync(this.logPath)) {
                const content = fs_1.default.readFileSync(this.logPath, 'utf-8');
                const lines = content.split('\n').filter(line => line.trim());
                const userLines = lines.filter(line => {
                    try {
                        const log = JSON.parse(line);
                        return log.userId === userId;
                    }
                    catch {
                        return false;
                    }
                });
                const lastLines = userLines.slice(-limit);
                for (const line of lastLines) {
                    try {
                        logs.push(JSON.parse(line));
                    }
                    catch (e) {
                        console.error('Failed to parse audit line:', e);
                    }
                }
            }
        }
        catch (error) {
            console.error('Failed to read audit logs:', error);
        }
        return logs.reverse();
    }
}
exports.default = new AuditService();
//# sourceMappingURL=auditService.js.map