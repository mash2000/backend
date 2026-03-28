import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export interface AuditLog {
    userId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: any;
    ip: string;
    userAgent: string;
    timestamp: Date;
}

class AuditService {
    private logPath = path.join(__dirname, '../../logs/audit.log');

    async log(entry: AuditLog): Promise<void> {
        const logEntry = {
            ...entry,
            timestamp: new Date().toISOString()
        };

        logger.info('Audit:', logEntry);

        // Write to audit file
        try {
            const logDir = path.dirname(this.logPath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            fs.appendFileSync(
                this.logPath,
                JSON.stringify(logEntry) + '\n'
            );
        } catch (error) {
            console.error('Failed to write audit log:', error);
        }
    }

    async getUserActions(userId: string, limit: number = 100): Promise<AuditLog[]> {
        const logs: AuditLog[] = [];
        
        try {
            if (fs.existsSync(this.logPath)) {
                const content = fs.readFileSync(this.logPath, 'utf-8');
                const lines = content.split('\n').filter(line => line.trim());
                
                const userLines = lines.filter(line => {
                    try {
                        const log = JSON.parse(line);
                        return log.userId === userId;
                    } catch {
                        return false;
                    }
                });
                
                const lastLines = userLines.slice(-limit);
                
                for (const line of lastLines) {
                    try {
                        logs.push(JSON.parse(line));
                    } catch (e) {
                        console.error('Failed to parse audit line:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to read audit logs:', error);
        }
        
        return logs.reverse();
    }
}

export default new AuditService();