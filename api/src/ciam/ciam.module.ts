import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { User } from '../users/user.entity';
import { Registration } from '../registration/registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { TelegramModule } from '../telegram/telegram.module';
import { CiamService } from './ciam.service';
import {
  CiamSettingsController,
  CiamSsoAuthController,
  CiamDirectoryController,
  CiamAgentController,
  AiCopilotController,
} from './ciam.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSetting, User, Registration, ProductionOrder]),
    UsersModule,
    AuditModule,
    TelegramModule,
  ],
  controllers: [
    CiamSettingsController,
    CiamSsoAuthController,
    CiamDirectoryController,
    CiamAgentController,
    AiCopilotController,
  ],
  providers: [CiamService],
  exports: [CiamService],
})
export class CiamModule {}
