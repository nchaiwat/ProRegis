import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const revokedUserTimestamps = new Map<string, number>();

export function revokeUserActiveSessions(username: string): void {
  if (!username) return;
  revokedUserTimestamps.set(username.trim().toLowerCase(), Date.now());
}

export function clearUserSessionRevocation(username: string): void {
  if (!username) return;
  revokedUserTimestamps.delete(username.trim().toLowerCase());
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
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
