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
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const system_setting_entity_1 = require("../backoffice/system-setting.entity");
const audit_log_entity_1 = require("../audit/audit-log.entity");
const nodemailer = __importStar(require("nodemailer"));
let OtpService = class OtpService {
    systemSettingRepository;
    auditLogRepository;
    constructor(systemSettingRepository, auditLogRepository) {
        this.systemSettingRepository = systemSettingRepository;
        this.auditLogRepository = auditLogRepository;
    }
    otpStore = new Map();
    getCleanContact(contact, channel) {
        if (channel === 'email') {
            return contact.trim().toLowerCase();
        }
        return contact.replace(/\D/g, '');
    }
    async logVerifyResult(contact, success, method) {
        try {
            await this.auditLogRepository.save(this.auditLogRepository.create({
                actorUsername: 'CUSTOMER',
                action: success ? 'OTP_VERIFY_SUCCESS' : 'OTP_VERIFY_FAIL',
                resource: 'SMS',
                resourceId: contact,
                details: JSON.stringify({ method, success }),
            }));
        }
        catch (err) {
            console.warn('[OTP LOG ERROR] Failed to write OTP verify audit log:', err.message);
        }
    }
    async generateAndSendOtp(contact, channel = 'sms') {
        const cleanContact = this.getCleanContact(contact, channel);
        const durationSeconds = 300;
        const expiresAt = Date.now() + durationSeconds * 1000;
        if (channel === 'email') {
            const emailModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'EMAIL_OTP_MODE' } });
            const emailMode = emailModeSetting?.value || 'TEST';
            if (emailMode === 'LIVE') {
                const smtpHostSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMTP_HOST' } });
                const smtpPortSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMTP_PORT' } });
                const smtpSecureSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMTP_SECURE' } });
                const smtpUserSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMTP_USER' } });
                const smtpPassSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMTP_PASS' } });
                const smtpFromNameSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMTP_FROM_NAME' } });
                const smtpFromEmailSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMTP_FROM_EMAIL' } });
                const smtpHost = smtpHostSetting?.value || 'smtp.gmail.com';
                const smtpPort = parseInt(smtpPortSetting?.value || '587', 10);
                const smtpSecure = smtpSecureSetting?.value === 'true';
                const smtpUser = smtpUserSetting?.value || 'itwindowasia@gmail.com';
                const smtpPass = smtpPassSetting?.value || '';
                const smtpFromName = smtpFromNameSetting?.value || 'Window Asia Warranty';
                const smtpFromEmail = smtpFromEmailSetting?.value || smtpUser;
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                this.otpStore.set(cleanContact, { code, expiresAt });
                console.log(`[OTP SERVICE] Generated LIVE SMTP OTP ${code} for email ${cleanContact}`);
                try {
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpSecure,
                        auth: {
                            user: smtpUser,
                            pass: smtpPass,
                        },
                        tls: {
                            rejectUnauthorized: false,
                        },
                    });
                    const mailOptions = {
                        from: `"${smtpFromName}" <${smtpFromEmail}>`,
                        to: cleanContact,
                        subject: 'รหัสยืนยันตัวตนสำหรับการลงทะเบียนรับประกันสินค้า (Warranty Verification OTP)',
                        html: `
              <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #0f172a; margin-bottom: 16px;">ยืนยันตัวตนการรับประกันสินค้า Window Asia</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">เรียน ลูกค้าผู้มีอุปการคุณ</p>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">รหัสยืนยันตัวตน (OTP) ของคุณคือ:</p>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${code}</span>
                </div>
                <p style="color: #ef4444; font-size: 12px; font-weight: 600;">*รหัส OTP นี้จะมีอายุการใช้งาน 5 นาที</p>
                <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px;">
                  หากคุณไม่ได้ส่งคำขอนี้ โปรดเพิกเฉยต่ออีเมลฉบับนี้<br>
                  บริษัท วินโดว์ เอเชีย จำกัด (มหาชน)
                </p>
              </div>
            `,
                    };
                    await transporter.sendMail(mailOptions);
                    await this.auditLogRepository.save(this.auditLogRepository.create({
                        actorUsername: 'CUSTOMER',
                        action: 'OTP_REQUEST',
                        resource: 'EMAIL',
                        resourceId: cleanContact,
                        details: JSON.stringify({ provider: 'SMTP', mode: 'LIVE', success: true }),
                    })).catch(() => { });
                    return {
                        success: true,
                        expiresIn: durationSeconds,
                    };
                }
                catch (err) {
                    console.error(`[OTP SERVICE] SMTP Send Error:`, err);
                    await this.auditLogRepository.save(this.auditLogRepository.create({
                        actorUsername: 'CUSTOMER',
                        action: 'OTP_REQUEST',
                        resource: 'EMAIL',
                        resourceId: cleanContact,
                        details: JSON.stringify({ provider: 'SMTP', mode: 'LIVE', success: false, error: err.message }),
                    })).catch(() => { });
                    throw new common_1.BadRequestException('ไม่สามารถส่งรหัส OTP ไปยังอีเมลปลายทางได้ โปรดตรวจสอบความถูกต้องของอีเมลหรือการตั้งค่า SMTP Server');
                }
            }
            const code = '123456';
            this.otpStore.set(cleanContact, { code, expiresAt });
            console.log(`[OTP SERVICE] Generated Mock OTP ${code} for email ${cleanContact}`);
            await this.auditLogRepository.save(this.auditLogRepository.create({
                actorUsername: 'CUSTOMER',
                action: 'OTP_REQUEST',
                resource: 'EMAIL',
                resourceId: cleanContact,
                details: JSON.stringify({ provider: 'MOCK', mode: 'TEST', success: true }),
            })).catch(() => { });
            return {
                success: true,
                expiresIn: durationSeconds,
            };
        }
        else {
            const otpModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_OTP_MODE' } });
            const otpMode = otpModeSetting?.value || 'TEST';
            if (otpMode === 'REAL') {
                const providerSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_PROVIDER_NAME' } });
                const provider = providerSetting?.value || 'MOCK';
                if (provider === 'SMSMKT') {
                    const apiKeySetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_API_KEY' } });
                    const apiSecretSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_API_SECRET' } });
                    const sendUrlSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_SEND_URL' } });
                    const projectKeySetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_PROJECT_KEY' } });
                    const apiKey = apiKeySetting?.value;
                    const apiSecret = apiSecretSetting?.value;
                    const sendUrl = sendUrlSetting?.value || 'https://portal-otp.smsmkt.com/api/otp-send';
                    const projectKey = projectKeySetting?.value;
                    if (apiKey && apiSecret && projectKey) {
                        console.log(`[OTP SERVICE] Requesting SMSMKT OTP for phone ${cleanContact}...`);
                        try {
                            const response = await fetch(sendUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'api_key': apiKey,
                                    'secret_key': apiSecret,
                                },
                                body: JSON.stringify({
                                    project_key: projectKey,
                                    phone: cleanContact,
                                    ref_code: '',
                                }),
                            });
                            if (!response.ok) {
                                const text = await response.text();
                                console.error(`[OTP SERVICE] SMSMKT HTTP error response (status ${response.status}):`, text);
                                await this.auditLogRepository.save(this.auditLogRepository.create({
                                    actorUsername: 'CUSTOMER',
                                    action: 'OTP_REQUEST',
                                    resource: 'SMS',
                                    resourceId: cleanContact,
                                    details: JSON.stringify({ provider: 'SMSMKT', mode: 'REAL', success: false, error: 'HTTP Status Error' }),
                                })).catch(() => { });
                                throw new common_1.BadRequestException('ไม่สามารถส่งรหัส OTP ได้ผ่านบริการ SMSMKT (HTTP status error)');
                            }
                            const data = await response.json();
                            console.log(`[OTP SERVICE] SMSMKT send response:`, JSON.stringify(data));
                            if (data.code === '000' && data.result) {
                                const { token, ref_code } = data.result;
                                this.otpStore.set(cleanContact, {
                                    token,
                                    refCode: ref_code,
                                    expiresAt,
                                });
                                await this.auditLogRepository.save(this.auditLogRepository.create({
                                    actorUsername: 'CUSTOMER',
                                    action: 'OTP_REQUEST',
                                    resource: 'SMS',
                                    resourceId: cleanContact,
                                    details: JSON.stringify({ provider: 'SMSMKT', mode: 'REAL', success: true }),
                                })).catch(() => { });
                                return {
                                    success: true,
                                    expiresIn: durationSeconds,
                                    refCode: ref_code,
                                };
                            }
                            else {
                                await this.auditLogRepository.save(this.auditLogRepository.create({
                                    actorUsername: 'CUSTOMER',
                                    action: 'OTP_REQUEST',
                                    resource: 'SMS',
                                    resourceId: cleanContact,
                                    details: JSON.stringify({ provider: 'SMSMKT', mode: 'REAL', success: false, error: data.detail }),
                                })).catch(() => { });
                                throw new common_1.BadRequestException(`บริการ SMSMKT ส่งรหัสล้มเหลว: ${data.detail || 'ไม่ระบุสาเหตุ'}`);
                            }
                        }
                        catch (err) {
                            await this.auditLogRepository.save(this.auditLogRepository.create({
                                actorUsername: 'CUSTOMER',
                                action: 'OTP_REQUEST',
                                resource: 'SMS',
                                resourceId: cleanContact,
                                details: JSON.stringify({ provider: 'SMSMKT', mode: 'REAL', success: false, error: err.message }),
                            })).catch(() => { });
                            console.error(`[OTP SERVICE] SMSMKT send exception:`, err);
                            throw new common_1.BadRequestException(err instanceof common_1.BadRequestException ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อบริการส่ง SMS OTP');
                        }
                    }
                    else {
                        console.warn('[OTP SERVICE] SMSMKT is selected but API configuration settings are incomplete. Falling back to Mock.');
                    }
                }
            }
            const code = '123456';
            this.otpStore.set(cleanContact, { code, expiresAt });
            console.log(`[OTP SERVICE] Generated Mock OTP ${code} for phone +66${cleanContact}`);
            await this.auditLogRepository.save(this.auditLogRepository.create({
                actorUsername: 'CUSTOMER',
                action: 'OTP_REQUEST',
                resource: 'SMS',
                resourceId: cleanContact,
                details: JSON.stringify({ provider: 'MOCK', mode: 'TEST', success: true }),
            })).catch(() => { });
            return {
                success: true,
                expiresIn: durationSeconds,
                refCode: 'MOCK',
            };
        }
    }
    async verifyOtp(contact, code) {
        const isEmail = contact.includes('@');
        const cleanContact = this.getCleanContact(contact, isEmail ? 'email' : 'sms');
        const data = this.otpStore.get(cleanContact);
        if (!data) {
            throw new common_1.BadRequestException('ไม่พบคำขอรหัส OTP สำหรับข้อมูลการติดต่อนี้ในระบบ');
        }
        if (Date.now() > data.expiresAt) {
            this.otpStore.delete(cleanContact);
            throw new common_1.BadRequestException('รหัส OTP หมดอายุแล้ว โปรดขอรหัส OTP ใหม่อีกครั้ง');
        }
        if (isEmail) {
            if (data.code !== code) {
                await this.logVerifyResult(cleanContact, false, 'Email');
                throw new common_1.BadRequestException('รหัส OTP ไม่ถูกต้อง');
            }
            this.otpStore.delete(cleanContact);
            await this.logVerifyResult(cleanContact, true, 'Email');
            return true;
        }
        const otpModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_OTP_MODE' } });
        const otpMode = otpModeSetting?.value || 'TEST';
        if (otpMode === 'REAL') {
            const providerSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_PROVIDER_NAME' } });
            const provider = providerSetting?.value || 'MOCK';
            if (provider === 'SMSMKT' && data.token) {
                const apiKeySetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_API_KEY' } });
                const apiSecretSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_API_SECRET' } });
                const validateUrlSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_VALIDATE_URL' } });
                const apiKey = apiKeySetting?.value;
                const apiSecret = apiSecretSetting?.value;
                const validateUrl = validateUrlSetting?.value || 'https://portal-otp.smsmkt.com/api/otp-validate';
                if (apiKey && apiSecret) {
                    console.log(`[OTP SERVICE] Validating OTP via SMSMKT for token ${data.token}...`);
                    try {
                        const response = await fetch(validateUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'api_key': apiKey,
                                'secret_key': apiSecret,
                            },
                            body: JSON.stringify({
                                token: data.token,
                                otp_code: code,
                                ref_code: data.refCode || '',
                            }),
                        });
                        if (!response.ok) {
                            const text = await response.text();
                            console.error(`[OTP SERVICE] SMSMKT validate HTTP error response (status ${response.status}):`, text);
                            throw new common_1.BadRequestException('ไม่สามารถเชื่อมต่อระบบตรวจสอบ OTP ของ SMSMKT ได้');
                        }
                        const resData = await response.json();
                        console.log(`[OTP SERVICE] SMSMKT validate response:`, JSON.stringify(resData));
                        if (resData.code === '000' && resData.result && resData.result.status === true) {
                            this.otpStore.delete(cleanContact);
                            await this.logVerifyResult(cleanContact, true, 'SMSMKT');
                            return true;
                        }
                        else {
                            await this.logVerifyResult(cleanContact, false, 'SMSMKT');
                            throw new common_1.BadRequestException(`รหัส OTP ไม่ถูกต้อง หรือการยืนยันตัวตนล้มเหลว (${resData.detail || 'รหัสไม่ตรง'})`);
                        }
                    }
                    catch (err) {
                        console.error(`[OTP SERVICE] SMSMKT validate exception:`, err);
                        await this.logVerifyResult(cleanContact, false, 'SMSMKT Error');
                        throw new common_1.BadRequestException(err instanceof common_1.BadRequestException ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP');
                    }
                }
            }
        }
        if (data.code !== code && code !== '123456') {
            await this.logVerifyResult(cleanContact, false, 'Mock');
            throw new common_1.BadRequestException('รหัส OTP ไม่ถูกต้อง');
        }
        this.otpStore.delete(cleanContact);
        await this.logVerifyResult(cleanContact, true, 'Mock');
        return true;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(system_setting_entity_1.SystemSetting)),
    __param(1, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], OtpService);
//# sourceMappingURL=otp.service.js.map