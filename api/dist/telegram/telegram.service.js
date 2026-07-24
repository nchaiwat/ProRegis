"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
exports.formatThaiDateTime = formatThaiDateTime;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const system_setting_entity_1 = require("../backoffice/system-setting.entity");
function formatThaiDateTime(date) {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes} น.`;
}
let TelegramService = TelegramService_1 = class TelegramService {
    configService;
    systemSettingRepository;
    logger = new common_1.Logger(TelegramService_1.name);
    constructor(configService, systemSettingRepository) {
        this.configService = configService;
        this.systemSettingRepository = systemSettingRepository;
    }
    async getConfigs() {
        const tokenSetting = await this.systemSettingRepository.findOne({ where: { key: 'TELEGRAM_BOT_TOKEN' } });
        const botToken = (tokenSetting ? tokenSetting.value : this.configService.get('TELEGRAM_BOT_TOKEN', '') || '').replace(/['"]/g, '');
        const groupSetting = await this.systemSettingRepository.findOne({ where: { key: 'TELEGRAM_GROUP_ID' } });
        const groupId = (groupSetting ? groupSetting.value : this.configService.get('TELEGRAM_GROUP_ID', '-5394050672') || '').replace(/['"]/g, '');
        const urlSetting = await this.systemSettingRepository.findOne({ where: { key: 'TELEGRAM_API_BASE_URL' } });
        const apiBaseUrl = (urlSetting ? urlSetting.value : this.configService.get('TELEGRAM_API_BASE_URL', 'https://api.telegram.org') || '').replace(/['"]/g, '');
        return { botToken, groupId, apiBaseUrl };
    }
    async sendMessage(text) {
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
        }
        catch (error) {
            this.logger.error('[TelegramService] Error sending message to Telegram:', error);
            return false;
        }
    }
    async sendDirectMessage(chatId, text) {
        const { botToken, apiBaseUrl } = await this.getConfigs();
        if (!botToken) {
            this.logger.warn('[TelegramService] TELEGRAM_BOT_TOKEN is not configured. Direct message skipped.');
            return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
        }
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
                }
                catch { }
                this.logger.error(`[TelegramService] Failed to send direct to ${cleanChatId}: ${errMsg}`);
                return { success: false, error: errMsg };
            }
            this.logger.log(`[TelegramService] Message sent successfully to direct chat ${cleanChatId}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error('[TelegramService] Error sending direct message to Telegram:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(system_setting_entity_1.SystemSetting)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map