import { validatePasswordComplexity, isPasswordExpired, LOCAL_PASSWORD_EXPIRY_DAYS } from '../users/users.service';
import { evaluateBotDefense } from './bot-defense';
import { CIAM_FRAMEWORK_VERSION, ALLOWED_CIAM_IPS } from '../ciam/ciam.service';
import { UnauthorizedException, BadRequestException, HttpException } from '@nestjs/common';

describe('Central IAM Framework v2.13.0 & Security Compliance Tests', () => {
  describe('Constants & Compliance Handshake', () => {
    it('should have CIAM_FRAMEWORK_VERSION as 2.13.0', () => {
      expect(CIAM_FRAMEWORK_VERSION).toBe('2.13.0');
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

  describe('Local Password Policy & 90-Day Rotation (v2.12.0 / v2.13.0)', () => {
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
      // Valid password
      expect(validatePasswordComplexity('Wa@Admin2026!', 'admin_user')).toBeNull();

      // Too short (< 8)
      expect(validatePasswordComplexity('Wa@1!', 'user')).toContain('8 ถึง 16');

      // Too long (> 16)
      expect(validatePasswordComplexity('Wa@AdminLongPassword2026!#', 'user')).toContain('8 ถึง 16');

      // Missing Uppercase
      expect(validatePasswordComplexity('wa@admin2026!', 'user')).toContain('พิมพ์ใหญ่');

      // Missing Lowercase
      expect(validatePasswordComplexity('WA@ADMIN2026!', 'user')).toContain('พิมพ์เล็ก');

      // Missing Digit
      expect(validatePasswordComplexity('Wa@AdminOnly!', 'user')).toContain('ตัวเลข');

      // Missing Special char
      expect(validatePasswordComplexity('WaAdmin202678', 'user')).toContain('อักขระพิเศษ');

      // Username in password
      expect(validatePasswordComplexity('Chaiwat@2026!', 'chaiwat')).toContain('ชื่อผู้ใช้');
    });
  });

  describe('Enterprise In-App Bot Defense 3 Layers', () => {
    it('should reject requests with honeypot fields', () => {
      const mockReq: any = {
        headers: { 'x-forwarded-for': '203.0.113.195' },
        socket: { remoteAddress: '203.0.113.195' },
      };

      expect(() => {
        evaluateBotDefense(mockReq, { corporate_fax: 'bot_spammed_value' });
      }).toThrow(UnauthorizedException);

      expect(() => {
        evaluateBotDefense(mockReq, { security_honey: 'bot_token' });
      }).toThrow(UnauthorizedException);
    });

    it('should reject requests with timing < 400ms (Submission Velocity Guard)', () => {
      const mockReq: any = {
        headers: { 'x-forwarded-for': '203.0.113.195' },
        socket: { remoteAddress: '203.0.113.195' },
      };

      // Simulated fast bot submission (< 400ms)
      expect(() => {
        evaluateBotDefense(mockReq, { form_render_ts: Date.now() - 100 });
      }).toThrow(BadRequestException);
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
});
