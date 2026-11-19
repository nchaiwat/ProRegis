import { Request } from 'express';
declare class SpokeRateLimiter {
    private records;
    isAllowed(clientIp: string): {
        allowed: boolean;
        retryAfter: number;
    };
}
export declare const spokeRateLimiter: SpokeRateLimiter;
export declare function resolveClientIp(req: Request): string;
export interface BotDefensePayload {
    corporate_fax?: string;
    security_honey?: string;
    form_render_ts?: number;
}
export declare function evaluateBotDefense(req: Request, body: BotDefensePayload): {
    clientIp: string;
    durationMs: number;
};
export {};
