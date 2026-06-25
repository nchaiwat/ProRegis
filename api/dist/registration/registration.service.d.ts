import { Repository } from 'typeorm';
import { Registration } from './registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { TelegramService } from '../telegram/telegram.service';
import { SapService } from '../sap/sap.service';
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
}
export declare class RegistrationService {
    private readonly registrationRepository;
    private readonly productionOrderRepository;
    private readonly telegramService;
    private readonly sapService;
    private readonly logger;
    constructor(registrationRepository: Repository<Registration>, productionOrderRepository: Repository<ProductionOrder>, telegramService: TelegramService, sapService: SapService);
    private decryptToken;
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
    }[]>;
    checkPhoneExists(phone: string): Promise<boolean>;
}
