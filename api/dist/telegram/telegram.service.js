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
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let TelegramService = TelegramService_1 = class TelegramService {
    configService;
    logger = new common_1.Logger(TelegramService_1.name);
    apiBaseUrl;
    botToken;
    groupId;
    constructor(configService) {
        this.configService = configService;
        this.apiBaseUrl = this.configService.get('TELEGRAM_API_BASE_URL', 'https://api.telegram.org');
        this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN', '');
        this.groupId = this.configService.get('TELEGRAM_GROUP_ID', '-5394050672');
    }
    async sendMessage(text) {
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
        }
        catch (error) {
            this.logger.error('[TelegramService] Error sending message to Telegram:', error);
            return false;
        }
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map