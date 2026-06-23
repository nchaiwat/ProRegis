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
exports.BackofficeController = void 0;
const common_1 = require("@nestjs/common");
const backoffice_service_1 = require("./backoffice.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
let BackofficeController = class BackofficeController {
    backofficeService;
    constructor(backofficeService) {
        this.backofficeService = backofficeService;
    }
    async generateCsv(body, req, res) {
        const actor = req.user?.username || 'unknown';
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            'unknown';
        const rows = await this.backofficeService.generateBatch(actor, body.docNum, body.startSeq, body.quantity, ipAddress);
        const csvContent = this.backofficeService.buildCsv(rows);
        const filename = `QR_Batch_${body.docNum}_seq${String(body.startSeq).padStart(3, '0')}_qty${body.quantity}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(csvContent, 'utf8'));
    }
    decryptToken(body) {
        const result = this.backofficeService.decryptToken(body.token);
        if (!result) {
            return { success: false, error: 'Invalid or tampered QR token' };
        }
        return { success: true, docNum: result.docNum, seqNum: result.seqNum };
    }
    async getLogs(limit) {
        const parsedLimit = limit ? parseInt(limit, 10) : 100;
        const logs = await this.backofficeService.getLogs(parsedLimit);
        return { logs };
    }
    async getNextSequence(docNum) {
        if (!docNum || !/^\d{9}$/.test(docNum)) {
            return { success: false, error: 'DocNum ต้องเป็นตัวเลข 9 หลัก' };
        }
        const nextSeq = await this.backofficeService.getNextSequence(docNum);
        return { success: true, nextSeq };
    }
    async getDashboardSummary(startDate, endDate) {
        const summary = await this.backofficeService.getDashboardSummary(startDate, endDate);
        return { success: true, summary };
    }
    async getProductionTracker() {
        const data = await this.backofficeService.getProductionTrackerList();
        return { success: true, data };
    }
    async checkProduct(body) {
        return this.backofficeService.checkProduct(body.token, body.label);
    }
    async getLotSummary(docNum) {
        return this.backofficeService.getLotSummary(docNum);
    }
};
exports.BackofficeController = BackofficeController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN', 'QR_GENERATOR'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BackofficeController.prototype, "generateCsv", null);
__decorate([
    (0, common_1.Post)('decrypt'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BackofficeController.prototype, "decryptToken", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BackofficeController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)('next-sequence'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('docNum')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BackofficeController.prototype, "getNextSequence", null);
__decorate([
    (0, common_1.Get)('dashboard-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BackofficeController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)('production-tracker'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BackofficeController.prototype, "getProductionTracker", null);
__decorate([
    (0, common_1.Post)('check-product'),
    (0, common_1.HttpCode)(200),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BackofficeController.prototype, "checkProduct", null);
__decorate([
    (0, common_1.Get)('lot-summary/:docNum'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('docNum')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BackofficeController.prototype, "getLotSummary", null);
exports.BackofficeController = BackofficeController = __decorate([
    (0, common_1.Controller)('backoffice'),
    __metadata("design:paramtypes", [backoffice_service_1.BackofficeService])
], BackofficeController);
//# sourceMappingURL=backoffice.controller.js.map