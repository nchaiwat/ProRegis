import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { resolveClientIp } from './bot-defense';

const revokedUserTimestamps = new Map<string, number>();
const sessionLastActivity = new Map<string, number>();

let idleTimeoutMinutesConfig = 30;
let idleTimeoutAuditHandler:
  | ((info: { username: string; ipAddress: string; idleMinutes: number }) => Promise<void> | void)
  | null = null;

export function revokeUserActiveSessions(username: string): void {
  if (!username) return;
  revokedUserTimestamps.set(username.trim().toLowerCase(), Date.now());
}

export function clearUserSessionRevocation(username: string): void {
  if (!username) return;
  revokedUserTimestamps.delete(username.trim().toLowerCase());
}

export function setIdleTimeoutMinutes(minutes: number): void {
  const parsed = Math.floor(Number(minutes));
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 1440) {
    idleTimeoutMinutesConfig = parsed;
  } else {
    idleTimeoutMinutesConfig = 30;
  }
}

export function getIdleTimeoutMinutes(): number {
  return idleTimeoutMinutesConfig;
}

export function setIdleTimeoutAuditHandler(
  handler: ((info: { username: string; ipAddress: string; idleMinutes: number }) => Promise<void> | void) | null,
): void {
  idleTimeoutAuditHandler = handler;
}

export function buildSessionKey(username: string, iat?: number): string {
  return `${String(username || '').trim().toLowerCase()}:${iat || 0}`;
}

export function touchUserSessionActivity(sessionKey: string, now = Date.now()): void {
  if (!sessionKey) return;
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

export function clearUserSessionActivity(sessionKey: string): void {
  if (!sessionKey) return;
  sessionLastActivity.delete(sessionKey);
}

export function checkSessionIdleStatus(
  sessionKey: string,
  now = Date.now(),
): { expired: boolean; idleMinutes: number } {
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

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('กรุณาเข้าสู่ระบบก่อนใช้งาน');
    }
    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET || 'WindowAsiaJWTSecretKey2026';
      const decoded = jwt.verify(token, secret) as any;
      if (decoded?.username) {
        const revokedAt = revokedUserTimestamps.get(String(decoded.username).trim().toLowerCase());
        const issuedAtMs = decoded.iat ? decoded.iat * 1000 : 0;
        if (revokedAt && (!issuedAtMs || issuedAtMs <= revokedAt)) {
          throw new UnauthorizedException('บัญชีผู้ใช้นี้ถูกระงับสิทธิ์การใช้งาน (Session Revoked)');
        }

        const sessionKey = buildSessionKey(decoded.username, decoded.iat);
        const idleStatus = checkSessionIdleStatus(sessionKey);
        if (idleStatus.expired) {
          clearUserSessionActivity(sessionKey);
          response?.setHeader?.('X-Session-Expired', 'idle_timeout');
          if (idleTimeoutAuditHandler) {
            const clientIp = resolveClientIp(request);
            Promise.resolve(
              idleTimeoutAuditHandler({
                username: String(decoded.username),
                ipAddress: clientIp,
                idleMinutes: idleStatus.idleMinutes,
              }),
            ).catch(() => {});
          }
          throw new UnauthorizedException(
            `เซสชันหมดอายุเนื่องจากไม่มีการใช้งานเกิน ${idleStatus.idleMinutes} นาที (Idle Timeout กรุณาเข้าสู่ระบบใหม่)`,
          );
        }

        touchUserSessionActivity(sessionKey);
        request.sessionKey = sessionKey;
      }
      request.user = decoded;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('เซสชันหมดอายุหรือสิทธิ์ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
    }
  }
}
