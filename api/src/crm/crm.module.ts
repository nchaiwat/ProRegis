import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from '../registration/registration.entity';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registration]),
    AuditModule,
  ],
  providers: [CrmService],
  controllers: [CrmController],
})
export class CrmModule {}
