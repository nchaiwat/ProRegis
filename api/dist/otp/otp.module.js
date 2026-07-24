"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const otp_service_1 = require("./otp.service");
const otp_controller_1 = require("./otp.controller");
const system_setting_entity_1 = require("../backoffice/system-setting.entity");
const audit_log_entity_1 = require("../audit/audit-log.entity");
let OtpModule = class OtpModule {
};
exports.OtpModule = OtpModule;
exports.OtpModule = OtpModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([system_setting_entity_1.SystemSetting, audit_log_entity_1.AuditLog])],
        controllers: [otp_controller_1.OtpController],
        providers: [otp_service_1.OtpService],
        exports: [otp_service_1.OtpService],
    })
], OtpModule);
//# sourceMappingURL=otp.module.js.map