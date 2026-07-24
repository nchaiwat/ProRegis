import { Repository } from 'typeorm';
import { Registration } from '../registration/registration.entity';
export declare class CrmFilterDto {
    page?: number;
    limit?: number;
    search?: string;
    province?: string;
    status?: string;
}
export declare class CrmService {
    private readonly registrationRepository;
    constructor(registrationRepository: Repository<Registration>);
    private maskPhone;
    private maskEmail;
    private maskAddress;
    getRegistrations(filters: CrmFilterDto): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getRegistrationDetails(id: string): Promise<any>;
    getAllRegistrationsForExport(filters: Omit<CrmFilterDto, 'page' | 'limit'>): Promise<Registration[]>;
    getActiveProvinces(): Promise<Array<{
        value: string;
        label: string;
    }>>;
    deleteCustomerAndRegistrations(phone: string): Promise<number>;
}
