"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const products_service_1 = require("./products.service");
const products_controller_1 = require("./products.controller");
const product_metadata_entity_1 = require("./product-metadata.entity");
const production_order_entity_1 = require("../production-order/production-order.entity");
const sap_module_1 = require("../sap/sap.module");
const backoffice_module_1 = require("../backoffice/backoffice.module");
const generation_log_entity_1 = require("../backoffice/generation-log.entity");
const system_setting_entity_1 = require("../backoffice/system-setting.entity");
const telegram_module_1 = require("../telegram/telegram.module");
const audit_log_entity_1 = require("../audit/audit-log.entity");
const users_module_1 = require("../users/users.module");
let ProductsModule = class ProductsModule {
};
exports.ProductsModule = ProductsModule;
exports.ProductsModule = ProductsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([product_metadata_entity_1.ProductMetadata, production_order_entity_1.ProductionOrder, generation_log_entity_1.GenerationLog, system_setting_entity_1.SystemSetting, audit_log_entity_1.AuditLog]),
            sap_module_1.SapModule,
            (0, common_1.forwardRef)(() => backoffice_module_1.BackofficeModule),
            telegram_module_1.TelegramModule,
            users_module_1.UsersModule,
        ],
        controllers: [products_controller_1.ProductsController],
        providers: [products_service_1.ProductsService],
        exports: [products_service_1.ProductsService],
    })
], ProductsModule);
//# sourceMappingURL=products.module.js.map