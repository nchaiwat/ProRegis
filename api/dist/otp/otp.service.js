"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
let OtpService = class OtpService {
    otpStore = new Map();
    async generateAndSendOtp(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const code = '123456';
        const durationSeconds = 300;
        const expiresAt = Date.now() + durationSeconds * 1000;
        this.otpStore.set(cleanPhone, { code, expiresAt });
        console.log(`[OTP SERVICE] Generated OTP ${code} for phone +66${cleanPhone}`);
        return {
            success: true,
            expiresIn: durationSeconds,
        };
    }
    async verifyOtp(phone, code) {
        const cleanPhone = phone.replace(/\D/g, '');
        const data = this.otpStore.get(cleanPhone);
        if (!data) {
            throw new common_1.BadRequestException('No active OTP request found for this phone number.');
        }
        if (Date.now() > data.expiresAt) {
            this.otpStore.delete(cleanPhone);
            throw new common_1.BadRequestException('OTP code has expired. Please request a new one.');
        }
        if (data.code !== code) {
            throw new common_1.BadRequestException('Invalid OTP code.');
        }
        this.otpStore.delete(cleanPhone);
        return true;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)()
], OtpService);
//# sourceMappingURL=otp.service.js.map