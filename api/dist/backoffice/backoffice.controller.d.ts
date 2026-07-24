import type { Response, Request } from 'express';
import { BackofficeService } from './backoffice.service';
export declare class BackofficeController {
    private readonly backofficeService;
    constructor(backofficeService: BackofficeService);
    generateCsv(body: {
        docNum: string;
        startSeq: number;
        quantity: number;
        preview?: boolean;
    }, req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    decryptToken(body: {
        token: string;
    }): {
        success: boolean;
        error: string;
        docNum?: undefined;
        seqNum?: undefined;
    } | {
        success: boolean;
        docNum: string;
        seqNum: string;
        error?: undefined;
    };
    getLogs(limit?: string): Promise<{
        logs: import("./generation-log.entity").GenerationLog[];
    }>;
    getAuthLogs(limit?: string): Promise<{
        logs: import("../audit/audit-log.entity").AuditLog[];
    }>;
    getNextSequence(docNum: string): Promise<{
        success: boolean;
        error: string;
        nextSeq?: undefined;
    } | {
        success: boolean;
        nextSeq: number;
        error?: undefined;
    }>;
    getDashboardSummary(startDate?: string, endDate?: string): Promise<{
        success: boolean;
        summary: {
            totalGenerated: number;
            totalRegistered: number;
            registrationRate: number;
            provinceStats: {
                province: string;
                count: number;
            }[];
            markers: import("../registration/registration.entity").Registration[];
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
        };
    }>;
    getProductionTracker(mode?: 'STATIC' | 'DYNAMIC'): Promise<{
        success: boolean;
        data: any[];
    }>;
    checkProduct(body: {
        token?: string;
        label?: string;
        registrationId?: string;
    }): Promise<{
        registered: boolean;
        docNum: string | null;
        seqNum: string | null;
        registration: import("../registration/registration.entity").Registration | null;
        product: {
            itemCode: string;
            itemName: string;
            plannedQty: number;
            imageBase64: string | null;
        };
    }>;
    uploadProductImage(body: {
        itemCode: string;
        imageBase64: string;
    }): Promise<import("../products/product-metadata.entity").ProductMetadata>;
    getCustomImages(): Promise<any[]>;
    deleteProductImage(itemCode: string): Promise<{
        success: boolean;
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
    getSettings(): Promise<Record<string, {
        value: string;
        updatedAt: Date;
    }>>;
    updateSettings(body: {
        key: string;
        value: string;
    }): Promise<{
        success: boolean;
    }>;
    clearTestData(body?: {
        tables?: string[];
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
