import type { Response, Request } from 'express';
import { BackofficeService } from './backoffice.service';
export declare class BackofficeController {
    private readonly backofficeService;
    constructor(backofficeService: BackofficeService);
    generateCsv(body: {
        docNum: string;
        startSeq: number;
        quantity: number;
    }, req: Request, res: Response): Promise<void>;
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
                province: any;
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
        };
    }>;
    getProductionTracker(): Promise<{
        success: boolean;
        data: any[];
    }>;
    checkProduct(body: {
        token?: string;
        label?: string;
    }): Promise<{
        registered: boolean;
        docNum: string;
        seqNum: string;
        registration: import("../registration/registration.entity").Registration | null;
        product: {
            itemCode: string;
            itemName: string;
            plannedQty: number;
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
}
