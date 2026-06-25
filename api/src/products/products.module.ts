import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductMetadata } from './product-metadata.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { SapModule } from '../sap/sap.module';
import { BackofficeModule } from '../backoffice/backoffice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductMetadata, ProductionOrder]),
    SapModule,
    forwardRef(() => BackofficeModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
