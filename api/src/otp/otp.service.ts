import { Injectable, BadRequestException } from '@nestjs/common';

interface OtpData {
  code: string;
  expiresAt: number;
}

@Injectable()
export class OtpService {
  // Simple in-memory store for demo. In production, use Redis.
  private otpStore = new Map<string, OtpData>();

  async generateAndSendOtp(phone: string): Promise<{ success: boolean; expiresIn: number }> {
    // Standardize phone format (remove dashes, spaces)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // For testing/development convenience, we can use 123456
    const code = '123456';
    const durationSeconds = 300; // 5 minutes
    const expiresAt = Date.now() + durationSeconds * 1000;

    this.otpStore.set(cleanPhone, { code, expiresAt });

    console.log(`[OTP SERVICE] Generated OTP ${code} for phone +66${cleanPhone}`);
    
    // =========================================================================
    // PRODUCTION SMS GATEWAY INTEGRATION EXAMPLE (e.g. Thaibulksms, SMS2PRO)
    // =========================================================================
    /*
    try {
      const apiKey = process.env.SMS_API_KEY;
      const apiSecret = process.env.SMS_API_SECRET;
      const message = `รหัส OTP สำหรับการลงทะเบียนรับประกัน ProRegis ของท่านคือ ${code} (รหัสมีอายุ 5 นาที)`;
      
      // Axios request to Thailand SMS Gateway:
      await axios.post('https://api.sms2pro.com/v1/sms', {
        sender: 'WindowAsia',
        phone: `66${cleanPhone}`,
        message: message,
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
    } catch (err) {
      console.error('Failed to send real SMS via gateway:', err);
    }
    */
    // =========================================================================

    return {
      success: true,
      expiresIn: durationSeconds,
    };
  }

  async verifyOtp(phone: string, code: string): Promise<boolean> {
    const cleanPhone = phone.replace(/\D/g, '');
    const data = this.otpStore.get(cleanPhone);

    if (!data) {
      throw new BadRequestException('No active OTP request found for this phone number.');
    }

    if (Date.now() > data.expiresAt) {
      this.otpStore.delete(cleanPhone);
      throw new BadRequestException('OTP code has expired. Please request a new one.');
    }

    if (data.code !== code) {
      throw new BadRequestException('Invalid OTP code.');
    }

    // Success: remove OTP code from store
    this.otpStore.delete(cleanPhone);
    return true;
  }
}
