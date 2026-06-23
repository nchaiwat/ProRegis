import { ConfigService } from '@nestjs/config';
export declare class TelegramService {
    private readonly configService;
    private readonly logger;
    private readonly apiBaseUrl;
    private readonly botToken;
    private readonly groupId;
    constructor(configService: ConfigService);
    sendMessage(text: string): Promise<boolean>;
}
