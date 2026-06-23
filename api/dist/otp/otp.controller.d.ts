import { OtpService } from './otp.service';
declare class RequestOtpDto {
    phone: string;
}
declare class VerifyOtpDto {
    phone: string;
    code: string;
}
export declare class OtpController {
    private readonly otpService;
    constructor(otpService: OtpService);
    requestOtp(body: RequestOtpDto): Promise<{
        success: boolean;
        expiresIn: number;
    }>;
    verifyOtp(body: VerifyOtpDto): Promise<{
        success: boolean;
    }>;
}
export {};
