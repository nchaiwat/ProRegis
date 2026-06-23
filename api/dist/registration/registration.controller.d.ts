import { RegistrationService, RegistrationDto } from './registration.service';
export declare class RegistrationController {
    private readonly registrationService;
    constructor(registrationService: RegistrationService);
    registerProduct(body: RegistrationDto): Promise<{
        success: boolean;
        refCode: string;
        registeredAt: Date;
    }>;
}
