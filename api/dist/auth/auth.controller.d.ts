import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import type { Request } from 'express';
export declare class AuthController {
    private readonly usersService;
    private readonly auditService;
    constructor(usersService: UsersService, auditService: AuditService);
    login(body: {
        username: string;
        passwordPlain: string;
    }, req: Request): Promise<{
        success: boolean;
        token: string;
        user: {
            username: string;
            role: import("../users/user.entity").UserRole;
            allowedMenus: string[];
        };
    }>;
}
