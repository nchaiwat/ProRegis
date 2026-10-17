import type { Request } from 'express';
import { CiamService } from './ciam.service';
import { AuditService } from '../audit/audit.service';
export declare class CiamSettingsController {
    private readonly ciamService;
    constructor(ciamService: CiamService);
    getCiamSsoSettings(): Promise<{
        status: string;
        settings: {
            ciam_base_url: string;
            ciam_client_id: string;
            ciam_client_secret_masked: string;
            ciam_m2m_key_masked: string;
            ciam_sso_enabled: boolean;
            ciam_break_glass_active: boolean;
            ciam_ad_gateway_url: string;
            ciam_auto_provision_group: string;
            ciam_session_ttl_minutes: number;
            updated_at: string;
            agent_status: {
                online: boolean;
                lastSyncAt: string | null;
                serverTime: string | null;
                message: string;
            };
        };
    }>;
    updateCiamSsoSettings(body: any, req: Request): Promise<{
        status: string;
        settings: {
            ciam_base_url: string;
            ciam_client_id: string;
            ciam_client_secret_masked: string;
            ciam_m2m_key_masked: string;
            ciam_sso_enabled: boolean;
            ciam_break_glass_active: boolean;
            ciam_ad_gateway_url: string;
            ciam_auto_provision_group: string;
            ciam_session_ttl_minutes: number;
            updated_at: string;
            agent_status: {
                online: boolean;
                lastSyncAt: string | null;
                serverTime: string | null;
                message: string;
            };
        };
    }>;
    testConnection(body?: {
        ciam_base_url?: string;
    }): Promise<{
        status: string;
        latency_ms: number;
        ciam_issuer: string;
        jwks_uri: string;
        keys_found: number;
        key_id: null;
        message: string;
    } | {
        status: string;
        latency_ms: number;
        ciam_issuer: any;
        jwks_uri: any;
        keys_found: number;
        key_id: string;
        message: string;
    }>;
}
export declare class CiamSsoAuthController {
    private readonly ciamService;
    constructor(ciamService: CiamService);
    getSsoConfig(): Promise<{
        sso_enabled: boolean;
        break_glass_active: boolean;
        ciam_base_url: string;
        client_id: string;
        login_button_label: string;
        fallback_ad_available: boolean;
    }>;
    getAuthorizeUrl(body: {
        redirect_uri: string;
    }): Promise<{
        authorize_url: string;
        code_verifier: string;
        state: string;
    }>;
    ssoCallback(body: {
        code: string;
        code_verifier?: string | null;
        redirect_uri?: string | null;
        state?: string | null;
    }, req: Request): Promise<{
        success: boolean;
        access_token: string;
        refresh_token: string;
        token: string;
        token_type: string;
        ciam_portal_url: string;
        user: {
            id: string | number;
            username: string;
            full_name: string;
            email: string | null;
            department: string;
            role: import("../users/user.entity").UserRole;
            group_id: number;
            group_name: import("../users/user.entity").UserRole;
            allowedMenus: string[];
        };
    }>;
    breakGlassToggle(body: {
        break_glass_active: boolean;
        reason: string;
    }, req: Request): Promise<{
        status: string;
        break_glass_active: boolean;
        reason: string;
        message: string;
    }>;
}
export declare class CiamDirectoryController {
    private readonly ciamService;
    constructor(ciamService: CiamService);
    listAccounts(apiKey: string, timestamp: string, req: Request, status?: string, department?: string, search?: string): Promise<{
        application_name: string;
        total_accounts: number;
        active_accounts: number;
        inactive_accounts: number;
        accounts: {
            id: string | number;
            username: string;
            full_name: string;
            email: string | null;
            department: string | null;
            telegram_chat_id: string | null;
            group_name: import("../users/user.entity").UserRole;
            use_ad_auth: boolean;
            is_active: boolean;
            last_login_at: string | null;
            created_at: string;
            updated_at: string;
        }[];
    }>;
    provisionAccount(apiKey: string, timestamp: string, req: Request, body: {
        username: string;
        full_name?: string;
        email?: string | null;
        department?: string | null;
        group_name?: string | null;
        use_ad_auth?: boolean;
        created_by?: string;
    }): Promise<{
        success: boolean;
        id: string | number;
        username: string;
        message: string;
        group_name: import("../users/user.entity").UserRole;
        is_active: boolean;
        created_at: string;
    }>;
    updateAccountStatus(apiKey: string, timestamp: string, req: Request, username: string, body: {
        is_active: boolean;
        reason?: string;
        updated_by?: string;
    }): Promise<{
        username: string;
        is_active: boolean;
        message: string;
        updated_at: string;
    }>;
}
export declare class CiamAgentController {
    private readonly ciamService;
    constructor(ciamService: CiamService);
    syncNow(): Promise<{
        online: boolean;
        createdCount: number;
        updatedCount: number;
        totalAccounts: number;
        message: string;
        status: string;
    }>;
}
export declare class AiCopilotController {
    private readonly ciamService;
    private readonly auditService;
    constructor(ciamService: CiamService, auditService: AuditService);
    getAiSettings(): Promise<{
        enabled: boolean;
        provider: string;
        model: string;
        has_api_key: boolean;
        api_key_masked: string | null;
        base_url: string;
        system_prompt: string;
        allow_mcp_tools: boolean;
    }>;
    updateAiSettings(body: any, req: Request): Promise<{
        enabled: boolean;
        provider: string;
        model: string;
        has_api_key: boolean;
        api_key_masked: string | null;
        base_url: string;
        system_prompt: string;
        allow_mcp_tools: boolean;
    }>;
    testAiConnection(body: any): Promise<{
        status: string;
        latency_ms: number;
        provider: string;
        model: string;
        message: string;
    }>;
    chat(body: {
        messages: Array<{
            role: string;
            content: string;
        }>;
    }, req: Request): Promise<{
        message: {
            role: string;
            content: any;
        };
    }>;
    getTransactionLogs(limit?: string): Promise<{
        logs: import("../audit/transaction-log.entity").TransactionLog[];
    }>;
}
