import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface SapProductionOrderInfo {
    itemCode: string;
    itemName: string;
    plannedQty: number;
}
export declare class SapService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private apiUrl;
    private companyDb;
    private username;
    private password;
    private rejectUnauthorized;
    private sessionCookie;
    private isMockMode;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    private login;
    private getRequest;
    getProductionOrder(docNum: string): Promise<SapProductionOrderInfo>;
    private getMockProductionOrder;
}
