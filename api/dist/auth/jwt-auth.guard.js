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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
exports.revokeUserActiveSessions = revokeUserActiveSessions;
exports.clearUserSessionRevocation = clearUserSessionRevocation;
exports.setIdleTimeoutMinutes = setIdleTimeoutMinutes;
exports.getIdleTimeoutMinutes = getIdleTimeoutMinutes;
exports.setIdleTimeoutAuditHandler = setIdleTimeoutAuditHandler;
exports.buildSessionKey = buildSessionKey;
exports.touchUserSessionActivity = touchUserSessionActivity;
exports.clearUserSessionActivity = clearUserSessionActivity;
exports.checkSessionIdleStatus = checkSessionIdleStatus;
const common_1 = require("@nestjs/common");
const jwt = __importStar(require("jsonwebtoken"));
const bot_defense_1 = require("./bot-defense");
const revokedUserTimestamps = new Map();
const sessionLastActivity = new Map();
let idleTimeoutMinutesConfig = 30;
let idleTimeoutAuditHandler = null;
function revokeUserActiveSessions(username) {
    if (!username)
        return;
    revokedUserTimestamps.set(username.trim().toLowerCase(), Date.now());
}
function clearUserSessionRevocation(username) {
    if (!username)
        return;
    revokedUserTimestamps.delete(username.trim().toLowerCase());
}
function setIdleTimeoutMinutes(minutes) {
    const parsed = Math.floor(Number(minutes));
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 1440) {
        idleTimeoutMinutesConfig = parsed;
    }
    else {
        idleTimeoutMinutesConfig = 30;
    }
}
function getIdleTimeoutMinutes() {
    return idleTimeoutMinutesConfig;
}
function setIdleTimeoutAuditHandler(handler) {
    idleTimeoutAuditHandler = handler;
}
function buildSessionKey(username, iat) {
    return `${String(username || '').trim().toLowerCase()}:${iat || 0}`;
}
function touchUserSessionActivity(sessionKey, now = Date.now()) {
    if (!sessionKey)
        return;
    if (sessionLastActivity.size > 1000) {
        const staleCutoff = now - 24 * 60 * 60 * 1000;
        for (const [k, ts] of sessionLastActivity.entries()) {
            if (ts < staleCutoff) {
                sessionLastActivity.delete(k);
            }
        }
    }
    sessionLastActivity.set(sessionKey, now);
}
function clearUserSessionActivity(sessionKey) {
    if (!sessionKey)
        return;
    sessionLastActivity.delete(sessionKey);
}
function checkSessionIdleStatus(sessionKey, now = Date.now()) {
    const idleMinutes = idleTimeoutMinutesConfig;
    if (!sessionKey) {
        return { expired: false, idleMinutes };
    }
    const lastSeen = sessionLastActivity.get(sessionKey);
    if (lastSeen !== undefined && now - lastSeen > idleMinutes * 60 * 1000) {
        return { expired: true, idleMinutes };
    }
    return { expired: false, idleMinutes };
}
let JwtAuthGuard = class JwtAuthGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('กรุณาเข้าสู่ระบบก่อนใช้งาน');
        }
        const token = authHeader.split(' ')[1];
        try {
            const secret = process.env.JWT_SECRET || 'WindowAsiaJWTSecretKey2026';
            const decoded = jwt.verify(token, secret);
            if (decoded?.username) {
                const revokedAt = revokedUserTimestamps.get(String(decoded.username).trim().toLowerCase());
                const issuedAtMs = decoded.iat ? decoded.iat * 1000 : 0;
                if (revokedAt && (!issuedAtMs || issuedAtMs <= revokedAt)) {
                    throw new common_1.UnauthorizedException('บัญชีผู้ใช้นี้ถูกระงับสิทธิ์การใช้งาน (Session Revoked)');
                }
                const sessionKey = buildSessionKey(decoded.username, decoded.iat);
                const idleStatus = checkSessionIdleStatus(sessionKey);
                if (idleStatus.expired) {
                    clearUserSessionActivity(sessionKey);
                    response?.setHeader?.('X-Session-Expired', 'idle_timeout');
                    if (idleTimeoutAuditHandler) {
                        const clientIp = (0, bot_defense_1.resolveClientIp)(request);
                        Promise.resolve(idleTimeoutAuditHandler({
                            username: String(decoded.username),
                            ipAddress: clientIp,
                            idleMinutes: idleStatus.idleMinutes,
                        })).catch(() => { });
                    }
                    throw new common_1.UnauthorizedException(`เซสชันหมดอายุเนื่องจากไม่มีการใช้งานเกิน ${idleStatus.idleMinutes} นาที (Idle Timeout กรุณาเข้าสู่ระบบใหม่)`);
                }
                touchUserSessionActivity(sessionKey);
                request.sessionKey = sessionKey;
            }
            request.user = decoded;
            return true;
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException) {
                throw err;
            }
            throw new common_1.UnauthorizedException('เซสชันหมดอายุหรือสิทธิ์ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map