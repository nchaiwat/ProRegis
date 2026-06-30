import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function formatThaiDateTime(date: Date): string {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear() + 543;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${minutes} น.`;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly apiBaseUrl: string;
  private readonly botToken: string;
  private readonly groupId: string;

  constructor(private readonly configService: ConfigService) {
    this.apiBaseUrl = (this.configService.get<string>('TELEGRAM_API_BASE_URL', 'https://api.telegram.org') || '').replace(/['"]/g, '');
    this.botToken = (this.configService.get<string>('TELEGRAM_BOT_TOKEN', '') || '').replace(/['"]/g, '');
    this.groupId = (this.configService.get<string>('TELEGRAM_GROUP_ID', '-5394050672') || '').replace(/['"]/g, '');
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

  async sendDirectMessage(chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
    if (!this.botToken) {
      this.logger.warn('[TelegramService] TELEGRAM_BOT_TOKEN is not configured. Direct message skipped.');
      return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
    }

    // Sanitize chatId (if user entered @123456789, strip the @ to make it numeric)
    let cleanChatId = (chatId || '').trim().replace(/['"]/g, '');
    if (cleanChatId.startsWith('@')) {
      const numericPart = cleanChatId.substring(1);
      if (/^\d+$/.test(numericPart) || /^-?\d+$/.test(numericPart)) {
        cleanChatId = numericPart;
      }
    }

    try {
      const url = `${this.apiBaseUrl.replace(/\/$/, '')}/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const resText = await response.text();
        let errMsg = response.statusText;
        try {
          const parsed = JSON.parse(resText);
          if (parsed.description) {
            errMsg = parsed.description;
          }
        } catch {}
        this.logger.error(`[TelegramService] Failed to send direct to ${cleanChatId}: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      this.logger.log(`[TelegramService] Message sent successfully to direct chat ${cleanChatId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('[TelegramService] Error sending direct message to Telegram:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
