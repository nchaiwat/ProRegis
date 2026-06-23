import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
      username: u.username,
      role: u.role,
      status: u.status,
      failedAttempts: u.failedAttempts,
      lockedUntil: u.lockedUntil,
      createdAt: u.createdAt,
    }));
  }

  @Post()
  async createUser(
    @Body() body: { username: string; passwordPlain: string; role: UserRole },
  ) {
    const user = await this.usersService.createUser(body.username, body.passwordPlain, body.role);
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
    @Body() body: { role: UserRole; status: UserStatus },
  ) {
    const user = await this.usersService.updateUserRoleAndStatus(id, body.role, body.status);
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
