import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare function revokeUserActiveSessions(username: string): void;
export declare function clearUserSessionRevocation(username: string): void;
export declare function setIdleTimeoutMinutes(minutes: number): void;
export declare function getIdleTimeoutMinutes(): number;
export declare function setIdleTimeoutAuditHandler(handler: ((info: {
    username: string;
    ipAddress: string;
    idleMinutes: number;
}) => Promise<void> | void) | null): void;
export declare function buildSessionKey(username: string, iat?: number): string;
export declare function touchUserSessionActivity(sessionKey: string, now?: number): void;
export declare function clearUserSessionActivity(sessionKey: string): void;
export declare function checkSessionIdleStatus(sessionKey: string, now?: number): {
    expired: boolean;
    idleMinutes: number;
};
export declare class JwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
