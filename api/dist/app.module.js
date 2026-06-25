"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const products_module_1 = require("./products/products.module");
const otp_module_1 = require("./otp/otp.module");
const registration_module_1 = require("./registration/registration.module");
const backoffice_module_1 = require("./backoffice/backoffice.module");
const users_module_1 = require("./users/users.module");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const crm_module_1 = require("./crm/crm.module");
const sap_module_1 = require("./sap/sap.module");
const registration_entity_1 = require("./registration/registration.entity");
const generation_log_entity_1 = require("./backoffice/generation-log.entity");
const user_entity_1 = require("./users/user.entity");
const role_permission_entity_1 = require("./users/role-permission.entity");
const audit_log_entity_1 = require("./audit/audit-log.entity");
const production_order_entity_1 = require("./production-order/production-order.entity");
const product_metadata_entity_1 = require("./products/product-metadata.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const host = configService.get('DB_HOST', '127.0.0.1');
                    const port = configService.get('DB_PORT', 5439);
                    const username = configService.get('DB_USERNAME', 'postgres');
                    const password = configService.get('DB_PASSWORD', 'postgrespassword');
                    const database = configService.get('DB_DATABASE', 'proregis');
                    console.log('[DEBUG DB CONFIG]', { host, port, username, passwordLength: password?.length, database });
                    return {
                        type: 'postgres',
                        host,
                        port,
                        username,
                        password,
                        database,
                        entities: [registration_entity_1.Registration, generation_log_entity_1.GenerationLog, user_entity_1.User, audit_log_entity_1.AuditLog, production_order_entity_1.ProductionOrder, role_permission_entity_1.RolePermission, product_metadata_entity_1.ProductMetadata],
                        synchronize: true,
                    };
                },
            }),
            products_module_1.ProductsModule,
            otp_module_1.OtpModule,
            registration_module_1.RegistrationModule,
            backoffice_module_1.BackofficeModule,
            users_module_1.UsersModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            crm_module_1.CrmModule,
            sap_module_1.SapModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map