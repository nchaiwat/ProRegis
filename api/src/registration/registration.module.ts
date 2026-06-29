import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { Registration } from './registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { OtpModule } from '../otp/otp.module';

import { GenerationLog } from '../backoffice/generation-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Registration, ProductionOrder, GenerationLog]),
    TelegramModule,
    OtpModule,
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [RegistrationService],
})
export class RegistrationModule {}


