import { OnApplicationBootstrap } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './user.entity';
import { RolePermission } from './role-permission.entity';
export declare class UsersService implements OnApplicationBootstrap {
    private readonly userRepository;
    private readonly rolePermissionRepository;
    constructor(userRepository: Repository<User>, rolePermissionRepository: Repository<RolePermission>);
    onApplicationBootstrap(): Promise<void>;
    findByUsername(username: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findAll(): Promise<User[]>;
    createUser(username: string, passwordPlain: string, role: UserRole): Promise<User>;
    updateUserRoleAndStatus(id: string, role: UserRole, status: UserStatus): Promise<User>;
    deleteUser(id: string): Promise<void>;
    recordFailedAttempt(user: User): Promise<void>;
    resetFailedAttempts(user: User): Promise<void>;
    findAllowedMenusByRole(role: string): Promise<string[]>;
    findAllRolePermissions(): Promise<RolePermission[]>;
    updateRolePermissions(role: string, allowedMenus: string[]): Promise<RolePermission>;
}
