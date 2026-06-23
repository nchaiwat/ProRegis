import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async logAction(
    actorUsername: string,
    action: string,
    resource: string,
    resourceId: string | null = null,
    ipAddress: string | null = null,
    userAgent: string | null = null,
    details: any = null,
  ): Promise<AuditLog> {
    const detailsStr = details ? JSON.stringify(details) : null;
    const log = this.auditRepository.create({
      actorUsername,
      action,
      resource,
      resourceId,
      ipAddress,
      userAgent,
      details: detailsStr,
    });
    return this.auditRepository.save(log);
  }
}
