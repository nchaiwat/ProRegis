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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/roles.guard");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getAllUsers() {
        const list = await this.usersService.findAll();
        return list.map(u => ({
            id: u.id,
            systemSeqId: u.systemSeqId,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            department: u.department,
            email: u.email,
            mobile: u.mobile,
            telegramId: u.telegramId,
            pinCode: u.pinCode,
            lastLogin: u.lastLogin,
            role: u.role,
            status: u.status,
            failedAttempts: u.failedAttempts,
            lockedUntil: u.lockedUntil,
            isAdAuth: u.isAdAuth,
            createdAt: u.createdAt,
        }));
    }
    async createUser(body) {
        const user = await this.usersService.createUser(body.username, body.passwordPlain, body.role, body.firstName, body.lastName, body.department, body.email, body.mobile, body.telegramId, body.pinCode, body.isAdAuth);
        return {
            success: true,
            message: 'สร้างผู้ใช้งานสำเร็จ',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
            },
        };
    }
    async updateUser(id, body) {
        const user = await this.usersService.updateUser(id, body);
        return {
            success: true,
            message: 'ปรับปรุงข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
            },
        };
    }
    async updatePasswordAndPin(id, body) {
        await this.usersService.updateUserPasswordAndPin(id, body.passwordPlain, body.pinCode);
        return {
            success: true,
            message: 'ปรับปรุงรหัสผ่านและ PIN Code เรียบร้อยแล้ว',
        };
    }
    async testTelegram(id) {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('ไม่พบผู้ใช้ที่ระบุ');
        }
        if (!user.telegramId) {
            throw new common_1.BadRequestException('ผู้ใช้นี้ไม่มี Telegram ID สำหรับการส่งข้อความทดสอบ');
        }
        const result = await this.usersService.sendTestTelegramMessage(user);
        if (!result.success) {
            throw new common_1.BadRequestException(`ส่งข้อความทดสอบไปยัง Telegram ล้มเหลว: ${result.error || 'โปรดตรวจสอบ Telegram ID หรือ Token บอท'}`);
        }
        return {
            success: true,
            message: 'ส่งข้อความทดสอบไปยัง Telegram สำเร็จ',
        };
    }
    async deleteUser(id) {
        await this.usersService.deleteUser(id);
        return {
            success: true,
            message: 'ลบผู้ใช้งานออกจากระบบเรียบร้อยแล้ว',
        };
    }
    async getAllRolePermissions() {
        return this.usersService.findAllRolePermissions();
    }
    async updateRolePermissions(roleName, body) {
        const updated = await this.usersService.updateRolePermissions(roleName, body.allowedMenus);
        return {
            success: true,
            message: 'ปรับปรุงสิทธิ์ของกลุ่มผู้ใช้งานเรียบร้อยแล้ว',
            data: updated,
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createUser", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Put)(':id/password-pin'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updatePasswordAndPin", null);
__decorate([
    (0, common_1.Post)(':id/test-telegram'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "testTelegram", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('roles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAllRolePermissions", null);
__decorate([
    (0, common_1.Put)('roles/:roleName'),
    __param(0, (0, common_1.Param)('roleName')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRolePermissions", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('SYSTEM_ADMIN'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map