import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { SystemSetting } from '../backoffice/system-setting.entity';
import type { Request } from 'express';
export declare class AuthController {
    private readonly usersService;
    private readonly auditService;
    private readonly systemSettingRepo;
    constructor(usersService: UsersService, auditService: AuditService, systemSettingRepo: Repository<SystemSetting>);
    private getDynamicSetting;
    login(body: {
        username: string;
        passwordPlain: string;
        loginMethod?: 'DB' | 'AD';
        corporate_fax?: string;
        security_honey?: string;
        form_render_ts?: number;
    }, req: Request): Promise<{
        success: boolean;
        token: string;
        user: {
            username: string;
            role: import("../users/user.entity").UserRole;
            allowedMenus: string[];
            mustChangePassword: boolean;
            daysLeft: number;
            isAdAuth: boolean;
        };
    }>;
    changeLocalPassword(body: {
        oldPassword?: string;
        newPassword?: string;
    }, req: any): Promise<{
        success: boolean;
        status: string;
        message: string;
    }>;
}
