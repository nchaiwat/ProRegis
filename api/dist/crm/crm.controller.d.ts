import { CrmService, CrmFilterDto } from './crm.service';
import { AuditService } from '../audit/audit.service';
import type { Request, Response } from 'express';
export declare class CrmController {
    private readonly crmService;
    private readonly auditService;
    constructor(crmService: CrmService, auditService: AuditService);
    listRegistrations(query: CrmFilterDto): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getActiveProvinces(): Promise<{
        value: string;
        label: string;
    }[]>;
    getDetails(id: string, req: Request): Promise<any>;
    exportCsv(body: Omit<CrmFilterDto, 'page' | 'limit'>, req: Request, res: Response): Promise<void>;
    deleteCustomer(id: string, req: Request): Promise<{
        success: boolean;
        deletedRecordsCount: number;
    }>;
}
