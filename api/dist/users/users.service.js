"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const role_permission_entity_1 = require("./role-permission.entity");
const bcrypt = __importStar(require("bcryptjs"));
let UsersService = class UsersService {
    userRepository;
    rolePermissionRepository;
    constructor(userRepository, rolePermissionRepository) {
        this.userRepository = userRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }
    async onApplicationBootstrap() {
        const permCount = await this.rolePermissionRepository.count();
        if (permCount === 0) {
            console.log('[PERMISSIONS SEED] Seeding default role permissions...');
            const defaultPermissions = [
                {
                    role: user_entity_1.UserRole.SYSTEM_ADMIN,
                    allowedMenus: ['dashboard', 'checker', 'generate', 'production-tracker', 'crm', 'users', 'groups', 'logs'],
                },
                {
                    role: user_entity_1.UserRole.QR_GENERATOR,
                    allowedMenus: ['checker', 'generate', 'production-tracker'],
                },
                {
                    role: user_entity_1.UserRole.CRM_MANAGER,
                    allowedMenus: ['dashboard', 'checker', 'crm'],
                },
            ];
            for (const p of defaultPermissions) {
                const permObj = this.rolePermissionRepository.create(p);
                await this.rolePermissionRepository.save(permObj);
            }
            console.log('[PERMISSIONS SEED] Seeding completed.');
        }
        const count = await this.userRepository.count();
        if (count === 0) {
            console.log('[USERS SEED] Seeding default back office users...');
            const adminPass = await bcrypt.hash('WindowAsia@2026', 10);
            const defaultUsers = [
                {
                    username: 'admin',
                    passwordHash: adminPass,
                    role: user_entity_1.UserRole.SYSTEM_ADMIN,
                    status: user_entity_1.UserStatus.ACTIVE,
                },
                {
                    username: 'factory1',
                    passwordHash: adminPass,
                    role: user_entity_1.UserRole.QR_GENERATOR,
                    status: user_entity_1.UserStatus.ACTIVE,
                },
                {
                    username: 'crm1',
                    passwordHash: adminPass,
                    role: user_entity_1.UserRole.CRM_MANAGER,
                    status: user_entity_1.UserStatus.ACTIVE,
                },
            ];
            for (const u of defaultUsers) {
                const userObj = this.userRepository.create(u);
                await this.userRepository.save(userObj);
            }
            console.log('[USERS SEED] Seeding completed.');
        }
    }
    async findByUsername(username) {
        return this.userRepository.findOne({ where: { username } });
    }
    async findById(id) {
        return this.userRepository.findOne({ where: { id } });
    }
    async findAll() {
        return this.userRepository.find({
            order: { username: 'ASC' },
        });
    }
    async createUser(username, passwordPlain, role) {
        const existing = await this.findByUsername(username.trim().toLowerCase());
        if (existing) {
            throw new common_1.BadRequestException('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว');
        }
        if (!passwordPlain || passwordPlain.length < 8) {
            throw new common_1.BadRequestException('รหัสผ่านต้องมีความยาวไม่น้อยกว่า 8 ตัวอักษร');
        }
        const passwordHash = await bcrypt.hash(passwordPlain, 10);
        const newUser = this.userRepository.create({
            username: username.trim().toLowerCase(),
            passwordHash,
            role,
            status: user_entity_1.UserStatus.ACTIVE,
        });
        return this.userRepository.save(newUser);
    }
    async updateUserRoleAndStatus(id, role, status) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('ไม่พบผู้ใช้ที่ระบุ');
        }
        user.role = role;
        user.status = status;
        if (status === user_entity_1.UserStatus.ACTIVE) {
            user.failedAttempts = 0;
            user.lockedUntil = null;
        }
        return this.userRepository.save(user);
    }
    async deleteUser(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('ไม่พบผู้ใช้ที่ระบุ');
        }
        if (user.username === 'admin') {
            throw new common_1.BadRequestException('ไม่สามารถลบผู้ดูแลระบบหลัก (admin) ได้');
        }
        await this.userRepository.delete(id);
    }
    async recordFailedAttempt(user) {
        user.failedAttempts += 1;
        if (user.failedAttempts >= 5) {
            user.status = user_entity_1.UserStatus.LOCKED;
            const lockoutTime = new Date();
            lockoutTime.setMinutes(lockoutTime.getMinutes() + 15);
            user.lockedUntil = lockoutTime;
            console.log(`[AUTH] User ${user.username} locked out until ${lockoutTime.toISOString()} due to excessive failures.`);
        }
        await this.userRepository.save(user);
    }
    async resetFailedAttempts(user) {
        if (user.failedAttempts > 0 || user.lockedUntil) {
            user.failedAttempts = 0;
            user.lockedUntil = null;
            await this.userRepository.save(user);
        }
    }
    async findAllowedMenusByRole(role) {
        const perm = await this.rolePermissionRepository.findOne({ where: { role } });
        return perm ? perm.allowedMenus : [];
    }
    async findAllRolePermissions() {
        return this.rolePermissionRepository.find({ order: { role: 'ASC' } });
    }
    async updateRolePermissions(role, allowedMenus) {
        let perm = await this.rolePermissionRepository.findOne({ where: { role } });
        if (!perm) {
            perm = this.rolePermissionRepository.create({ role, allowedMenus });
        }
        else {
            perm.allowedMenus = allowedMenus;
        }
        return this.rolePermissionRepository.save(perm);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(role_permission_entity_1.RolePermission)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map