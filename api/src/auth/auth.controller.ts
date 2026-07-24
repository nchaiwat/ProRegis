import { Controller, Post, Body, Req, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { UserStatus } from '../users/user.entity';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { username: string; passwordPlain: string; loginMethod?: 'DB' | 'AD' },
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    const usernameNormalized = (body.username || '').trim();
    const user = await this.usersService.findByUsername(usernameNormalized);
    const loginMethod = body.loginMethod || 'DB';

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

      // Fast check with PIN code if set
      const isPinCorrect = !!(user.pinCode && body.passwordPlain === user.pinCode);
      loginSuccess = isPinCorrect;

      let adError = 'AD authentication failed';

      if (!loginSuccess) {
        // Always try AD Gateway directly, do not verify against local cache
        const gatewayUrl = process.env.AD_GATEWAY_URL || 'http://172.17.0.1:3101/api/v2/login';
        const appId = process.env.AD_APP_ID || 'ProRegis';
        const secretKey = process.env.AD_SECRET_KEY || 'd69f9e5a88e734c56e2978a63bf720c22635a9c0c32b5e2a2205510657e4e138';

        const now = new Date();
        const tzOffset = 7 * 60 * 60 * 1000; // Thailand local timezone (UTC+7)
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
              // Do NOT update user password cache in local DB to avoid credentials leak
            } else {
              adError = data?.message || `AD Gateway returned status: ${data?.status || 'failed'}`;
            }
          } else {
            adError = `AD Gateway HTTP error ${response.status}: ${response.statusText}`;
          }
        } catch (err) {
          adError = `AD Gateway connection failed: ${err.message}`;
          console.error('[AD GATEWAY ERROR]', err);
        }
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

    // Create JWT token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    const secret = process.env.JWT_SECRET || 'WindowAsiaJWTSecretKey2026';
    // Expire token in 8 hours (OWASP recommendation for administrative sessions)
    const token = jwt.sign(payload, secret, { expiresIn: '8h' });

    // Write audit log
    await this.auditService.logAction(
      user.username,
      'LOGIN_SUCCESS',
      'Auth',
      user.id,
      ipAddress,
      userAgent,
      { loginMethod },
    );

    // Fetch allowed menus for the user's role
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
}
