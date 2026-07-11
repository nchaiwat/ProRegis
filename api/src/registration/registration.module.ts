import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { Registration } from './registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { OtpModule } from '../otp/otp.module';
import { SapModule } from '../sap/sap.module';

import { GenerationLog } from '../backoffice/generation-log.entity';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { ProductMetadata } from '../products/product-metadata.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registration, ProductionOrder, GenerationLog, SystemSetting, ProductMetadata]),
    TelegramModule,
    OtpModule,
    SapModule,
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [RegistrationService],
})
export class RegistrationModule {}


