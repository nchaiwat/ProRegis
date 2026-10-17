import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { TransactionLog } from './transaction-log.entity';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, TransactionLog])],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
