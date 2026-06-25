import { Repository } from 'typeorm';
import { GenerationLog } from './generation-log.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { Registration } from '../registration/registration.entity';
import { TelegramService } from '../telegram/telegram.service';
import { SapService } from '../sap/sap.service';
import { ProductsService } from '../products/products.service';
export interface GeneratedRow {
    code: string;
    pd: string;
}
export declare class BackofficeService {
    private readonly logRepository;
    private readonly productionOrderRepository;
    private readonly registrationRepository;
    private readonly telegramService;
    private readonly sapService;
    private readonly productsService;
    constructor(logRepository: Repository<GenerationLog>, productionOrderRepository: Repository<ProductionOrder>, registrationRepository: Repository<Registration>, telegramService: TelegramService, sapService: SapService, productsService: ProductsService);
    encryptToToken(docNum: string, seqStr: string): string;
    decryptToken(token: string): {
        docNum: string;
        seqNum: string;
    } | null;
    getNextSequence(docNum: string): Promise<number>;
    generateBatch(actor: string, docNum: string, startSeq: number, quantity: number, ipAddress: string): Promise<GeneratedRow[]>;
    buildCsv(rows: GeneratedRow[]): string;
    getLogs(limit?: number): Promise<GenerationLog[]>;
    getDashboardSummary(startDate?: string, endDate?: string): Promise<{
        totalGenerated: number;
        totalRegistered: number;
        registrationRate: number;
        provinceStats: {
            province: any;
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
    }>;
    getProductionTrackerList(): Promise<any[]>;
    checkProduct(token?: string, label?: string): Promise<{
        registered: boolean;
        docNum: string;
        seqNum: string;
        registration: Registration | null;
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
