import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { TransactionLog } from './transaction-log.entity';
export declare class AuditService {
    private readonly auditRepository;
    private readonly transactionLogRepository;
    constructor(auditRepository: Repository<AuditLog>, transactionLogRepository: Repository<TransactionLog>);
    logAction(actorUsername: string, action: string, resource: string, resourceId?: string | null, ipAddress?: string | null, userAgent?: string | null, details?: any): Promise<AuditLog>;
    recordTransactionLog(params: {
        category: 'ciam_sso' | 'security_break_glass' | 'system_setting' | string;
        action: string;
        status?: 'success' | 'failed' | 'warning' | 'info' | string;
        message: string;
        details?: any;
        recordsCount?: number;
        durationMs?: number;
        triggeredBy: string;
    }): Promise<TransactionLog>;
    getTransactionLogs(limit?: number): Promise<TransactionLog[]>;
}
