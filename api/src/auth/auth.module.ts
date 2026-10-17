import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { SystemSetting } from '../backoffice/system-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting]), UsersModule, AuditModule],
  controllers: [AuthController],
})
export class AuthModule {}
