import { Controller, Post, Body } from '@nestjs/common';
import { RegistrationService, RegistrationDto } from './registration.service';
import { OtpService } from '../otp/otp.service';

class CheckHistoryDto {
  phone: string;
  otpCode: string;
}

class CheckHistoryByContactDto {
  contact: string;
  otpCode: string;
}

@Controller('registration')
export class RegistrationController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly otpService: OtpService,
  ) {}

  @Post()
  async registerProduct(@Body() body: RegistrationDto) {
    return this.registrationService.registerProduct(body);
  }

  @Post('by-phone')
  async getRegistrationsByPhone(@Body() body: CheckHistoryDto) {
    // 1. Verify OTP (if not bypassed)
    if (body.otpCode !== 'SESSION_BYPASS') {
      await this.otpService.verifyOtp(body.phone, body.otpCode);
    }

    // 2. Get registrations
    return this.registrationService.getRegistrationsByPhone(body.phone);
  }

  @Post('by-contact')
  async getRegistrationsByContact(@Body() body: CheckHistoryByContactDto) {
    // 1. Verify OTP (if not bypassed)
    if (body.otpCode !== 'SESSION_BYPASS') {
      await this.otpService.verifyOtp(body.contact, body.otpCode);
    }

    // 2. Get registrations
    return this.registrationService.getRegistrationsByContact(body.contact);
  }

  @Post('check-phone')
  async checkPhone(@Body() body: { phone: string }) {
    const exists = await this.registrationService.checkPhoneExists(body.phone);
    return { exists };
  }

  @Post('check-contact')
  async checkContact(@Body() body: { contact: string }) {
    return this.registrationService.checkContactExists(body.contact);
  }
}

