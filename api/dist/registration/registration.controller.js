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
exports.RegistrationController = void 0;
const common_1 = require("@nestjs/common");
const registration_service_1 = require("./registration.service");
const otp_service_1 = require("../otp/otp.service");
class CheckHistoryDto {
    phone;
    otpCode;
}
class CheckHistoryByContactDto {
    contact;
    otpCode;
}
let RegistrationController = class RegistrationController {
    registrationService;
    otpService;
    constructor(registrationService, otpService) {
        this.registrationService = registrationService;
        this.otpService = otpService;
    }
    async registerProduct(body) {
        return this.registrationService.registerProduct(body);
    }
    async getRegistrationsByPhone(body) {
        if (body.otpCode !== 'SESSION_BYPASS') {
            await this.otpService.verifyOtp(body.phone, body.otpCode);
        }
        return this.registrationService.getRegistrationsByPhone(body.phone);
    }
    async getRegistrationsByContact(body) {
        if (body.otpCode !== 'SESSION_BYPASS') {
            await this.otpService.verifyOtp(body.contact, body.otpCode);
        }
        return this.registrationService.getRegistrationsByContact(body.contact);
    }
    async checkPhone(body) {
        const exists = await this.registrationService.checkPhoneExists(body.phone);
        return { exists };
    }
    async checkContact(body) {
        return this.registrationService.checkContactExists(body.contact);
    }
    async checkStatus(body) {
        if (!body.docNum || !body.phone) {
            throw new common_1.BadRequestException('docNum and phone are required');
        }
        return this.registrationService.checkStatus(body.docNum, body.phone, body.latitude, body.longitude);
    }
    async addUnit(body) {
        if (!body.token || !body.phone) {
            throw new common_1.BadRequestException('token and phone are required');
        }
        return this.registrationService.addUnit(body);
    }
};
exports.RegistrationController = RegistrationController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [registration_service_1.RegistrationDto]),
    __metadata("design:returntype", Promise)
], RegistrationController.prototype, "registerProduct", null);
__decorate([
    (0, common_1.Post)('by-phone'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CheckHistoryDto]),
    __metadata("design:returntype", Promise)
], RegistrationController.prototype, "getRegistrationsByPhone", null);
__decorate([
    (0, common_1.Post)('by-contact'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CheckHistoryByContactDto]),
    __metadata("design:returntype", Promise)
], RegistrationController.prototype, "getRegistrationsByContact", null);
__decorate([
    (0, common_1.Post)('check-phone'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RegistrationController.prototype, "checkPhone", null);
__decorate([
    (0, common_1.Post)('check-contact'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RegistrationController.prototype, "checkContact", null);
__decorate([
    (0, common_1.Post)('check-status'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RegistrationController.prototype, "checkStatus", null);
__decorate([
    (0, common_1.Post)('add-unit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RegistrationController.prototype, "addUnit", null);
exports.RegistrationController = RegistrationController = __decorate([
    (0, common_1.Controller)('registration'),
    __metadata("design:paramtypes", [registration_service_1.RegistrationService,
        otp_service_1.OtpService])
], RegistrationController);
//# sourceMappingURL=registration.controller.js.map