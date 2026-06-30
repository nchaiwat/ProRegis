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
    @Body() body: { username: string; passwordPlain: string },
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    const usernameNormalized = (body.username || '').trim();
    const user = await this.usersService.findByUsername(usernameNormalized);

    if (!user) {
      // Log failure (without revealing username if non-existent, but standard audits check it)
      await this.auditService.logAction(
        usernameNormalized,
        'LOGIN_FAILED',
        'Auth',
        null,
        ipAddress,
        userAgent,
        { reason: 'Username not found' },
      );
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // Check brute-force lockout status
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('บัญชีผู้ใช้นี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    if (user.status === UserStatus.LOCKED && user.lockedUntil) {
      const now = new Date();
      if (now < user.lockedUntil) {
        const secondsLeft = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
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

    // Verify password or PIN code
    const isPasswordCorrect = await bcrypt.compare(body.passwordPlain || '', user.passwordHash);
    const isPinCorrect = !!(user.pinCode && body.passwordPlain === user.pinCode);

    if (!isPasswordCorrect && !isPinCorrect) {
      await this.usersService.recordFailedAttempt(user);
      await this.auditService.logAction(
        user.username,
        'LOGIN_FAILED',
        'Auth',
        user.id,
        ipAddress,
        userAgent,
        { reason: 'Incorrect credentials', failedAttempts: user.failedAttempts },
      );
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
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
