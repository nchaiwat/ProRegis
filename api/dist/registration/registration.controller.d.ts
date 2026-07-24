import { RegistrationService, RegistrationDto } from './registration.service';
import { OtpService } from '../otp/otp.service';
declare class CheckHistoryDto {
    phone: string;
    otpCode: string;
}
declare class CheckHistoryByContactDto {
    contact: string;
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
        firstName: string;
        lastName: string;
        address: string;
        province: string;
        postalCode: string;
        email: string | null;
        latitude: number | null;
        longitude: number | null;
        mfgDateTh: string;
        mfgDateEn: string;
        lotNo: string;
        totalQty: string;
        installationPosition: string | null;
        imageUrl?: string;
    }[]>;
    getRegistrationsByContact(body: CheckHistoryByContactDto): Promise<{
        id: string;
        docNum: string | null;
        seqNum: string | null;
        itemCode: string;
        itemName: string;
        registeredAt: Date;
        status: string;
        mfgDateTh: string;
        mfgDateEn: string;
        lotNo: string;
        totalQty: string;
        installationPosition: string | null;
        imageUrl: string;
    }[]>;
    checkPhone(body: {
        phone: string;
    }): Promise<{
        exists: boolean;
    }>;
    checkContact(body: {
        contact: string;
    }): Promise<{
        exists: boolean;
        phone?: string | null;
        email?: string | null;
        maskedPhone?: string | null;
        maskedEmail?: string | null;
    }>;
    checkStatus(body: {
        docNum: string;
        phone: string;
        latitude?: number;
        longitude?: number;
    }): Promise<{
        registered: boolean;
        existingAtOtherSite?: undefined;
        count?: undefined;
        modelName?: undefined;
        profile?: undefined;
        list?: undefined;
    } | {
        registered: boolean;
        existingAtOtherSite: boolean;
        count?: undefined;
        modelName?: undefined;
        profile?: undefined;
        list?: undefined;
    } | {
        registered: boolean;
        count: any;
        modelName: string;
        profile: {
            firstName: any;
            lastName: any;
            address: any;
            province: any;
            postalCode: any;
            phone: any;
            email: any;
        };
        list: any;
        existingAtOtherSite?: undefined;
    }>;
    addUnit(body: {
        token: string;
        phone: string;
    }): Promise<{
        success: boolean;
        refCode: string;
        registeredAt: Date;
    }>;
}
export {};
