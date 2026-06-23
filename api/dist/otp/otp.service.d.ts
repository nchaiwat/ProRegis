export declare class OtpService {
    private otpStore;
    generateAndSendOtp(phone: string): Promise<{
        success: boolean;
        expiresIn: number;
    }>;
    verifyOtp(phone: string, code: string): Promise<boolean>;
}
