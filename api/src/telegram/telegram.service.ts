import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly apiBaseUrl: string;
  private readonly botToken: string;
  private readonly groupId: string;

  constructor(private readonly configService: ConfigService) {
    this.apiBaseUrl = this.configService.get<string>('TELEGRAM_API_BASE_URL', 'https://api.telegram.org');
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.groupId = this.configService.get<string>('TELEGRAM_GROUP_ID', '-5394050672');
  }

  async sendMessage(text: string): Promise<boolean> {
    if (!this.botToken) {
      this.logger.warn('[TelegramService] TELEGRAM_BOT_TOKEN is not configured. Message skipped.');
      return false;
    }

    try {
      const url = `${this.apiBaseUrl.replace(/\/$/, '')}/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.groupId,
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const resText = await response.text();
        this.logger.error(`[TelegramService] Failed to send: ${response.statusText} (${resText})`);
        return false;
      }

      this.logger.log(`[TelegramService] Message sent successfully to group ${this.groupId}`);
      return true;
    } catch (error) {
      this.logger.error('[TelegramService] Error sending message to Telegram:', error);
      return false;
    }
  }
}
