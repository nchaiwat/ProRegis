export declare enum UserRole {
    SYSTEM_ADMIN = "SYSTEM_ADMIN",
    QR_GENERATOR = "QR_GENERATOR",
    CRM_MANAGER = "CRM_MANAGER",
    IMAGE_EDITOR = "IMAGE_EDITOR"
}
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    LOCKED = "LOCKED",
    SUSPENDED = "SUSPENDED"
}
export declare class User {
    id: string;
    systemSeqId: number;
    username: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    department: string;
    email: string | null;
    mobile: string | null;
    telegramId: string | null;
    pinCode: string | null;
    lastLogin: Date | null;
    role: UserRole;
    status: UserStatus;
    failedAttempts: number;
    lockedUntil: Date | null;
    isAdAuth: boolean;
    isPasswordCachedFromAd: boolean;
    createdAt: Date;
    updatedAt: Date;
}
