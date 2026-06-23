import { Injectable, OnApplicationBootstrap, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './user.entity';
import { RolePermission } from './role-permission.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  // Seed default users and permissions on startup if table is empty
  async onApplicationBootstrap() {
    // 1. Seed Role Permissions
    const permCount = await this.rolePermissionRepository.count();
    if (permCount === 0) {
      console.log('[PERMISSIONS SEED] Seeding default role permissions...');
      const defaultPermissions = [
        {
          role: UserRole.SYSTEM_ADMIN,
          allowedMenus: ['dashboard', 'checker', 'generate', 'production-tracker', 'crm', 'users', 'groups', 'logs'],
        },
        {
          role: UserRole.QR_GENERATOR,
          allowedMenus: ['checker', 'generate', 'production-tracker'],
        },
        {
          role: UserRole.CRM_MANAGER,
          allowedMenus: ['dashboard', 'checker', 'crm'],
        },
      ];

      for (const p of defaultPermissions) {
        const permObj = this.rolePermissionRepository.create(p);
        await this.rolePermissionRepository.save(permObj);
      }
      console.log('[PERMISSIONS SEED] Seeding completed.');
    }

    // 2. Seed Users
    const count = await this.userRepository.count();
    if (count === 0) {
      console.log('[USERS SEED] Seeding default back office users...');
      
      const adminPass = await bcrypt.hash('WindowAsia@2026', 10);
      
      const defaultUsers = [
        {
          username: 'admin',
          passwordHash: adminPass,
          role: UserRole.SYSTEM_ADMIN,
          status: UserStatus.ACTIVE,
        },
        {
          username: 'factory1',
          passwordHash: adminPass,
          role: UserRole.QR_GENERATOR,
          status: UserStatus.ACTIVE,
        },
        {
          username: 'crm1',
          passwordHash: adminPass,
          role: UserRole.CRM_MANAGER,
          status: UserStatus.ACTIVE,
        },
      ];

      for (const u of defaultUsers) {
        const userObj = this.userRepository.create(u);
        await this.userRepository.save(userObj);
      }
      console.log('[USERS SEED] Seeding completed.');
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { username: 'ASC' },
    });
  }

  async createUser(username: string, passwordPlain: string, role: UserRole): Promise<User> {
    // Validate username uniqueness
    const existing = await this.findByUsername(username.trim().toLowerCase());
    if (existing) {
      throw new BadRequestException('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
    }

    // Validate password complexity
    if (!passwordPlain || passwordPlain.length < 8) {
      throw new BadRequestException('รหัสผ่านต้องมีความยาวไม่น้อยกว่า 8 ตัวอักษร');
    }
    
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const newUser = this.userRepository.create({
      username: username.trim().toLowerCase(),
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
    });

    return this.userRepository.save(newUser);
  }

  async updateUserRoleAndStatus(id: string, role: UserRole, status: UserStatus): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้ที่ระบุ');
    }

    user.role = role;
    user.status = status;
    if (status === UserStatus.ACTIVE) {
      user.failedAttempts = 0;
      user.lockedUntil = null;
    }

    return this.userRepository.save(user);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้ที่ระบุ');
    }
    if (user.username === 'admin') {
      throw new BadRequestException('ไม่สามารถลบผู้ดูแลระบบหลัก (admin) ได้');
    }
    await this.userRepository.delete(id);
  }

  // Record failed login attempt and check lock eligibility
  async recordFailedAttempt(user: User): Promise<void> {
    user.failedAttempts += 1;
    if (user.failedAttempts >= 5) {
      user.status = UserStatus.LOCKED;
      const lockoutTime = new Date();
      lockoutTime.setMinutes(lockoutTime.getMinutes() + 15); // Lock for 15 minutes
      user.lockedUntil = lockoutTime;
      console.log(`[AUTH] User ${user.username} locked out until ${lockoutTime.toISOString()} due to excessive failures.`);
    }
    await this.userRepository.save(user);
  }

  // Reset failed attempts upon successful login
  async resetFailedAttempts(user: User): Promise<void> {
    if (user.failedAttempts > 0 || user.lockedUntil) {
      user.failedAttempts = 0;
      user.lockedUntil = null;
      await this.userRepository.save(user);
    }
  }

  // Find allowed menus for a specific role
  async findAllowedMenusByRole(role: string): Promise<string[]> {
    const perm = await this.rolePermissionRepository.findOne({ where: { role } });
    return perm ? perm.allowedMenus : [];
  }

  // Get all role permissions
  async findAllRolePermissions(): Promise<RolePermission[]> {
    return this.rolePermissionRepository.find({ order: { role: 'ASC' } });
  }

  // Update allowed menus for a role
  async updateRolePermissions(role: string, allowedMenus: string[]): Promise<RolePermission> {
    let perm = await this.rolePermissionRepository.findOne({ where: { role } });
    if (!perm) {
      perm = this.rolePermissionRepository.create({ role, allowedMenus });
    } else {
      perm.allowedMenus = allowedMenus;
    }
    return this.rolePermissionRepository.save(perm);
  }
}
