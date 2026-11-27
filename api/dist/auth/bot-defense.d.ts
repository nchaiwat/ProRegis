import type { Request, Response } from 'express';
export type BotDefenseViolationAction = 'IP_RATE_LIMITED' | 'BOT_HONEYPOT_DETECTED' | 'BOT_TIMING_VIOLATION';
export type BotDefenseAuditCallback = (action: BotDefenseViolationAction, clientIp: string, details: Record<string, any>) => void | Promise<void>;
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
export declare function evaluateRateLimitOnly(req: Request, res?: Response, onViolation?: BotDefenseAuditCallback): string;
export declare function evaluateBotDefense(req: Request, body: BotDefensePayload, res?: Response, onViolation?: BotDefenseAuditCallback): {
    clientIp: string;
    durationMs: number;
};
export {};
