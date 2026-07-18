import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { AuditLog } from '../audit/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, AuditLog])],
  controllers: [OtpController],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
