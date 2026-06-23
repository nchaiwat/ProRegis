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
    getRegistrationDetails(id: string): Promise<Registration>;
    getAllRegistrationsForExport(filters: Omit<CrmFilterDto, 'page' | 'limit'>): Promise<Registration[]>;
}
