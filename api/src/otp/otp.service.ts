import { Injectable, BadRequestException } from '@nestjs/common';

interface OtpData {
  code: string;
  expiresAt: number;
}

@Injectable()
export class OtpService {
  // Simple in-memory store for demo. In production, use Redis.
  private otpStore = new Map<string, OtpData>();

  private getCleanContact(contact: string, channel: 'sms' | 'email'): string {
    if (channel === 'email') {
      return contact.trim().toLowerCase();
    }
    return contact.replace(/\D/g, '');
  }

  async generateAndSendOtp(contact: string, channel: 'sms' | 'email' = 'sms'): Promise<{ success: boolean; expiresIn: number }> {
    const cleanContact = this.getCleanContact(contact, channel);
    
    // For testing/development convenience, we can use 123456
    const code = '123456';
    const durationSeconds = 300; // 5 minutes
    const expiresAt = Date.now() + durationSeconds * 1000;

    this.otpStore.set(cleanContact, { code, expiresAt });

    if (channel === 'email') {
      console.log(`[OTP SERVICE] Generated OTP ${code} for email ${cleanContact}`);
    } else {
      console.log(`[OTP SERVICE] Generated OTP ${code} for phone +66${cleanContact}`);
    }
    
    // =========================================================================
    // PRODUCTION SMS/EMAIL GATEWAY INTEGRATION EXAMPLE
    // =========================================================================
    /*
    try {
      if (channel === 'email') {
        // Send email via nodemailer/SES...
      } else {
        // Send SMS via sms2pro/thaibulksms...
      }
    } catch (err) {
      console.error('Failed to send real OTP:', err);
    }
    */
    // =========================================================================

    return {
      success: true,
      expiresIn: durationSeconds,
    };
  }

  async verifyOtp(contact: string, code: string): Promise<boolean> {
    // Detect channel based on contact format
    const isEmail = contact.includes('@');
    const cleanContact = this.getCleanContact(contact, isEmail ? 'email' : 'sms');
    
    const data = this.otpStore.get(cleanContact);

    if (!data) {
      throw new BadRequestException('No active OTP request found for this contact info.');
    }

    if (Date.now() > data.expiresAt) {
      this.otpStore.delete(cleanContact);
      throw new BadRequestException('OTP code has expired. Please request a new one.');
    }

    if (data.code !== code) {
      throw new BadRequestException('Invalid OTP code.');
    }

    // Success: remove OTP code from store
    this.otpStore.delete(cleanContact);
    return true;
  }
}
