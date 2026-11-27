/**
 * Spoke In-App Bot Defense & Anti-Brute-Force Guard (Enterprise Standard v2.10.0 - v2.15.0 / ISO 27001)
 * Organization: Window Asia Public Company Limited
 *
 * 3-Layer Defense:
 * - Layer 1: Sliding-Window IP Rate Limiter (10 req / 60s per client IP, corporate whitelist, Retry-After)
 * - Layer 2: Decoy Honeypot Trap (corporate_fax, security_honey hidden fields)
 * - Layer 3: Submission Velocity & Timing Guard (< 400ms rejection)
 */

import type { Request, Response } from 'express';
import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 วินาที
const RATE_LIMIT_MAX_REQUESTS = 10;     // 10 ครั้งต่อ IP

// Corporate & Infrastructure IP Whitelist
const WHITELISTED_IPS = new Set([
  '127.0.0.1',
  '::1',
  'localhost',
  '172.18.0.1',       // Docker Bridge Host
  '157.173.219.153',   // Central IAM Production VPS
  '49.231.185.245',   // Window Asia HQ Gateway WAN
  '58.8.190.63',      // Window Asia สำนักงานสำรอง
]);

export type BotDefenseViolationAction =
  | 'IP_RATE_LIMITED'
  | 'BOT_HONEYPOT_DETECTED'
  | 'BOT_TIMING_VIOLATION';

export type BotDefenseAuditCallback = (
  action: BotDefenseViolationAction,
  clientIp: string,
  details: Record<string, any>,
) => void | Promise<void>;

class SpokeRateLimiter {
  private records = new Map<string, number[]>();

  public isAllowed(clientIp: string): { allowed: boolean; retryAfter: number } {
    if (!clientIp || WHITELISTED_IPS.has(clientIp)) {
      return { allowed: true, retryAfter: 0 };
    }

    const now = Date.now();
    const timestamps = (this.records.get(clientIp) || []).filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
    );

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

export const spokeRateLimiter = new SpokeRateLimiter();

function cleanIpValue(raw: string): string {
  return raw.split(',')[0].trim().replace(/^::ffff:/, '');
}

export function resolveClientIp(req: Request): string {
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

export interface BotDefensePayload {
  corporate_fax?: string;
  security_honey?: string;
  form_render_ts?: number;
}

/**
 * Layer 1 Only: IP Rate Limiting (for SSO callbacks where honeypot/timing form fields do not exist)
 */
export function evaluateRateLimitOnly(
  req: Request,
  res?: Response,
  onViolation?: BotDefenseAuditCallback,
): string {
  const clientIp = resolveClientIp(req);
  const rateCheck = spokeRateLimiter.isAllowed(clientIp);
  if (!rateCheck.allowed) {
    res?.setHeader?.('Retry-After', String(rateCheck.retryAfter));
    if (onViolation) {
      Promise.resolve(
        onViolation('IP_RATE_LIMITED', clientIp, { retry_after: rateCheck.retryAfter }),
      ).catch(() => {});
    }
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        detail: `คำขอเข้าสู่ระบบถี่เกินกำหนด กรุณารอ ${rateCheck.retryAfter} วินาที แล้วลองใหม่อีกครั้ง`,
        message: `คำขอเข้าสู่ระบบถี่เกินกำหนด กรุณารอ ${rateCheck.retryAfter} วินาที แล้วลองใหม่อีกครั้ง`,
        retry_after: rateCheck.retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  return clientIp;
}

/**
 * Validate 3-Layer In-App Bot Defense
 * Throws corresponding NestJS exceptions if an anomaly is detected.
 */
export function evaluateBotDefense(
  req: Request,
  body: BotDefensePayload,
  res?: Response,
  onViolation?: BotDefenseAuditCallback,
): { clientIp: string; durationMs: number } {
  // Layer 1: IP Rate Limiting (10 req / 60s)
  const clientIp = evaluateRateLimitOnly(req, res, onViolation);
  const now = Date.now();

  // Layer 2: Decoy Honeypot Trap Evaluation
  if (body.corporate_fax || body.security_honey) {
    if (onViolation) {
      Promise.resolve(
        onViolation('BOT_HONEYPOT_DETECTED', clientIp, { honeypot_triggered: true }),
      ).catch(() => {});
    }
    // Silent rejection: use generic message so attacker cannot inspect honeypot
    throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  // Layer 3: Submission Velocity & Timing Guard (< 400ms rejection)
  let durationMs = 0;
  if (body.form_render_ts) {
    durationMs = now - Number(body.form_render_ts);
    // If submitted under 400ms or time is in future by > 10s, reject as automated bot
    if (durationMs < 400 || durationMs < -10000) {
      if (onViolation) {
        Promise.resolve(
          onViolation('BOT_TIMING_VIOLATION', clientIp, { duration_ms: durationMs }),
        ).catch(() => {});
      }
      throw new BadRequestException('ตรวจพบความเร็วการส่งข้อมูลผิดปกติ กรุณาลองใหม่อีกครั้ง');
    }
  }

  return { clientIp, durationMs };
}
