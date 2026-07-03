import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { SystemSetting } from '../backoffice/system-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
