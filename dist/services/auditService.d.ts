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
declare class AuditService {
    private logPath;
    log(entry: AuditLog): Promise<void>;
    getUserActions(userId: string, limit?: number): Promise<AuditLog[]>;
}
declare const _default: AuditService;
export default _default;
//# sourceMappingURL=auditService.d.ts.map