import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './user.entity';
import { RolePermission } from './role-permission.entity';
import { TelegramService } from '../telegram/telegram.service';
export declare class UsersService implements OnApplicationBootstrap {
    private readonly userRepository;
    private readonly rolePermissionRepository;
    private readonly telegramService;
    constructor(userRepository: Repository<User>, rolePermissionRepository: Repository<RolePermission>, telegramService: TelegramService);
    onApplicationBootstrap(): Promise<void>;
    findByUsername(username: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    createUser(username: string, passwordPlain: string, role: UserRole, firstName: string, lastName: string, department: string, email: string | null, mobile: string | null, telegramId: string | null, pinCode?: string | null, isAdAuth?: boolean): Promise<User>;
    updateUser(id: string, data: {
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
    }): Promise<User>;
    updateUserPasswordAndPin(id: string, passwordPlain?: string, pinCode?: string | null, isPasswordCachedFromAd?: boolean): Promise<User>;
    deleteUser(id: string): Promise<void>;
    recordFailedAttempt(user: User): Promise<void>;
    resetFailedAttempts(user: User): Promise<void>;
    recordSuccessfulLogin(user: User): Promise<void>;
    sendTestTelegramMessage(user: User): Promise<{
        success: boolean;
        error?: string;
    }>;
    findAllowedMenusByRole(role: string): Promise<string[]>;
    findAllRolePermissions(): Promise<RolePermission[]>;
    updateRolePermissions(role: string, allowedMenus: string[]): Promise<RolePermission>;
    findUsersByRole(role: UserRole): Promise<User[]>;
}
