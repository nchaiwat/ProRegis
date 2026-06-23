export declare class Registration {
    id: string;
    token: string;
    firstName: string;
    lastName: string;
    address: string;
    province: string;
    postalCode: string;
    phone: string;
    email: string | null;
    mandatoryConsent: boolean;
    optionalConsent: boolean;
    latitude: number | null;
    longitude: number | null;
    registeredAt: Date;
    status: string;
    docNum: string | null;
    seqNum: string | null;
    lineUserId: string | null;
}
