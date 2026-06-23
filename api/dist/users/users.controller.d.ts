import { UsersService } from './users.service';
import { UserRole, UserStatus } from './user.entity';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getAllUsers(): Promise<{
        id: string;
        username: string;
        role: UserRole;
        status: UserStatus;
        failedAttempts: number;
        lockedUntil: Date | null;
        createdAt: Date;
    }[]>;
    createUser(body: {
        username: string;
        passwordPlain: string;
        role: UserRole;
    }): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            username: string;
            role: UserRole;
            status: UserStatus;
        };
    }>;
    updateUser(id: string, body: {
        role: UserRole;
        status: UserStatus;
    }): Promise<{
        success: boolean;
        message: string;
        user: {
            id: string;
            username: string;
            role: UserRole;
            status: UserStatus;
        };
    }>;
    deleteUser(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getAllRolePermissions(): Promise<import("./role-permission.entity").RolePermission[]>;
    updateRolePermissions(roleName: string, body: {
        allowedMenus: string[];
    }): Promise<{
        success: boolean;
        message: string;
        data: import("./role-permission.entity").RolePermission;
    }>;
}
