"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const audit_service_1 = require("../audit/audit.service");
const user_entity_1 = require("../users/user.entity");
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
let AuthController = class AuthController {
    usersService;
    auditService;
    constructor(usersService, auditService) {
        this.usersService = usersService;
        this.auditService = auditService;
    }
    async login(body, req) {
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            null;
        const userAgent = req.headers['user-agent'] || null;
        const usernameNormalized = (body.username || '').trim();
        const user = await this.usersService.findByUsername(usernameNormalized);
        const loginMethod = body.loginMethod || 'DB';
        if (!user) {
            await this.auditService.logAction(usernameNormalized, 'LOGIN_FAILED', 'Auth', null, ipAddress, userAgent, { reason: 'Username not found in database', loginMethod });
            throw new common_1.UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
        if (user.status === user_entity_1.UserStatus.SUSPENDED) {
            await this.auditService.logAction(user.username, 'LOGIN_FAILED', 'Auth', user.id, ipAddress, userAgent, { reason: 'Account status is suspended', loginMethod });
            throw new common_1.UnauthorizedException('บัญชีผู้ใช้นี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        }
        if (user.status === user_entity_1.UserStatus.LOCKED && user.lockedUntil) {
            const now = new Date();
            if (now < user.lockedUntil) {
                const secondsLeft = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
                await this.auditService.logAction(user.username, 'LOGIN_FAILED', 'Auth', user.id, ipAddress, userAgent, { reason: `Account locked (temporary lockout). Seconds left: ${secondsLeft}`, loginMethod });
                throw new common_1.UnauthorizedException(`บัญชีผู้ใช้นี้ถูกล็อคเนื่องจากใส่รหัสผ่านผิดเกินกำหนด กรุณาลองใหม่ในอีก ${secondsLeft} วินาที`);
            }
            else {
                user.status = user_entity_1.UserStatus.ACTIVE;
                user.failedAttempts = 0;
                user.lockedUntil = null;
            }
        }
        let loginSuccess = false;
        if (loginMethod === 'AD') {
            if (!user.isAdAuth) {
                await this.auditService.logAction(user.username, 'LOGIN_FAILED', 'Auth', user.id, ipAddress, userAgent, { reason: 'AD login is not enabled for this user account', loginMethod: 'AD' });
                throw new common_1.UnauthorizedException('บัญชีผู้ใช้นี้ไม่ได้เปิดใช้งาน Active Directory');
            }
            const isPinCorrect = !!(user.pinCode && body.passwordPlain === user.pinCode);
            loginSuccess = isPinCorrect;
            let adError = 'AD authentication failed';
            if (!loginSuccess) {
                const gatewayUrl = process.env.AD_GATEWAY_URL || 'http://192.168.12.8:3100/api/v2/login';
                const appId = process.env.AD_APP_ID || 'ProRegis';
                const secretKey = process.env.AD_SECRET_KEY || 'd69f9e5a88e734c56e2978a63bf720c22635a9c0c32b5e2a2205510657e4e138';
                const now = new Date();
                const tzOffset = 7 * 60 * 60 * 1000;
                const thTime = new Date(now.getTime() + tzOffset);
                const timestamp = thTime.toISOString().split('.')[0] + 'Z';
                try {
                    const response = await fetch(gatewayUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            app_id: appId,
                            secret_key: secretKey,
                            username: user.username,
                            password: body.passwordPlain,
                            timestamp,
                        }),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.status === 'success') {
                            loginSuccess = true;
                        }
                        else {
                            adError = data?.message || `AD Gateway returned status: ${data?.status || 'failed'}`;
                        }
                    }
                    else {
                        adError = `AD Gateway HTTP error ${response.status}: ${response.statusText}`;
                    }
                }
                catch (err) {
                    adError = `AD Gateway connection failed: ${err.message}`;
                    console.error('[AD GATEWAY ERROR]', err);
                }
            }
            if (!loginSuccess) {
                await this.usersService.recordFailedAttempt(user);
                await this.auditService.logAction(user.username, 'LOGIN_FAILED', 'Auth', user.id, ipAddress, userAgent, { reason: adError, loginMethod: 'AD', failedAttempts: user.failedAttempts });
                throw new common_1.UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
        }
        else {
            const isPasswordCorrect = await bcrypt.compare(body.passwordPlain || '', user.passwordHash);
            const isPinCorrect = !!(user.pinCode && body.passwordPlain === user.pinCode);
            loginSuccess = isPasswordCorrect || isPinCorrect;
            if (!loginSuccess) {
                await this.usersService.recordFailedAttempt(user);
                await this.auditService.logAction(user.username, 'LOGIN_FAILED', 'Auth', user.id, ipAddress, userAgent, { reason: 'DB password or PIN incorrect', loginMethod: 'DB', failedAttempts: user.failedAttempts });
                throw new common_1.UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
        }
        await this.usersService.recordSuccessfulLogin(user);
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
        };
        const secret = process.env.JWT_SECRET || 'WindowAsiaJWTSecretKey2026';
        const token = jwt.sign(payload, secret, { expiresIn: '8h' });
        await this.auditService.logAction(user.username, 'LOGIN_SUCCESS', 'Auth', user.id, ipAddress, userAgent, { loginMethod });
        const allowedMenus = await this.usersService.findAllowedMenusByRole(user.role);
        return {
            success: true,
            token,
            user: {
                username: user.username,
                role: user.role,
                allowedMenus,
            },
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        audit_service_1.AuditService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map