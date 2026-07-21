import { Injectable, OnApplicationBootstrap, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './user.entity';
import { RolePermission } from './role-permission.entity';
import { TelegramService, formatThaiDateTime } from '../telegram/telegram.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    private readonly telegramService: TelegramService,
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
          firstName: 'System',
          lastName: 'Admin',
          department: 'IT',
          email: 'admin@windowasia.com',
          mobile: '061-419-3518',
          telegramId: null,
        },
        {
          username: 'factory1',
          passwordHash: adminPass,
          role: UserRole.QR_GENERATOR,
          status: UserStatus.ACTIVE,
          firstName: 'Factory',
          lastName: 'One',
          department: 'PD',
          email: 'factory1@windowasia.com',
          mobile: '081-234-5679',
          telegramId: null,
        },
        {
          username: 'crm1',
          passwordHash: adminPass,
          role: UserRole.CRM_MANAGER,
          status: UserStatus.ACTIVE,
          firstName: 'CRM',
          lastName: 'One',
          department: 'CS',
          email: 'crm1@windowasia.com',
          mobile: '081-234-5680',
          telegramId: null,
        },
      ];

      for (const u of defaultUsers) {
        const userObj = this.userRepository.create(u);
        await this.userRepository.save(userObj);
      }
      console.log('[USERS SEED] Seeding completed.');
    }

    // Ensure SYSTEM_ADMIN has 'product-images' menu
    const adminPerm = await this.rolePermissionRepository.findOne({ where: { role: UserRole.SYSTEM_ADMIN } });
    if (adminPerm) {
      if (!adminPerm.allowedMenus.includes('product-images')) {
        adminPerm.allowedMenus.push('product-images');
        await this.rolePermissionRepository.save(adminPerm);
      }
    }

    // Ensure IMAGE_EDITOR permissions exist
    const editorPerm = await this.rolePermissionRepository.findOne({ where: { role: UserRole.IMAGE_EDITOR } });
    if (!editorPerm) {
      const p = this.rolePermissionRepository.create({
        role: UserRole.IMAGE_EDITOR,
        allowedMenus: ['product-images', 'checker'],
      });
      await this.rolePermissionRepository.save(p);
    }

    // Ensure default image_editor user exists
    const editorUser = await this.userRepository.findOne({ where: { username: 'image_editor' } });
    if (!editorUser) {
      const editorPass = await bcrypt.hash('WindowAsia@2026', 10);
      const u = this.userRepository.create({
        username: 'image_editor',
        passwordHash: editorPass,
        role: UserRole.IMAGE_EDITOR,
        status: UserStatus.ACTIVE,
        firstName: 'Image',
        lastName: 'Editor',
        department: 'Design',
        email: 'design@windowasia.com',
        mobile: '088-888-8888',
        telegramId: null,
      });
      await this.userRepository.save(u);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username: username.trim() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { username: 'ASC' },
    });
  }

  async createUser(
    username: string,
    passwordPlain: string,
    role: UserRole,
    firstName: string,
    lastName: string,
    department: string,
    email: string | null,
    mobile: string | null,
    telegramId: string | null,
    pinCode?: string | null,
    isAdAuth?: boolean,
  ): Promise<User> {
    // Validate username uniqueness
    const existing = await this.findByUsername(username.trim());
    if (existing) {
      throw new BadRequestException('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
    }

    // Validate password complexity
    if (!passwordPlain || passwordPlain.length < 8) {
      throw new BadRequestException('รหัสผ่านต้องมีความยาวไม่น้อยกว่า 8 ตัวอักษร');
    }
    
    // Validate PIN Code if provided
    if (pinCode && !/^\d{6}$/.test(pinCode)) {
      throw new BadRequestException('PIN Code ต้องเป็นตัวเลข 6 หลักเท่านั้น');
    }
    
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const newUser = this.userRepository.create({
      username: username.trim(),
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      firstName: firstName || '',
      lastName: lastName || '',
      department: department || '',
      email: email || null,
      mobile: mobile || null,
      telegramId: telegramId || null,
      pinCode: pinCode || null,
      isAdAuth: isAdAuth || false,
    });

    return this.userRepository.save(newUser);
  }

  async updateUser(
    id: string,
    data: {
      role: UserRole;
      status: UserStatus;
      firstName: string;
      lastName: string;
      department: string;
      email: string | null;
      mobile: string | null;
      telegramId: string | null;
      pinCode?: string | null;
      isAdAuth?: boolean;
    },
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้ที่ระบุ');
    }

    // Validate PIN Code if provided
    if (data.pinCode && !/^\d{6}$/.test(data.pinCode)) {
      throw new BadRequestException('PIN Code ต้องเป็นตัวเลข 6 หลักเท่านั้น');
    }

    user.role = data.role;
    user.status = data.status;
    user.firstName = data.firstName || '';
    user.lastName = data.lastName || '';
    user.department = data.department || '';
    user.email = data.email || null;
    user.mobile = data.mobile || null;
    user.telegramId = data.telegramId || null;
    user.pinCode = data.pinCode || null;
    user.isAdAuth = data.isAdAuth !== undefined ? data.isAdAuth : user.isAdAuth;

    if (data.status === UserStatus.ACTIVE) {
      user.failedAttempts = 0;
      user.lockedUntil = null;
    }

    return this.userRepository.save(user);
  }

  async updateUserPasswordAndPin(
    id: string,
    passwordPlain?: string,
    pinCode?: string | null,
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('ไม่พบผู้ใช้ที่ระบุ');
    }

    if (passwordPlain) {
      if (passwordPlain.length < 8) {
        throw new BadRequestException('รหัสผ่านต้องมีความยาวไม่น้อยกว่า 8 ตัวอักษร');
      }
      user.passwordHash = await bcrypt.hash(passwordPlain, 10);
    }

    if (pinCode !== undefined) {
      if (pinCode && !/^\d{6}$/.test(pinCode)) {
        throw new BadRequestException('PIN Code ต้องเป็นตัวเลข 6 หลักเท่านั้น');
      }
      user.pinCode = pinCode || null;
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

  async recordSuccessfulLogin(user: User): Promise<void> {
    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    await this.userRepository.save(user);
  }

  async sendTestTelegramMessage(user: User): Promise<{ success: boolean; error?: string }> {
    if (!user.telegramId) return { success: false, error: 'ไม่มี Telegram ID' };
    const timeStr = formatThaiDateTime(new Date());

    const message = [
      `🪟 <b>ProRegis</b> · ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📝 <b>ข้อความทดสอบการเชื่อมต่อ (Test Connection)</b>\n`,
      `👤 <b>ผู้รับทดสอบ:</b> ${user.firstName} ${user.lastName} (${user.username})`,
      `🔑 <b>User ID:</b> ${user.username}`,
      `🏢 <b>แผนก:</b> ${user.department || '-'}`,
      `📧 <b>อีเมล:</b> ${user.email || '-'}`,
      `📞 <b>เบอร์โทร:</b> ${user.mobile || '-'}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔍 <i>นี่คือการทดสอบการเชื่อมต่อระบบ หากได้รับข้อความนี้แสดงว่าบอทพร้อมทำงานแล้ว</i>`
    ].join('\n');

    return this.telegramService.sendDirectMessage(user.telegramId, message);
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
