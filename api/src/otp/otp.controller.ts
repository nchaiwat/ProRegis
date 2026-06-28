import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';

class RequestOtpDto {
  contact?: string;
  phone?: string;
  channel?: 'sms' | 'email';
}

class VerifyOtpDto {
  contact?: string;
  phone?: string;
  code: string;
}

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('request')
  async requestOtp(@Body() body: RequestOtpDto) {
    const contact = body.contact || body.phone;
    if (!contact) {
      throw new BadRequestException('Contact or phone number is required.');
    }
    const channel = body.channel || (contact.includes('@') ? 'email' : 'sms');
    return this.otpService.generateAndSendOtp(contact, channel);
  }

  @Post('verify')
  async verifyOtp(@Body() body: VerifyOtpDto) {
    const contact = body.contact || body.phone;
    if (!contact) {
      throw new BadRequestException('Contact or phone number is required.');
    }
    const isVerified = await this.otpService.verifyOtp(contact, body.code);
    return { success: isVerified };
  }
}
