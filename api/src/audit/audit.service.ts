import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { TransactionLog } from './transaction-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(TransactionLog)
    private readonly transactionLogRepository: Repository<TransactionLog>,
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

  async recordTransactionLog(params: {
    category: 'ciam_sso' | 'security_break_glass' | 'system_setting' | string;
    action: string;
    status?: 'success' | 'failed' | 'warning' | 'info' | string;
    message: string;
    details?: any;
    recordsCount?: number;
    durationMs?: number;
    triggeredBy: string;
  }): Promise<TransactionLog> {
    const detailsStr =
      params.details !== undefined && params.details !== null
        ? typeof params.details === 'string'
          ? params.details
          : JSON.stringify(params.details)
        : null;

    const entry = this.transactionLogRepository.create({
      category: params.category,
      action: params.action,
      status: params.status || 'success',
      message: params.message,
      details: detailsStr,
      recordsCount: params.recordsCount ?? 0,
      durationMs: params.durationMs ?? 0,
      triggeredBy: params.triggeredBy,
    });
    return this.transactionLogRepository.save(entry);
  }

  async getTransactionLogs(limit = 100): Promise<TransactionLog[]> {
    return this.transactionLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
