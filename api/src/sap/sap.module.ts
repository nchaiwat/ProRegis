import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SapService } from './sap.service';
import { SystemSetting } from '../backoffice/system-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  providers: [SapService],
  exports: [SapService],
})
export class SapModule {}
