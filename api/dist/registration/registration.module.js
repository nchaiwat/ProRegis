"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const registration_service_1 = require("./registration.service");
const registration_controller_1 = require("./registration.controller");
const registration_entity_1 = require("./registration.entity");
const production_order_entity_1 = require("../production-order/production-order.entity");
const telegram_module_1 = require("../telegram/telegram.module");
const otp_module_1 = require("../otp/otp.module");
let RegistrationModule = class RegistrationModule {
};
exports.RegistrationModule = RegistrationModule;
exports.RegistrationModule = RegistrationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([registration_entity_1.Registration, production_order_entity_1.ProductionOrder]),
            telegram_module_1.TelegramModule,
            otp_module_1.OtpModule,
        ],
        controllers: [registration_controller_1.RegistrationController],
        providers: [registration_service_1.RegistrationService],
        exports: [registration_service_1.RegistrationService],
    })
], RegistrationModule);
//# sourceMappingURL=registration.module.js.map