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
exports.AiCopilotController = exports.CiamAgentController = exports.CiamDirectoryController = exports.CiamSsoAuthController = exports.CiamSettingsController = void 0;
const common_1 = require("@nestjs/common");
const ciam_service_1 = require("./ciam.service");
const audit_service_1 = require("../audit/audit.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
function extractClientIp(req) {
    return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        null);
}
let CiamSettingsController = class CiamSettingsController {
    ciamService;
    constructor(ciamService) {
        this.ciamService = ciamService;
    }
    async getCiamSsoSettings() {
        return this.ciamService.getCiamSettings();
    }
    async updateCiamSsoSettings(body, req) {
        const actor = req.user?.username || 'admin';
        const ip = extractClientIp(req);
        return this.ciamService.updateCiamSettings(body, actor, ip);
    }
    async testConnection(body) {
        return this.ciamService.testCiamConnection(body?.ciam_base_url);
    }
};
exports.CiamSettingsController = CiamSettingsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CiamSettingsController.prototype, "getCiamSsoSettings", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CiamSettingsController.prototype, "updateCiamSsoSettings", null);
__decorate([
    (0, common_1.Post)('test-connection'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CiamSettingsController.prototype, "testConnection", null);
exports.CiamSettingsController = CiamSettingsController = __decorate([
    (0, common_1.Controller)(['settings/ciam-sso', 'api/settings/ciam-sso']),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN'),
    __metadata("design:paramtypes", [ciam_service_1.CiamService])
], CiamSettingsController);
let CiamSsoAuthController = class CiamSsoAuthController {
    ciamService;
    constructor(ciamService) {
        this.ciamService = ciamService;
    }
    async getSsoConfig() {
        return this.ciamService.getSsoConfig();
    }
    async getAuthorizeUrl(body) {
        return this.ciamService.createAuthorizeUrl(body?.redirect_uri);
    }
    async ssoCallback(body, req) {
        const ip = extractClientIp(req);
        const userAgent = req.headers['user-agent'] || null;
        return this.ciamService.handleSsoCallback(body, ip, userAgent);
    }
    async breakGlassToggle(body, req) {
        const actor = req.user?.username || 'admin';
        const ip = extractClientIp(req);
        return this.ciamService.toggleBreakGlass(Boolean(body?.break_glass_active), body?.reason || '', actor, ip);
    }
};
exports.CiamSsoAuthController = CiamSsoAuthController;
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CiamSsoAuthController.prototype, "getSsoConfig", null);
__decorate([
    (0, common_1.Post)('authorize-url'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CiamSsoAuthController.prototype, "getAuthorizeUrl", null);
__decorate([
    (0, common_1.Post)('callback'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CiamSsoAuthController.prototype, "ssoCallback", null);
__decorate([
    (0, common_1.Post)('break-glass-toggle'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CiamSsoAuthController.prototype, "breakGlassToggle", null);
exports.CiamSsoAuthController = CiamSsoAuthController = __decorate([
    (0, common_1.Controller)(['auth/sso', 'api/auth/sso']),
    __metadata("design:paramtypes", [ciam_service_1.CiamService])
], CiamSsoAuthController);
let CiamDirectoryController = class CiamDirectoryController {
    ciamService;
    constructor(ciamService) {
        this.ciamService = ciamService;
    }
    async listAccounts(apiKey, timestamp, req, status, department, search) {
        await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, extractClientIp(req) || undefined);
        return this.ciamService.listAccountsForCiam({ status, department, search });
    }
    async provisionAccount(apiKey, timestamp, req, body) {
        await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, extractClientIp(req) || undefined);
        return this.ciamService.provisionAccountFromCiam(body);
    }
    async updateAccountStatus(apiKey, timestamp, req, username, body) {
        await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, extractClientIp(req) || undefined);
        return this.ciamService.updateAccountStatusFromCiam(username, body);
    }
};
exports.CiamDirectoryController = CiamDirectoryController;
__decorate([
    (0, common_1.Get)('accounts'),
    __param(0, (0, common_1.Headers)('x-management-api-key')),
    __param(1, (0, common_1.Headers)('x-request-timestamp')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('department')),
    __param(5, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CiamDirectoryController.prototype, "listAccounts", null);
__decorate([
    (0, common_1.Post)('accounts'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Headers)('x-management-api-key')),
    __param(1, (0, common_1.Headers)('x-request-timestamp')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], CiamDirectoryController.prototype, "provisionAccount", null);
__decorate([
    (0, common_1.Patch)('accounts/:username/status'),
    __param(0, (0, common_1.Headers)('x-management-api-key')),
    __param(1, (0, common_1.Headers)('x-request-timestamp')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Param)('username')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], CiamDirectoryController.prototype, "updateAccountStatus", null);
exports.CiamDirectoryController = CiamDirectoryController = __decorate([
    (0, common_1.Controller)(['v1/directory', 'api/v1/directory']),
    __metadata("design:paramtypes", [ciam_service_1.CiamService])
], CiamDirectoryController);
let CiamAgentController = class CiamAgentController {
    ciamService;
    constructor(ciamService) {
        this.ciamService = ciamService;
    }
    async syncNow() {
        const result = await this.ciamService.runHeartbeatCycle(true);
        return {
            status: result.online ? 'success' : 'offline',
            ...result,
        };
    }
};
exports.CiamAgentController = CiamAgentController;
__decorate([
    (0, common_1.Post)('sync-now'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CiamAgentController.prototype, "syncNow", null);
exports.CiamAgentController = CiamAgentController = __decorate([
    (0, common_1.Controller)(['settings/ciam-agent', 'api/settings/ciam-agent']),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN'),
    __metadata("design:paramtypes", [ciam_service_1.CiamService])
], CiamAgentController);
let AiCopilotController = class AiCopilotController {
    ciamService;
    auditService;
    constructor(ciamService, auditService) {
        this.ciamService = ciamService;
        this.auditService = auditService;
    }
    async getAiSettings() {
        return this.ciamService.getAiSettings();
    }
    async updateAiSettings(body, req) {
        const actor = req.user?.username || 'admin';
        const ip = extractClientIp(req);
        return this.ciamService.updateAiSettings(body, actor, ip);
    }
    async testAiConnection(body) {
        return this.ciamService.testAiConnection(body);
    }
    async chat(body, req) {
        return this.ciamService.chatWithCopilot(body?.messages || [], req.user);
    }
    async getTransactionLogs(limit) {
        const parsedLimit = limit ? parseInt(limit, 10) : 100;
        const logs = await this.auditService.getTransactionLogs(parsedLimit);
        return { logs };
    }
};
exports.AiCopilotController = AiCopilotController;
__decorate([
    (0, common_1.Get)(['settings/ai', 'api/settings/ai']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiCopilotController.prototype, "getAiSettings", null);
__decorate([
    (0, common_1.Put)(['settings/ai', 'api/settings/ai']),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiCopilotController.prototype, "updateAiSettings", null);
__decorate([
    (0, common_1.Post)(['settings/ai/test', 'api/settings/ai/test']),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiCopilotController.prototype, "testAiConnection", null);
__decorate([
    (0, common_1.Post)(['ai/chat', 'api/ai/chat']),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiCopilotController.prototype, "chat", null);
__decorate([
    (0, common_1.Get)(['backoffice/transaction-logs', 'api/backoffice/transaction-logs']),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiCopilotController.prototype, "getTransactionLogs", null);
exports.AiCopilotController = AiCopilotController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [ciam_service_1.CiamService,
        audit_service_1.AuditService])
], AiCopilotController);
//# sourceMappingURL=ciam.controller.js.map