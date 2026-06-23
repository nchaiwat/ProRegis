import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackofficeController } from './backoffice.controller';
import { BackofficeService } from './backoffice.service';
import { GenerationLog } from './generation-log.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { Registration } from '../registration/registration.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { SapModule } from '../sap/sap.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GenerationLog, ProductionOrder, Registration]),
    TelegramModule,
    SapModule,
  ],
  controllers: [BackofficeController],
  providers: [BackofficeService],
  exports: [BackofficeService], // Export เผื่อ module อื่นใช้ decryptToken
})
export class BackofficeModule {}


