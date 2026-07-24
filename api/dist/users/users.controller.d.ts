import { UsersService } from './users.service';
import { UserRole, UserStatus } from './user.entity';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getAllUsers(): Promise<{
        id: string;
        systemSeqId: number;
        username: string;
        firstName: string;
        lastName: string;
        department: string;
        email: string | null;
        mobile: string | null;
        telegramId: string | null;
        pinCode: string | null;
        lastLogin: Date | null;
        role: UserRole;
        status: UserStatus;
        failedAttempts: number;
        lockedUntil: Date | null;
        isAdAuth: boolean;
        createdAt: Date;
    }[]>;
    createUser(body: {
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
        isAdAuth?: boolean;
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
        firstName: string;
        lastName: string;
        department: string;
        email: string | null;
        mobile: string | null;
        telegramId: string | null;
        pinCode?: string | null;
        isAdAuth?: boolean;
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
    updatePasswordAndPin(id: string, body: {
        passwordPlain?: string;
        pinCode?: string | null;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    testTelegram(id: string): Promise<{
        success: boolean;
        message: string;
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
