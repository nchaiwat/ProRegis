import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';

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

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
  ) {}

  private async getConfigs() {
    const tokenSetting = await this.systemSettingRepository.findOne({ where: { key: 'TELEGRAM_BOT_TOKEN' } });
    const botToken = (tokenSetting ? tokenSetting.value : this.configService.get<string>('TELEGRAM_BOT_TOKEN', '') || '').replace(/['"]/g, '');

    const groupSetting = await this.systemSettingRepository.findOne({ where: { key: 'TELEGRAM_GROUP_ID' } });
    const groupId = (groupSetting ? groupSetting.value : this.configService.get<string>('TELEGRAM_GROUP_ID', '-5394050672') || '').replace(/['"]/g, '');

    const urlSetting = await this.systemSettingRepository.findOne({ where: { key: 'TELEGRAM_API_BASE_URL' } });
    const apiBaseUrl = (urlSetting ? urlSetting.value : this.configService.get<string>('TELEGRAM_API_BASE_URL', 'https://api.telegram.org') || '').replace(/['"]/g, '');

    return { botToken, groupId, apiBaseUrl };
  }

  async sendMessage(text: string): Promise<boolean> {
    const { botToken, groupId, apiBaseUrl } = await this.getConfigs();

    if (!botToken) {
      this.logger.warn('[TelegramService] TELEGRAM_BOT_TOKEN is not configured. Message skipped.');
      return false;
    }

    try {
      const url = `${apiBaseUrl.replace(/\/$/, '')}/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: groupId,
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const resText = await response.text();
        this.logger.error(`[TelegramService] Failed to send: ${response.statusText} (${resText})`);
        return false;
      }

      this.logger.log(`[TelegramService] Message sent successfully to group ${groupId}`);
      return true;
    } catch (error) {
      this.logger.error('[TelegramService] Error sending message to Telegram:', error);
      return false;
    }
  }

  async sendDirectMessage(chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
    const { botToken, apiBaseUrl } = await this.getConfigs();

    if (!botToken) {
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
      const url = `${apiBaseUrl.replace(/\/$/, '')}/bot${botToken}/sendMessage`;
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
