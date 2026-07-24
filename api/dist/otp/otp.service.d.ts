import { Repository } from 'typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { AuditLog } from '../audit/audit-log.entity';
export declare class OtpService {
    private readonly systemSettingRepository;
    private readonly auditLogRepository;
    constructor(systemSettingRepository: Repository<SystemSetting>, auditLogRepository: Repository<AuditLog>);
    private otpStore;
    private getCleanContact;
    private logVerifyResult;
    generateAndSendOtp(contact: string, channel?: 'sms' | 'email'): Promise<{
        success: boolean;
        expiresIn: number;
        refCode?: string;
    }>;
    verifyOtp(contact: string, code: string): Promise<boolean>;
}
