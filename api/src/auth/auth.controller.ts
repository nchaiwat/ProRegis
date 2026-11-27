import { Controller, Post, Body, Req, Res, HttpCode, HttpStatus, UnauthorizedException, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService, isPasswordExpired, validatePasswordComplexity } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { UserStatus } from '../users/user.entity';
import { SystemSetting } from '../backoffice/system-setting.entity';
import {
  JwtAuthGuard,
  clearUserSessionRevocation,
  buildSessionKey,
  touchUserSessionActivity,
  clearUserSessionActivity,
  getIdleTimeoutMinutes,
} from './jwt-auth.guard';
import { evaluateBotDefense, resolveClientIp } from './bot-defense';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';

@Controller(['auth', 'api/auth'])
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepo: Repository<SystemSetting>,
  ) {}

  private async getDynamicSetting(key: string, fallback: string): Promise<string> {
    const row = await this.systemSettingRepo.findOne({ where: { key } });
    return row && row.value ? row.value : fallback;
  }

  @Post('login')
  async login(
    @Body()
    body: {
      username: string;
      passwordPlain: string;
      loginMethod?: 'DB' | 'AD';
      corporate_fax?: string;
      security_honey?: string;
      form_render_ts?: number;
    },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 🛡️ Enterprise In-App Bot Defense (Rate Limiter, Honeypot, Timing Guard)
    const userAgent = req.headers['user-agent'] || null;
    const { clientIp } = evaluateBotDefense(req, body, res, async (action, ip, details) => {
      await this.auditService.logAction(
        (body?.username || 'anonymous').trim() || 'anonymous',
        action,
        'SecurityBotDefense',
        null,
        ip,
        userAgent,
        details,
      );
      await this.auditService.recordTransactionLog({
        category: 'security_bot_defense',
        action: action.toLowerCase(),
        status: 'warning',
        ipAddress: ip,
        message: `ระบบป้องกันบอทตรวจพบเหตุการณ์ ${action}`,
        triggeredBy: `ip:${ip}`,
        details: { event_code: action, ...details },
      });
    });
    const ipAddress = clientIp;

    const usernameNormalized = (body.username || '').trim();
    const user = await this.usersService.findByUsername(usernameNormalized);
    const loginMethod = body.loginMethod || 'DB';
    const breakGlassActive =
      (await this.getDynamicSetting('ciam_break_glass_active', 'false')).toLowerCase() === 'true';

    if (!user) {
      // Log failure (without revealing username if non-existent, but standard audits check it)
      await this.auditService.logAction(
        usernameNormalized,
        'LOGIN_FAILED',
        'Auth',
        null,
        ipAddress,
        userAgent,
        { reason: 'Username not found in database', loginMethod },
      );
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // Check brute-force lockout status
    if (user.status === UserStatus.SUSPENDED) {
      await this.auditService.logAction(
        user.username,
        'LOGIN_FAILED',
        'Auth',
        user.id,
        ipAddress,
        userAgent,
        { reason: 'Account status is suspended', loginMethod },
      );
      throw new UnauthorizedException('บัญชีผู้ใช้นี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    if (user.status === UserStatus.LOCKED && user.lockedUntil) {
      const now = new Date();
      if (now < user.lockedUntil) {
        const secondsLeft = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
        await this.auditService.logAction(
          user.username,
          'LOGIN_FAILED',
          'Auth',
          user.id,
          ipAddress,
          userAgent,
          { reason: `Account locked (temporary lockout). Seconds left: ${secondsLeft}`, loginMethod },
        );
        throw new UnauthorizedException(
          `บัญชีผู้ใช้นี้ถูกล็อคเนื่องจากใส่รหัสผ่านผิดเกินกำหนด กรุณาลองใหม่ในอีก ${secondsLeft} วินาที`,
        );
      } else {
        // Lockout expired, reset it
        user.status = UserStatus.ACTIVE;
        user.failedAttempts = 0;
        user.lockedUntil = null;
      }
    }

    let loginSuccess = false;
    let resolvedGatewayBaseUrl = '';

    if (loginMethod === 'AD') {
      if (!user.isAdAuth) {
        await this.auditService.logAction(
          user.username,
          'LOGIN_FAILED',
          'Auth',
          user.id,
          ipAddress,
          userAgent,
          { reason: 'AD login is not enabled for this user account', loginMethod: 'AD' },
        );
        throw new UnauthorizedException('บัญชีผู้ใช้นี้ไม่ได้เปิดใช้งาน Active Directory');
      }

      let adError = 'AD authentication failed';

      // Dynamic AD Gateway URL from system_settings (Zero .env Dependency) with fallback
      const rawGateway = await this.getDynamicSetting(
        'ciam_ad_gateway_url',
        process.env.AD_GATEWAY_URL || 'http://172.18.0.1:3100',
      );
      resolvedGatewayBaseUrl = rawGateway.trim().replace(/\/+$/, '');
      const gatewayUrl = resolvedGatewayBaseUrl.endsWith('/api/v2/login')
        ? resolvedGatewayBaseUrl
        : `${resolvedGatewayBaseUrl}/api/v2/login`;

      const appId = process.env.AD_APP_ID || 'ProRegis';
      const secretKey =
        process.env.AD_SECRET_KEY || 'd69f9e5a88e734c56e2978a63bf720c22635a9c0c32b5e2a2205510657e4e138';

      const now = new Date();
      const tzOffset = 7 * 60 * 60 * 1000; // Thailand local timezone (UTC+7)
      const thTime = new Date(now.getTime() + tzOffset);
      const timestamp = thTime.toISOString().split('.')[0] + 'Z';

      const vpsIp = process.env.VPS_IP || '157.173.219.153';

      try {
        const response = await fetch(gatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': vpsIp,
            'X-Real-IP': vpsIp,
          },
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
            // Do NOT update user password cache in local DB to avoid credentials leak
          } else {
            adError = data?.message || `AD Gateway returned status: ${data?.status || 'failed'}`;
          }
        } else {
          adError = `AD Gateway HTTP error ${response.status}: ${response.statusText}`;
        }
      } catch (err: any) {
        adError = `AD Gateway connection failed to ${gatewayUrl}: ${err.message}`;
        console.error(`[AD GATEWAY ERROR] URL: ${gatewayUrl}`, err);
      }

      if (!loginSuccess) {
        await this.usersService.recordFailedAttempt(user);
        await this.auditService.logAction(
          user.username,
          'LOGIN_FAILED',
          'Auth',
          user.id,
          ipAddress,
          userAgent,
          { reason: adError, loginMethod: 'AD', failedAttempts: user.failedAttempts },
        );
        throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

    } else {
      // DB Login
      // Enforce that AD users must not use DB login
      if (user.isAdAuth) {
        await this.auditService.logAction(
          user.username,
          'LOGIN_FAILED',
          'Auth',
          user.id,
          ipAddress,
          userAgent,
          { reason: 'User is configured for AD login but attempted DB login', loginMethod: 'DB' },
        );
        throw new UnauthorizedException(
          'บัญชีผู้ใช้นี้เข้าสู่ระบบผ่าน Active Directory เท่านั้น กรุณาเลือกวิธีเข้าสู่ระบบเป็น Active Directory',
        );
      }

      const isPasswordCorrect = await bcrypt.compare(body.passwordPlain || '', user.passwordHash);
      const isPinCorrect = !!(user.pinCode && body.passwordPlain === user.pinCode);
      loginSuccess = isPasswordCorrect || isPinCorrect;

      if (!loginSuccess) {
        await this.usersService.recordFailedAttempt(user);
        await this.auditService.logAction(
          user.username,
          'LOGIN_FAILED',
          'Auth',
          user.id,
          ipAddress,
          userAgent,
          { reason: 'DB password or PIN incorrect', loginMethod: 'DB', failedAttempts: user.failedAttempts },
        );
        throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    }

    // Successful Login
    await this.usersService.recordSuccessfulLogin(user);
    clearUserSessionRevocation(user.username);

    // Dynamic session TTL from system_settings (default 480 minutes = 8 hours)
    const ttlMinutes = parseInt(await this.getDynamicSetting('ciam_session_ttl_minutes', '480'), 10) || 480;
    const expiresInSeconds = Math.max(60, ttlMinutes * 60);

    // Create JWT token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    const secret = process.env.JWT_SECRET || 'WindowAsiaJWTSecretKey2026';
    const token = jwt.sign(payload, secret, { expiresIn: expiresInSeconds });
    const decodedToken = jwt.decode(token) as any;
    touchUserSessionActivity(buildSessionKey(user.username, decodedToken?.iat));

    // Write audit log
    await this.auditService.logAction(
      user.username,
      'LOGIN_SUCCESS',
      'Auth',
      user.id,
      ipAddress,
      userAgent,
      { loginMethod, breakGlassActive },
    );

    // BG-02 Audit Log when logging in during Break-Glass emergency mode
    if (breakGlassActive) {
      await this.auditService.recordTransactionLog({
        category: 'security_break_glass',
        action: 'fallback_ad_login',
        status: 'success',
        ipAddress,
        message: `เข้าสู่ระบบผ่าน AD Gateway สำรองในช่วง Break-Glass: '${user.username}'`,
        triggeredBy: `user:${user.username}`,
        details: {
          event_code: 'BG-02',
          username: user.username,
          gateway: resolvedGatewayBaseUrl || 'local_db',
          login_method: loginMethod,
          ip: ipAddress,
        },
      });
    }

    // Calculate 90-day password expiration for Local DB users
    let mustChangePassword = false;
    let daysLeft = 90;
    if (!user.isAdAuth) {
      const expCheck = isPasswordExpired(user.passwordChangedAt, user.createdAt);
      daysLeft = expCheck.daysLeft;
      mustChangePassword = Boolean(user.mustChangePassword || expCheck.isExpired);
    }

    // Fetch allowed menus for the user's role
    const allowedMenus = await this.usersService.findAllowedMenusByRole(user.role);

    return {
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        allowedMenus,
        mustChangePassword,
        daysLeft,
        isAdAuth: user.isAdAuth,
      },
    };
  }

  @Post(['local/change-password', 'change-password'])
  @UseGuards(JwtAuthGuard)
  async changeLocalPassword(
    @Body() body: { oldPassword?: string; newPassword?: string },
    @Req() req: any,
  ) {
    const username = req.user?.username;
    if (!username) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้จาก Token');
    }

    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('ไม่พบบัญชีผู้ใช้ในระบบ');
    }

    if (user.isAdAuth) {
      throw new BadRequestException('บัญชี Active Directory ต้องเปลี่ยนรหัสผ่านผ่านระบบส่วนกลางหรือ AD Domain');
    }

    const oldPassword = body.oldPassword || '';
    const newPassword = body.newPassword || '';

    if (!oldPassword) {
      throw new BadRequestException('กรุณาระบุรหัสผ่านเดิม');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('รหัสผ่านเดิมไม่ถูกต้อง');
    }

    const complexityError = validatePasswordComplexity(newPassword, user.username);
    if (complexityError) {
      throw new BadRequestException(complexityError);
    }

    await this.usersService.updateUserPasswordAndPin(user.id, newPassword);
    const ipAddress = resolveClientIp(req);

    await this.auditService.recordTransactionLog({
      category: 'ciam_sso',
      action: 'local_password_rotated',
      status: 'success',
      ipAddress,
      message: `เปลี่ยนรหัสผ่านบัญชีท้องถิ่นสำเร็จ: ผู้ใช้ '${user.username}' (อายุ 90 วัน)`,
      triggeredBy: `user:${user.username}`,
      details: {
        username: user.username,
        rotation_cycle_days: 90,
      },
    });

    return {
      success: true,
      status: 'SUCCESS',
      message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว (มีอายุ 90 วัน)',
    };
  }

  @Post('session/ping')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async pingSession() {
    return {
      status: 'ok',
      idle_timeout_minutes: getIdleTimeoutMinutes(),
      server_time: new Date().toISOString(),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: { reason?: string }, @Req() req: Request) {
    const ipAddress = resolveClientIp(req);
    const authHeader = req.headers.authorization;
    let username = 'unknown';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const secret = process.env.JWT_SECRET || 'WindowAsiaJWTSecretKey2026';
        const decoded = jwt.verify(token, secret, { ignoreExpiration: true }) as any;
        if (decoded?.username) {
          username = String(decoded.username);
          clearUserSessionActivity(buildSessionKey(username, decoded.iat));
        }
      } catch {
        // Ignore malformed token on logout
      }
    }

    if (body?.reason === 'idle_timeout') {
      const idleMinutes = parseInt(
        await this.getDynamicSetting('ciam_idle_timeout_minutes', String(getIdleTimeoutMinutes())),
        10,
      ) || getIdleTimeoutMinutes();

      await this.auditService.recordTransactionLog({
        category: 'ciam_sso',
        action: 'session_idle_timeout',
        status: 'info',
        ipAddress,
        message: `ระบบตัดเซสชันและออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานเกิน ${idleMinutes} นาที (Idle Timeout)`,
        triggeredBy: 'system:idle_timeout',
        details: {
          event_code: 'TO-01',
          idle_minutes: idleMinutes,
          user: username,
        },
      });
    }

    return { status: 'ok', message: 'Logged out successfully' };
  }
}
