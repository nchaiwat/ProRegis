export declare class TransactionLog {
    id: number;
    category: string;
    action: string;
    status: string;
    message: string;
    details: string | null;
    recordsCount: number;
    durationMs: number;
    triggeredBy: string;
    createdAt: Date;
}
