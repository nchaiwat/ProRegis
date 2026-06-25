import { RegistrationService, RegistrationDto } from './registration.service';
import { OtpService } from '../otp/otp.service';
declare class CheckHistoryDto {
    phone: string;
    otpCode: string;
}
export declare class RegistrationController {
    private readonly registrationService;
    private readonly otpService;
    constructor(registrationService: RegistrationService, otpService: OtpService);
    registerProduct(body: RegistrationDto): Promise<{
        success: boolean;
        refCode: string;
        registeredAt: Date;
    }>;
    getRegistrationsByPhone(body: CheckHistoryDto): Promise<{
        id: string;
        docNum: string | null;
        seqNum: string | null;
        itemCode: string;
        itemName: string;
        registeredAt: Date;
        status: string;
    }[]>;
    checkPhone(body: {
        phone: string;
    }): Promise<{
        exists: boolean;
    }>;
}
export {};
