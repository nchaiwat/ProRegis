import { Repository } from 'typeorm';
import { Registration } from './registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { TelegramService } from '../telegram/telegram.service';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { SapService } from '../sap/sap.service';
import { ProductMetadata } from '../products/product-metadata.entity';
export declare class RegistrationDto {
    token: string;
    docNum?: string;
    seqNum?: string;
    firstName: string;
    lastName: string;
    address: string;
    province: string;
    postalCode: string;
    phone: string;
    email?: string;
    mandatoryConsent: boolean;
    optionalConsent: boolean;
    latitude?: number;
    longitude?: number;
    lineUserId?: string;
    installationPosition?: string;
}
import { GenerationLog } from '../backoffice/generation-log.entity';
export declare class RegistrationService {
    private readonly registrationRepository;
    private readonly productionOrderRepository;
    private readonly generationLogRepository;
    private readonly systemSettingRepository;
    private readonly productMetadataRepository;
    private readonly telegramService;
    private readonly sapService;
    private readonly logger;
    constructor(registrationRepository: Repository<Registration>, productionOrderRepository: Repository<ProductionOrder>, generationLogRepository: Repository<GenerationLog>, systemSettingRepository: Repository<SystemSetting>, productMetadataRepository: Repository<ProductMetadata>, telegramService: TelegramService, sapService: SapService);
    private decryptToken;
    private calculateDistance;
    private getLevenshteinDistance;
    private areAddressesSimilar;
    registerProduct(dto: RegistrationDto): Promise<{
        success: boolean;
        refCode: string;
        registeredAt: Date;
    }>;
    private getOrFetchItemCode;
    private triggerTelegramNotification;
    getRegistrationsByPhone(phone: string): Promise<{
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
    getRegistrationsByContact(contact: string): Promise<{
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
    checkPhoneExists(phone: string): Promise<boolean>;
    checkContactExists(contact: string): Promise<{
        exists: boolean;
        phone?: string | null;
        email?: string | null;
        maskedPhone?: string | null;
        maskedEmail?: string | null;
    }>;
    checkStatus(docNum: string, phone: string, lat?: number, lng?: number): Promise<{
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
    addUnit(dto: {
        token: string;
        phone: string;
    }): Promise<{
        success: boolean;
        refCode: string;
        registeredAt: Date;
    }>;
}
