import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';
export declare function formatThaiDateTime(date: Date): string;
export declare class TelegramService {
    private readonly configService;
    private readonly systemSettingRepository;
    private readonly logger;
    constructor(configService: ConfigService, systemSettingRepository: Repository<SystemSetting>);
    private getConfigs;
    sendMessage(text: string): Promise<boolean>;
    sendDirectMessage(chatId: string, text: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}
