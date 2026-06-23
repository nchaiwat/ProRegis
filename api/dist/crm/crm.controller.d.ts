import { CrmService, CrmFilterDto } from './crm.service';
import { AuditService } from '../audit/audit.service';
import type { Request, Response } from 'express';
export declare class CrmController {
    private readonly crmService;
    private readonly auditService;
    constructor(crmService: CrmService, auditService: AuditService);
    listRegistrations(query: CrmFilterDto): Promise<{
        items: {
            phone: string;
            email: string | null;
            address: string;
            id: string;
            token: string;
            firstName: string;
            lastName: string;
            province: string;
            postalCode: string;
            mandatoryConsent: boolean;
            optionalConsent: boolean;
            latitude: number | null;
            longitude: number | null;
            registeredAt: Date;
            status: string;
            docNum: string | null;
            seqNum: string | null;
            lineUserId: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getDetails(id: string, req: Request): Promise<import("../registration/registration.entity").Registration>;
    exportCsv(body: Omit<CrmFilterDto, 'page' | 'limit'>, req: Request, res: Response): Promise<void>;
}
