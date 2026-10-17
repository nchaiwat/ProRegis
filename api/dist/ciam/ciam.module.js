"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CiamModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const system_setting_entity_1 = require("../backoffice/system-setting.entity");
const user_entity_1 = require("../users/user.entity");
const registration_entity_1 = require("../registration/registration.entity");
const production_order_entity_1 = require("../production-order/production-order.entity");
const users_module_1 = require("../users/users.module");
const audit_module_1 = require("../audit/audit.module");
const telegram_module_1 = require("../telegram/telegram.module");
const ciam_service_1 = require("./ciam.service");
const ciam_controller_1 = require("./ciam.controller");
let CiamModule = class CiamModule {
};
exports.CiamModule = CiamModule;
exports.CiamModule = CiamModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([system_setting_entity_1.SystemSetting, user_entity_1.User, registration_entity_1.Registration, production_order_entity_1.ProductionOrder]),
            users_module_1.UsersModule,
            audit_module_1.AuditModule,
            telegram_module_1.TelegramModule,
        ],
        controllers: [
            ciam_controller_1.CiamSettingsController,
            ciam_controller_1.CiamSsoAuthController,
            ciam_controller_1.CiamDirectoryController,
            ciam_controller_1.CiamAgentController,
            ciam_controller_1.AiCopilotController,
        ],
        providers: [ciam_service_1.CiamService],
        exports: [ciam_service_1.CiamService],
    })
], CiamModule);
//# sourceMappingURL=ciam.module.js.map