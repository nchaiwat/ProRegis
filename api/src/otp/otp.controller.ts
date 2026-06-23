import { Controller, Post, Body } from '@nestjs/common';
import { OtpService } from './otp.service';

class RequestOtpDto {
  phone: string;
}

class VerifyOtpDto {
  phone: string;
  code: string;
}

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('request')
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.otpService.generateAndSendOtp(body.phone);
  }

  @Post('verify')
  async verifyOtp(@Body() body: VerifyOtpDto) {
    const isVerified = await this.otpService.verifyOtp(body.phone, body.code);
    return { success: isVerified };
  }
}
