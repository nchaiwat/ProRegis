export declare enum UserRole {
    SYSTEM_ADMIN = "SYSTEM_ADMIN",
    QR_GENERATOR = "QR_GENERATOR",
    CRM_MANAGER = "CRM_MANAGER"
}
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    LOCKED = "LOCKED",
    SUSPENDED = "SUSPENDED"
}
export declare class User {
    id: string;
    username: string;
    passwordHash: string;
    role: UserRole;
    status: UserStatus;
    failedAttempts: number;
    lockedUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
