import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProductMetadata } from './product-metadata.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { SapService } from '../sap/sap.service';
import { BackofficeService } from '../backoffice/backoffice.service';
import { TelegramService } from '../telegram/telegram.service';
import { AuditLog } from '../audit/audit-log.entity';
import { UsersService } from '../users/users.service';
export interface Product {
    token: string;
    code: string;
    modelTh: string;
    modelEn: string;
    manufactureDate: string;
    lotNo: string;
    poNo: string;
    imageUrl: string;
    warrantyPeriod: string;
    qrMode?: string;
    verificationMode?: string;
    smsOtpMode?: string;
    seqNum?: string | null;
    specs: {
        th: {
            label: string;
            value: string;
        }[];
        en: {
            label: string;
            value: string;
        }[];
    };
    features: {
        th: string[];
        en: string[];
    };
}
import { GenerationLog } from '../backoffice/generation-log.entity';
export declare class ProductsService {
    private readonly productMetadataRepository;
    private readonly productionOrderRepository;
    private readonly generationLogRepository;
    private readonly systemSettingRepository;
    private readonly auditLogRepository;
    private readonly sapService;
    private readonly backofficeService;
    private readonly configService;
    private readonly telegramService;
    private readonly usersService;
    private readonly logger;
    constructor(productMetadataRepository: Repository<ProductMetadata>, productionOrderRepository: Repository<ProductionOrder>, generationLogRepository: Repository<GenerationLog>, systemSettingRepository: Repository<SystemSetting>, auditLogRepository: Repository<AuditLog>, sapService: SapService, backofficeService: BackofficeService, configService: ConfigService, telegramService: TelegramService, usersService: UsersService);
    private readonly products;
    private downloadImageAsBase64;
    cacheProductMetadata(itemCode: string, itemName: string): Promise<ProductMetadata>;
    private formatManufactureDate;
    findOne(token: string): Promise<Product>;
    uploadProductImage(itemCode: string, imageBase64: string): Promise<ProductMetadata>;
}
