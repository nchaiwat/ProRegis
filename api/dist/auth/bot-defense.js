"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spokeRateLimiter = void 0;
exports.resolveClientIp = resolveClientIp;
exports.evaluateRateLimitOnly = evaluateRateLimitOnly;
exports.evaluateBotDefense = evaluateBotDefense;
const common_1 = require("@nestjs/common");
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const WHITELISTED_IPS = new Set([
    '127.0.0.1',
    '::1',
    'localhost',
    '172.18.0.1',
    '157.173.219.153',
    '49.231.185.245',
    '58.8.190.63',
]);
class SpokeRateLimiter {
    records = new Map();
    isAllowed(clientIp) {
        if (!clientIp || WHITELISTED_IPS.has(clientIp)) {
            return { allowed: true, retryAfter: 0 };
        }
        const now = Date.now();
        const timestamps = (this.records.get(clientIp) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
        if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
            const oldest = timestamps[0];
            const retryAfter = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
            this.records.set(clientIp, timestamps);
            return { allowed: false, retryAfter };
        }
        timestamps.push(now);
        this.records.set(clientIp, timestamps);
        return { allowed: true, retryAfter: 0 };
    }
}
exports.spokeRateLimiter = new SpokeRateLimiter();
function cleanIpValue(raw) {
    return raw.split(',')[0].trim().replace(/^::ffff:/, '');
}
function resolveClientIp(req) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
        return cleanIpValue(cfIp);
    }
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.trim()) {
        return cleanIpValue(xff);
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
        return cleanIpValue(realIp);
    }
    return cleanIpValue(req.socket?.remoteAddress || '127.0.0.1') || '127.0.0.1';
}
function evaluateRateLimitOnly(req, res, onViolation) {
    const clientIp = resolveClientIp(req);
    const rateCheck = exports.spokeRateLimiter.isAllowed(clientIp);
    if (!rateCheck.allowed) {
        res?.setHeader?.('Retry-After', String(rateCheck.retryAfter));
        if (onViolation) {
            Promise.resolve(onViolation('IP_RATE_LIMITED', clientIp, { retry_after: rateCheck.retryAfter })).catch(() => { });
        }
        throw new common_1.HttpException({
            statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
            detail: `คำขอเข้าสู่ระบบถี่เกินกำหนด กรุณารอ ${rateCheck.retryAfter} วินาที แล้วลองใหม่อีกครั้ง`,
            message: `คำขอเข้าสู่ระบบถี่เกินกำหนด กรุณารอ ${rateCheck.retryAfter} วินาที แล้วลองใหม่อีกครั้ง`,
            retry_after: rateCheck.retryAfter,
        }, common_1.HttpStatus.TOO_MANY_REQUESTS);
    }
    return clientIp;
}
function evaluateBotDefense(req, body, res, onViolation) {
    const clientIp = evaluateRateLimitOnly(req, res, onViolation);
    const now = Date.now();
    if (body.corporate_fax || body.security_honey) {
        if (onViolation) {
            Promise.resolve(onViolation('BOT_HONEYPOT_DETECTED', clientIp, { honeypot_triggered: true })).catch(() => { });
        }
        throw new common_1.UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    let durationMs = 0;
    if (body.form_render_ts) {
        durationMs = now - Number(body.form_render_ts);
        if (durationMs < 400 || durationMs < -10000) {
            if (onViolation) {
                Promise.resolve(onViolation('BOT_TIMING_VIOLATION', clientIp, { duration_ms: durationMs })).catch(() => { });
            }
            throw new common_1.BadRequestException('ตรวจพบความเร็วการส่งข้อมูลผิดปกติ กรุณาลองใหม่อีกครั้ง');
        }
    }
    return { clientIp, durationMs };
}
//# sourceMappingURL=bot-defense.js.map