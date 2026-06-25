import { Controller, Post, Body } from '@nestjs/common';
import { RegistrationService, RegistrationDto } from './registration.service';
import { OtpService } from '../otp/otp.service';

class CheckHistoryDto {
  phone: string;
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
    // 1. Verify OTP
    await this.otpService.verifyOtp(body.phone, body.otpCode);

    // 2. Get registrations
    return this.registrationService.getRegistrationsByPhone(body.phone);
  }

  @Post('check-phone')
  async checkPhone(@Body() body: { phone: string }) {
    const exists = await this.registrationService.checkPhoneExists(body.phone);
    return { exists };
  }
}

