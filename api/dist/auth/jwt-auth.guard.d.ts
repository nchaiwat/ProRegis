import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare function revokeUserActiveSessions(username: string): void;
export declare function clearUserSessionRevocation(username: string): void;
export declare class JwtAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
