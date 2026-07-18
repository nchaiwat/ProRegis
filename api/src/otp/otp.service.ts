import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { AuditLog } from '../audit/audit-log.entity';

interface OtpData {
  code?: string;
  token?: string;
  refCode?: string;
  expiresAt: number;
}

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  // Simple in-memory store. In production, use Redis.
  private otpStore = new Map<string, OtpData>();

  private getCleanContact(contact: string, channel: 'sms' | 'email'): string {
    if (channel === 'email') {
      return contact.trim().toLowerCase();
    }
    return contact.replace(/\D/g, '');
  }

  private async logVerifyResult(contact: string, success: boolean, method: string) {
    try {
      await this.auditLogRepository.save(this.auditLogRepository.create({
        actorUsername: 'CUSTOMER',
        action: success ? 'OTP_VERIFY_SUCCESS' : 'OTP_VERIFY_FAIL',
        resource: 'SMS',
        resourceId: contact,
        details: JSON.stringify({ method, success }),
      }));
    } catch (err) {
      console.warn('[OTP LOG ERROR] Failed to write OTP verify audit log:', err.message);
    }
  }

  async generateAndSendOtp(contact: string, channel: 'sms' | 'email' = 'sms'): Promise<{ success: boolean; expiresIn: number; refCode?: string }> {
    const cleanContact = this.getCleanContact(contact, channel);
    const durationSeconds = 300; // 5 minutes
    const expiresAt = Date.now() + durationSeconds * 1000;

    if (channel === 'email') {
      const code = '123456';
      this.otpStore.set(cleanContact, { code, expiresAt });
      console.log(`[OTP SERVICE] Generated OTP ${code} for email ${cleanContact}`);
      
      await this.auditLogRepository.save(this.auditLogRepository.create({
        actorUsername: 'CUSTOMER',
        action: 'OTP_REQUEST',
        resource: 'EMAIL',
        resourceId: cleanContact,
        details: JSON.stringify({ provider: 'MOCK', mode: 'TEST', success: true }),
      })).catch(() => {});

      return {
        success: true,
        expiresIn: durationSeconds,
      };
    } else {
      // SMS channel
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
                })).catch(() => {});

                throw new BadRequestException('ไม่สามารถส่งรหัส OTP ได้ผ่านบริการ SMSMKT (HTTP status error)');
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
                })).catch(() => {});

                return {
                  success: true,
                  expiresIn: durationSeconds,
                  refCode: ref_code,
                };
              } else {
                await this.auditLogRepository.save(this.auditLogRepository.create({
                  actorUsername: 'CUSTOMER',
                  action: 'OTP_REQUEST',
                  resource: 'SMS',
                  resourceId: cleanContact,
                  details: JSON.stringify({ provider: 'SMSMKT', mode: 'REAL', success: false, error: data.detail }),
                })).catch(() => {});

                throw new BadRequestException(`บริการ SMSMKT ส่งรหัสล้มเหลว: ${data.detail || 'ไม่ระบุสาเหตุ'}`);
              }
            } catch (err) {
              await this.auditLogRepository.save(this.auditLogRepository.create({
                actorUsername: 'CUSTOMER',
                action: 'OTP_REQUEST',
                resource: 'SMS',
                resourceId: cleanContact,
                details: JSON.stringify({ provider: 'SMSMKT', mode: 'REAL', success: false, error: err.message }),
              })).catch(() => {});

              console.error(`[OTP SERVICE] SMSMKT send exception:`, err);
              throw new BadRequestException(err instanceof BadRequestException ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อบริการส่ง SMS OTP');
            }
          } else {
            console.warn('[OTP SERVICE] SMSMKT is selected but API configuration settings are incomplete. Falling back to Mock.');
          }
        }
      }

      // Default mock flow
      const code = '123456';
      this.otpStore.set(cleanContact, { code, expiresAt });
      console.log(`[OTP SERVICE] Generated Mock OTP ${code} for phone +66${cleanContact}`);
      
      await this.auditLogRepository.save(this.auditLogRepository.create({
        actorUsername: 'CUSTOMER',
        action: 'OTP_REQUEST',
        resource: 'SMS',
        resourceId: cleanContact,
        details: JSON.stringify({ provider: 'MOCK', mode: 'TEST', success: true }),
      })).catch(() => {});

      return {
        success: true,
        expiresIn: durationSeconds,
        refCode: 'MOCK',
      };
    }
  }

  async verifyOtp(contact: string, code: string): Promise<boolean> {
    const isEmail = contact.includes('@');
    const cleanContact = this.getCleanContact(contact, isEmail ? 'email' : 'sms');
    
    const data = this.otpStore.get(cleanContact);

    if (!data) {
      throw new BadRequestException('ไม่พบคำขอรหัส OTP สำหรับข้อมูลการติดต่อนี้ในระบบ');
    }

    if (Date.now() > data.expiresAt) {
      this.otpStore.delete(cleanContact);
      throw new BadRequestException('รหัส OTP หมดอายุแล้ว โปรดขอรหัส OTP ใหม่อีกครั้ง');
    }

    if (isEmail) {
      if (data.code !== code) {
        await this.logVerifyResult(cleanContact, false, 'Email');
        throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
      }
      this.otpStore.delete(cleanContact);
      await this.logVerifyResult(cleanContact, true, 'Email');
      return true;
    }

    // SMS Validation Flow
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
              throw new BadRequestException('ไม่สามารถเชื่อมต่อระบบตรวจสอบ OTP ของ SMSMKT ได้');
            }

            const resData = await response.json();
            console.log(`[OTP SERVICE] SMSMKT validate response:`, JSON.stringify(resData));

            if (resData.code === '000' && resData.result && resData.result.status === true) {
              this.otpStore.delete(cleanContact);
              await this.logVerifyResult(cleanContact, true, 'SMSMKT');
              return true;
            } else {
              await this.logVerifyResult(cleanContact, false, 'SMSMKT');
              throw new BadRequestException(`รหัส OTP ไม่ถูกต้อง หรือการยืนยันตัวตนล้มเหลว (${resData.detail || 'รหัสไม่ตรง'})`);
            }
          } catch (err) {
            console.error(`[OTP SERVICE] SMSMKT validate exception:`, err);
            await this.logVerifyResult(cleanContact, false, 'SMSMKT Error');
            throw new BadRequestException(err instanceof BadRequestException ? err.message : 'เกิดข้อผิดพลาดในการตรวจสอบรหัส OTP');
          }
        }
      }
    }

    // Default mock check
    if (data.code !== code && code !== '123456') {
      await this.logVerifyResult(cleanContact, false, 'Mock');
      throw new BadRequestException('รหัส OTP ไม่ถูกต้อง');
    }

    this.otpStore.delete(cleanContact);
    await this.logVerifyResult(cleanContact, true, 'Mock');
    return true;
  }
}
