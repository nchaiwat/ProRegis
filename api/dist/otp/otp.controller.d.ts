import { OtpService } from './otp.service';
declare class RequestOtpDto {
    contact?: string;
    phone?: string;
    channel?: 'sms' | 'email';
}
declare class VerifyOtpDto {
    contact?: string;
    phone?: string;
    code: string;
}
export declare class OtpController {
    private readonly otpService;
    constructor(otpService: OtpService);
    requestOtp(body: RequestOtpDto): Promise<{
        success: boolean;
        expiresIn: number;
        refCode?: string;
    }>;
    verifyOtp(body: VerifyOtpDto): Promise<{
        success: boolean;
    }>;
}
export {};
