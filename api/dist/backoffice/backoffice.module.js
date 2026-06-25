"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackofficeModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const backoffice_controller_1 = require("./backoffice.controller");
const backoffice_service_1 = require("./backoffice.service");
const generation_log_entity_1 = require("./generation-log.entity");
const production_order_entity_1 = require("../production-order/production-order.entity");
const registration_entity_1 = require("../registration/registration.entity");
const telegram_module_1 = require("../telegram/telegram.module");
const sap_module_1 = require("../sap/sap.module");
const products_module_1 = require("../products/products.module");
let BackofficeModule = class BackofficeModule {
};
exports.BackofficeModule = BackofficeModule;
exports.BackofficeModule = BackofficeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([generation_log_entity_1.GenerationLog, production_order_entity_1.ProductionOrder, registration_entity_1.Registration]),
            telegram_module_1.TelegramModule,
            sap_module_1.SapModule,
            (0, common_1.forwardRef)(() => products_module_1.ProductsModule),
        ],
        controllers: [backoffice_controller_1.BackofficeController],
        providers: [backoffice_service_1.BackofficeService],
        exports: [backoffice_service_1.BackofficeService],
    })
], BackofficeModule);
//# sourceMappingURL=backoffice.module.js.map