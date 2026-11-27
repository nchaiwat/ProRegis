import {
  validatePasswordComplexity,
  isPasswordExpired,
  LOCAL_PASSWORD_EXPIRY_DAYS,
} from '../users/users.service';
import {
  evaluateBotDefense,
  evaluateRateLimitOnly,
  resolveClientIp,
} from './bot-defense';
import {
  setIdleTimeoutMinutes,
  getIdleTimeoutMinutes,
  buildSessionKey,
  touchUserSessionActivity,
  checkSessionIdleStatus,
  clearUserSessionActivity,
} from './jwt-auth.guard';
import { normalizeAuditIp } from '../audit/audit.service';
import {
  CIAM_FRAMEWORK_VERSION,
  ALLOWED_CIAM_IPS,
  ZERO_TRAINING_PRIVACY_HEADERS,
  sanitizeContextForPrivacy,
} from '../ciam/ciam.service';
import { UnauthorizedException, BadRequestException, HttpException } from '@nestjs/common';

describe('Central IAM Framework v2.15.0 & Security Compliance Tests', () => {
  describe('Constants & Compliance Handshake', () => {
    it('should have CIAM_FRAMEWORK_VERSION as 2.15.0', () => {
      expect(CIAM_FRAMEWORK_VERSION).toBe('2.15.0');
    });

    it('should include Central IAM VPS IP and Corporate Whitelist in ALLOWED_CIAM_IPS', () => {
      expect(ALLOWED_CIAM_IPS.has('157.173.219.153')).toBe(true);
      expect(ALLOWED_CIAM_IPS.has('127.0.0.1')).toBe(true);
      expect(ALLOWED_CIAM_IPS.has('localhost')).toBe(true);
      expect(ALLOWED_CIAM_IPS.has('172.18.0.1')).toBe(true);
      expect(ALLOWED_CIAM_IPS.has('49.231.185.245')).toBe(true);
      expect(ALLOWED_CIAM_IPS.has('58.8.190.63')).toBe(true);
    });
  });

  describe('Local Password Policy & 90-Day Rotation (v2.12.0 - v2.15.0)', () => {
    it('should enforce 90-day expiry threshold', () => {
      expect(LOCAL_PASSWORD_EXPIRY_DAYS).toBe(90);

      const now = new Date();
      const fresh = isPasswordExpired(now);
      expect(fresh.isExpired).toBe(false);
      expect(fresh.daysLeft).toBe(90);

      // 91 days ago -> expired
      const expiredDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      const expired = isPasswordExpired(expiredDate);
      expect(expired.isExpired).toBe(true);
      expect(expired.daysLeft).toBe(0);
    });

    it('should validate password complexity (6 rules)', () => {
      expect(validatePasswordComplexity('Wa@Admin2026!', 'admin_user')).toBeNull();
      expect(validatePasswordComplexity('Wa@1!', 'user')).toContain('8 ถึง 16');
      expect(validatePasswordComplexity('Wa@AdminLongPassword2026!#', 'user')).toContain('8 ถึง 16');
      expect(validatePasswordComplexity('wa@admin2026!', 'user')).toContain('พิมพ์ใหญ่');
      expect(validatePasswordComplexity('WA@ADMIN2026!', 'user')).toContain('พิมพ์เล็ก');
      expect(validatePasswordComplexity('Wa@AdminOnly!', 'user')).toContain('ตัวเลข');
      expect(validatePasswordComplexity('WaAdmin202678', 'user')).toContain('อักขระพิเศษ');
      expect(validatePasswordComplexity('Chaiwat@2026!', 'chaiwat')).toContain('ชื่อผู้ใช้');
    });
  });

  describe('Enterprise In-App Bot Defense 3 Layers (v2.10.0 / v2.15.0)', () => {
    it('should resolve client IP prioritizing CF-Connecting-IP and stripping ::ffff:', () => {
      const cfReq: any = {
        headers: {
          'cf-connecting-ip': '203.0.113.50',
          'x-forwarded-for': '198.51.100.2, 10.0.0.1',
        },
        socket: { remoteAddress: '::ffff:127.0.0.1' },
      };
      expect(resolveClientIp(cfReq)).toBe('203.0.113.50');

      const v6MappedReq: any = {
        headers: {},
        socket: { remoteAddress: '::ffff:157.173.219.153' },
      };
      expect(resolveClientIp(v6MappedReq)).toBe('157.173.219.153');
    });

    it('should reject requests with honeypot fields and invoke audit callback', () => {
      const mockReq: any = {
        headers: { 'x-forwarded-for': '203.0.113.195' },
        socket: { remoteAddress: '203.0.113.195' },
      };
      const violations: string[] = [];

      expect(() => {
        evaluateBotDefense(mockReq, { corporate_fax: 'bot_spammed_value' }, undefined, (action) => {
          violations.push(action);
        });
      }).toThrow(UnauthorizedException);

      expect(() => {
        evaluateBotDefense(mockReq, { security_honey: 'bot_token' }, undefined, (action) => {
          violations.push(action);
        });
      }).toThrow(UnauthorizedException);

      expect(violations).toEqual(['BOT_HONEYPOT_DETECTED', 'BOT_HONEYPOT_DETECTED']);
    });

    it('should reject requests with timing < 400ms and invoke audit callback', () => {
      const mockReq: any = {
        headers: { 'x-forwarded-for': '203.0.113.196' },
        socket: { remoteAddress: '203.0.113.196' },
      };
      const violations: string[] = [];

      expect(() => {
        evaluateBotDefense(mockReq, { form_render_ts: Date.now() - 100 }, undefined, (action) => {
          violations.push(action);
        });
      }).toThrow(BadRequestException);

      expect(violations).toEqual(['BOT_TIMING_VIOLATION']);
    });

    it('should enforce Layer 1 rate limit and set Retry-After header', () => {
      const headersSet: Record<string, string> = {};
      const mockRes: any = {
        setHeader: (k: string, v: string) => {
          headersSet[k] = v;
        },
      };
      const mockReq: any = {
        headers: { 'x-forwarded-for': '198.51.100.77' },
        socket: { remoteAddress: '198.51.100.77' },
      };

      for (let i = 0; i < 10; i++) {
        evaluateRateLimitOnly(mockReq, mockRes);
      }

      const violations: string[] = [];
      expect(() => {
        evaluateRateLimitOnly(mockReq, mockRes, (action) => {
          violations.push(action);
        });
      }).toThrow(HttpException);

      expect(headersSet['Retry-After']).toBeDefined();
      expect(Number(headersSet['Retry-After'])).toBeGreaterThanOrEqual(1);
      expect(violations).toEqual(['IP_RATE_LIMITED']);
    });

    it('should pass legitimate human requests', () => {
      const mockReq: any = {
        headers: { 'x-forwarded-for': '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const result = evaluateBotDefense(mockReq, { form_render_ts: Date.now() - 2500 });
      expect(result.clientIp).toBe('127.0.0.1');
      expect(result.durationMs).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Configurable Idle Session Timeout (Group H - v2.15.0)', () => {
    it('should track sliding activity and detect idle expiration accurately', () => {
      setIdleTimeoutMinutes(30);
      expect(getIdleTimeoutMinutes()).toBe(30);

      const sessionKey = buildSessionKey('somchai.p', 1730000000);
      const now = Date.now();
      touchUserSessionActivity(sessionKey, now - 10 * 60 * 1000);
      expect(checkSessionIdleStatus(sessionKey, now).expired).toBe(false);

      // Exceed 30 minutes
      touchUserSessionActivity(sessionKey, now - 31 * 60 * 1000);
      const expiredCheck = checkSessionIdleStatus(sessionKey, now);
      expect(expiredCheck.expired).toBe(true);
      expect(expiredCheck.idleMinutes).toBe(30);

      // Reconfigure per-app idle timeout to 60 minutes -> no longer expired at 31 minutes
      setIdleTimeoutMinutes(60);
      expect(checkSessionIdleStatus(sessionKey, now).expired).toBe(false);

      clearUserSessionActivity(sessionKey);
      setIdleTimeoutMinutes(30);
    });
  });

  describe('Mandatory Audit Transaction IP Normalization (v2.15.0)', () => {
    it('should default empty/null IPs to 127.0.0.1 (SYSTEM) and extract first forwarded IP', () => {
      expect(normalizeAuditIp(null)).toBe('127.0.0.1 (SYSTEM)');
      expect(normalizeAuditIp('')).toBe('127.0.0.1 (SYSTEM)');
      expect(normalizeAuditIp('   ')).toBe('127.0.0.1 (SYSTEM)');
      expect(normalizeAuditIp('58.8.185.18, 172.18.0.2')).toBe('58.8.185.18');
      expect(normalizeAuditIp('::ffff:157.173.219.153')).toBe('157.173.219.153');
    });
  });

  describe('AI Copilot DLP Scrubber & Zero-Training Privacy Headers (Group E)', () => {
    it('should enforce mandatory zero-training privacy headers', () => {
      expect(ZERO_TRAINING_PRIVACY_HEADERS['X-No-Model-Training']).toBe('true');
      expect(ZERO_TRAINING_PRIVACY_HEADERS['X-Data-Retention']).toBe('none');
      expect(ZERO_TRAINING_PRIVACY_HEADERS['X-OpenAI-Data-Usage-Opt-Out']).toBe('true');
      expect(ZERO_TRAINING_PRIVACY_HEADERS['Cache-Control']).toContain('no-store');
    });

    it('should redact secrets, API keys, and credential fields from context', () => {
      const raw =
        'Key sec_proregis_mgmt_2026 google AIzaSyD9duFEcTHll_DmdTZqfR67DYvG89US5fI openai sk-proj1234567890abcdef {"password": "Secret123!", "api_key": "abc"}';
      const sanitized = sanitizeContextForPrivacy(raw);

      expect(sanitized).not.toContain('sec_proregis_mgmt_2026');
      expect(sanitized).not.toContain('AIzaSyD9duFEcTHll_DmdTZqfR67DYvG89US5fI');
      expect(sanitized).not.toContain('sk-proj1234567890abcdef');
      expect(sanitized).not.toContain('Secret123!');
      expect(sanitized).toContain('[REDACTED_SECRET_KEY]');
      expect(sanitized).toContain('[REDACTED_GOOGLE_API_KEY]');
      expect(sanitized).toContain('[REDACTED_OPENAI_API_KEY]');
      expect(sanitized).toContain('[REDACTED_BY_DLP]');
    });
  });
});
