import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
export declare class AuditService {
    private readonly auditRepository;
    constructor(auditRepository: Repository<AuditLog>);
    logAction(actorUsername: string, action: string, resource: string, resourceId?: string | null, ipAddress?: string | null, userAgent?: string | null, details?: any): Promise<AuditLog>;
}
