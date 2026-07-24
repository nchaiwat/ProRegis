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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpController = void 0;
const common_1 = require("@nestjs/common");
const otp_service_1 = require("./otp.service");
class RequestOtpDto {
    contact;
    phone;
    channel;
}
class VerifyOtpDto {
    contact;
    phone;
    code;
}
let OtpController = class OtpController {
    otpService;
    constructor(otpService) {
        this.otpService = otpService;
    }
    async requestOtp(body) {
        const contact = body.contact || body.phone;
        if (!contact) {
            throw new common_1.BadRequestException('Contact or phone number is required.');
        }
        const channel = body.channel || (contact.includes('@') ? 'email' : 'sms');
        return this.otpService.generateAndSendOtp(contact, channel);
    }
    async verifyOtp(body) {
        const contact = body.contact || body.phone;
        if (!contact) {
            throw new common_1.BadRequestException('Contact or phone number is required.');
        }
        const isVerified = await this.otpService.verifyOtp(contact, body.code);
        return { success: isVerified };
    }
};
exports.OtpController = OtpController;
__decorate([
    (0, common_1.Post)('request'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RequestOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "requestOtp", null);
__decorate([
    (0, common_1.Post)('verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], OtpController.prototype, "verifyOtp", null);
exports.OtpController = OtpController = __decorate([
    (0, common_1.Controller)('otp'),
    __metadata("design:paramtypes", [otp_service_1.OtpService])
], OtpController);
//# sourceMappingURL=otp.controller.js.map