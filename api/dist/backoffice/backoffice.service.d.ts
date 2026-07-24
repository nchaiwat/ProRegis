import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { GenerationLog } from './generation-log.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { Registration } from '../registration/registration.entity';
import { SystemSetting } from './system-setting.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { TelegramService } from '../telegram/telegram.service';
import { SapService } from '../sap/sap.service';
import { ProductsService } from '../products/products.service';
export interface GeneratedRow {
    code: string;
    pd: string;
}
export declare class BackofficeService implements OnModuleInit {
    private readonly logRepository;
    private readonly productionOrderRepository;
    private readonly registrationRepository;
    private readonly systemSettingRepository;
    private readonly auditLogRepository;
    private readonly telegramService;
    private readonly sapService;
    private readonly productsService;
    private readonly configService;
    private readonly logger;
    constructor(logRepository: Repository<GenerationLog>, productionOrderRepository: Repository<ProductionOrder>, registrationRepository: Repository<Registration>, systemSettingRepository: Repository<SystemSetting>, auditLogRepository: Repository<AuditLog>, telegramService: TelegramService, sapService: SapService, productsService: ProductsService, configService: ConfigService);
    onModuleInit(): Promise<void>;
    private seedSettings;
    getSystemSettings(): Promise<Record<string, {
        value: string;
        updatedAt: Date;
    }>>;
    updateSystemSetting(key: string, value: string): Promise<void>;
    getSettingValue(key: string, defaultValue: string): Promise<string>;
    encryptToToken(docNum: string, seqStr: string): string;
    decryptToken(token: string): {
        docNum: string;
        seqNum: string;
    } | null;
    getNextSequence(docNum: string): Promise<number>;
    generateBatch(actor: string, docNum: string, startSeq: number, quantity: number, ipAddress: string, previewOnly?: boolean): Promise<GeneratedRow[]>;
    buildCsv(rows: GeneratedRow[]): string;
    getLogs(limit?: number): Promise<GenerationLog[]>;
    getAuthLogs(limit?: number): Promise<AuditLog[]>;
    getDashboardSummary(startDate?: string, endDate?: string): Promise<{
        totalGenerated: number;
        totalRegistered: number;
        registrationRate: number;
        provinceStats: {
            province: string;
            count: number;
        }[];
        markers: Registration[];
        productStats: {
            itemCode: any;
            itemName: any;
            count: number;
        }[];
        timelineStats: {
            date: any;
            count: number;
        }[];
        installationPositionStats: {
            label: any;
            count: number;
        }[];
        consentStats: {
            optIn: number;
            optOut: number;
        };
        purchaseSizeStats: {
            size1: number;
            size2_3: number;
            size4_6: number;
            size7plus: number;
        };
        lagTimeStats: {
            under30: number;
            thirtyToNinety: number;
            ninetyToOneEighty: number;
            overOneEighty: number;
        };
        productionMonthStats: {
            month: string;
            count: number;
        }[];
        apiUsageStats: {
            action: any;
            count: number;
        }[];
        sapFallbackStats: {
            dbCacheHits: number;
            sapSuccesses: number;
            sapErrors: number;
        };
        errorStats: {
            message: string;
            action: string;
            time: string;
        }[];
        smsOtpStats: {
            otpRequests: number;
            otpVerifications: number;
        };
        dbVolumeStats: {
            registrations: number;
            auditLogs: number;
            productionOrders: number;
        };
    }>;
    getProductionTrackerList(mode?: 'STATIC' | 'DYNAMIC'): Promise<any[]>;
    checkProduct(token?: string, label?: string, registrationId?: string): Promise<{
        registered: boolean;
        docNum: string | null;
        seqNum: string | null;
        registration: Registration | null;
        product: {
            itemCode: string;
            itemName: string;
            plannedQty: number;
            imageBase64: string | null;
        };
    }>;
    getLotSummary(docNum: string): Promise<{
        docNum: string;
        itemCode: string;
        itemName: string | null;
        totalQty: number;
        registeredCount: number;
        unregisteredCount: number;
        items: any[];
    }>;
    uploadProductImage(itemCode: string, imageBase64: string): Promise<import("../products/product-metadata.entity").ProductMetadata>;
    getCustomImages(): Promise<any[]>;
    deleteProductImage(itemCode: string): Promise<{
        success: boolean;
    }>;
    clearTestData(tables?: string[]): Promise<void>;
}
