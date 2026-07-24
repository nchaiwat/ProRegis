import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';
export interface SapProductionOrderInfo {
    itemCode: string;
    itemName: string;
    plannedQty: number;
    orderDate?: string | null;
    startDate?: string | null;
    status?: string | null;
    completedQty?: number;
}
export declare class SapService implements OnModuleInit {
    private readonly configService;
    private readonly systemSettingRepository;
    private readonly logger;
    private apiUrl;
    private companyDb;
    private username;
    private password;
    private rejectUnauthorized;
    private sessionCookie;
    private isMockMode;
    private _lastCompanyDb;
    constructor(configService: ConfigService, systemSettingRepository: Repository<SystemSetting>);
    private initConfigs;
    onModuleInit(): void;
    private login;
    private getRequest;
    getIsMockMode(): boolean;
    getProductionOrder(docNum: string): Promise<SapProductionOrderInfo | null>;
    private getMockProductionOrder;
}
