import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductMetadata } from './product-metadata.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { SapModule } from '../sap/sap.module';
import { BackofficeModule } from '../backoffice/backoffice.module';

import { GenerationLog } from '../backoffice/generation-log.entity';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { AuditLog } from '../audit/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductMetadata, ProductionOrder, GenerationLog, SystemSetting, AuditLog]),
    SapModule,
    forwardRef(() => BackofficeModule),
    TelegramModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
