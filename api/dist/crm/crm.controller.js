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
exports.CrmController = void 0;
const common_1 = require("@nestjs/common");
const crm_service_1 = require("./crm.service");
const audit_service_1 = require("../audit/audit.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
let CrmController = class CrmController {
    crmService;
    auditService;
    constructor(crmService, auditService) {
        this.crmService = crmService;
        this.auditService = auditService;
    }
    async listRegistrations(query) {
        return this.crmService.getRegistrations(query);
    }
    async getDetails(id, req) {
        const actor = req.user?.username || 'unknown';
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            null;
        const userAgent = req.headers['user-agent'] || null;
        const registration = await this.crmService.getRegistrationDetails(id);
        await this.auditService.logAction(actor, 'VIEW_PII', 'Registration', id, ipAddress, userAgent, {
            fieldsViewed: ['firstName', 'lastName', 'phone', 'email', 'address', 'latitude', 'longitude'],
            token: registration.token,
        });
        return registration;
    }
    async exportCsv(body, req, res) {
        const actor = req.user?.username || 'unknown';
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            null;
        const userAgent = req.headers['user-agent'] || null;
        const list = await this.crmService.getAllRegistrationsForExport(body);
        await this.auditService.logAction(actor, 'EXPORT_PII', 'Registration', null, ipAddress, userAgent, {
            recordCount: list.length,
            filtersApplied: body,
        });
        const BOM = '\uFEFF';
        const header = 'Ref ID,Registered At,First Name,Last Name,Phone,Email,Address,Province,Postal Code,Product Code,QR Token,Production Order,Unit Seq,Lat,Lng,Status';
        const lines = list.map((item) => {
            const dateStr = item.registeredAt ? new Date(item.registeredAt).toISOString().split('T')[0] : '';
            const escapedAddress = `"${(item.address || '').replace(/"/g, '""')}"`;
            const escapedFirstName = `"${(item.firstName || '').replace(/"/g, '""')}"`;
            const escapedLastName = `"${(item.lastName || '').replace(/"/g, '""')}"`;
            return [
                item.id,
                dateStr,
                escapedFirstName,
                escapedLastName,
                item.phone || '',
                item.email || '',
                escapedAddress,
                item.province || '',
                item.postalCode || '',
                item.token || '',
                item.token || '',
                item.docNum || '',
                item.seqNum || '',
                item.latitude || '',
                item.longitude || '',
                item.status || '',
            ].join(',');
        });
        const csvContent = BOM + [header, ...lines].join('\r\n');
        const filename = `Customer_Registrations_Export_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(csvContent, 'utf8'));
    }
};
exports.CrmController = CrmController;
__decorate([
    (0, common_1.Get)('registrations'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [crm_service_1.CrmFilterDto]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "listRegistrations", null);
__decorate([
    (0, common_1.Get)('registrations/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "getDetails", null);
__decorate([
    (0, common_1.Post)('export'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "exportCsv", null);
exports.CrmController = CrmController = __decorate([
    (0, common_1.Controller)('crm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN', 'CRM_MANAGER'),
    __metadata("design:paramtypes", [crm_service_1.CrmService,
        audit_service_1.AuditService])
], CrmController);
//# sourceMappingURL=crm.controller.js.map