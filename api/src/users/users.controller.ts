import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole, UserStatus } from './user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN') // Only SYSTEM_ADMIN can manage users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers() {
    const list = await this.usersService.findAll();
    // Map to remove password hashes for security (OWASP recommendation)
    return list.map(u => ({
      id: u.id,
      systemSeqId: u.systemSeqId,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      department: u.department,
      email: u.email,
      mobile: u.mobile,
      telegramId: u.telegramId,
      pinCode: u.pinCode,
      lastLogin: u.lastLogin,
      role: u.role,
      status: u.status,
      failedAttempts: u.failedAttempts,
      lockedUntil: u.lockedUntil,
      createdAt: u.createdAt,
    }));
  }

  @Post()
  async createUser(
    @Body() body: {
      username: string;
      passwordPlain: string;
      role: UserRole;
      firstName: string;
      lastName: string;
      department: string;
      email: string | null;
      mobile: string | null;
      telegramId: string | null;
      pinCode?: string | null;
    },
  ) {
    const user = await this.usersService.createUser(
      body.username,
      body.passwordPlain,
      body.role,
      body.firstName,
      body.lastName,
      body.department,
      body.email,
      body.mobile,
      body.telegramId,
      body.pinCode,
    );
    return {
      success: true,
      message: 'สร้างผู้ใช้งานสำเร็จ',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    };
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: {
      role: UserRole;
      status: UserStatus;
      firstName: string;
      lastName: string;
      department: string;
      email: string | null;
      mobile: string | null;
      telegramId: string | null;
      pinCode?: string | null;
    },
  ) {
    const user = await this.usersService.updateUser(id, body);
    return {
      success: true,
      message: 'ปรับปรุงข้อมูลผู้ใช้งานเรียบร้อยแล้ว',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    };
  }

  @Put(':id/password-pin')
  async updatePasswordAndPin(
    @Param('id') id: string,
    @Body() body: { passwordPlain?: string; pinCode?: string | null },
  ) {
    await this.usersService.updateUserPasswordAndPin(id, body.passwordPlain, body.pinCode);
    return {
      success: true,
      message: 'ปรับปรุงรหัสผ่านและ PIN Code เรียบร้อยแล้ว',
    };
  }

  @Post(':id/test-telegram')
  async testTelegram(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้ที่ระบุ');
    }
    if (!user.telegramId) {
      throw new BadRequestException('ผู้ใช้นี้ไม่มี Telegram ID สำหรับการส่งข้อความทดสอบ');
    }
    const result = await this.usersService.sendTestTelegramMessage(user);
    if (!result.success) {
      throw new BadRequestException(`ส่งข้อความทดสอบไปยัง Telegram ล้มเหลว: ${result.error || 'โปรดตรวจสอบ Telegram ID หรือ Token บอท'}`);
    }
    return {
      success: true,
      message: 'ส่งข้อความทดสอบไปยัง Telegram สำเร็จ',
    };
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return {
      success: true,
      message: 'ลบผู้ใช้งานออกจากระบบเรียบร้อยแล้ว',
    };
  }

  @Get('roles')
  async getAllRolePermissions() {
    return this.usersService.findAllRolePermissions();
  }

  @Put('roles/:roleName')
  async updateRolePermissions(
    @Param('roleName') roleName: string,
    @Body() body: { allowedMenus: string[] },
  ) {
    const updated = await this.usersService.updateRolePermissions(roleName, body.allowedMenus);
    return {
      success: true,
      message: 'ปรับปรุงสิทธิ์ของกลุ่มผู้ใช้งานเรียบร้อยแล้ว',
      data: updated,
    };
  }
}
