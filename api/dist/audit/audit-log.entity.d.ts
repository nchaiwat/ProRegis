export declare class AuditLog {
    id: string;
    actorUsername: string;
    action: string;
    resource: string;
    resourceId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    details: string | null;
    loggedAt: Date;
}
