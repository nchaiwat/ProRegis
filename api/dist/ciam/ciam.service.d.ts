import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { User, UserRole } from '../users/user.entity';
import { Registration } from '../registration/registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { TelegramService } from '../telegram/telegram.service';
export interface CommandResultItem {
    command_id: string;
    action: string;
    username: string;
    status: 'COMPLETED' | 'FAILED';
    message: string;
}
export declare class CiamService implements OnModuleInit, OnModuleDestroy {
    private readonly systemSettingRepo;
    private readonly userRepo;
    private readonly registrationRepo;
    private readonly productionOrderRepo;
    private readonly usersService;
    private readonly auditService;
    private readonly telegramService;
    private readonly logger;
    private settingsCache;
    private pkceStore;
    private heartbeatTimer;
    private pendingCommandResults;
    private forceFullSyncNext;
    private heartbeatCycleCount;
    private lastHeartbeatStatus;
    constructor(systemSettingRepo: Repository<SystemSetting>, userRepo: Repository<User>, registrationRepo: Repository<Registration>, productionOrderRepo: Repository<ProductionOrder>, usersService: UsersService, auditService: AuditService, telegramService: TelegramService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private seedCiamAndAiSettings;
    refreshCache(): Promise<void>;
    getSetting(key: string, fallback?: string): Promise<string>;
    setSetting(key: string, value: string, meta?: {
        description?: string;
        category?: string;
        dataType?: string;
    }): Promise<void>;
    private maskSecret;
    private maskAiKey;
    private resolveUserRole;
    getCiamSettings(): Promise<{
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
    updateCiamSettings(body: {
        ciam_base_url?: string;
        ciam_client_id?: string;
        ciam_client_secret?: string;
        ciam_m2m_key?: string;
        ciam_sso_enabled?: boolean | string;
        ciam_ad_gateway_url?: string;
        ciam_auto_provision_group?: string;
        ciam_session_ttl_minutes?: number | string;
    }, actorUsername: string, ipAddress: string | null): Promise<{
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
    testCiamConnection(overrideBaseUrl?: string): Promise<{
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
    getSsoConfig(): Promise<{
        sso_enabled: boolean;
        break_glass_active: boolean;
        ciam_base_url: string;
        client_id: string;
        login_button_label: string;
        fallback_ad_available: boolean;
    }>;
    private base64UrlEncode;
    private cleanupExpiredPkce;
    createAuthorizeUrl(redirectUri: string): Promise<{
        authorize_url: string;
        code_verifier: string;
        state: string;
    }>;
    handleSsoCallback(payload: {
        code: string;
        code_verifier?: string | null;
        redirect_uri?: string | null;
        state?: string | null;
    }, ipAddress: string | null, userAgent: string | null): Promise<{
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
            role: UserRole;
            group_id: number;
            group_name: UserRole;
            allowedMenus: string[];
        };
    }>;
    private verifyCiamIdToken;
    toggleBreakGlass(breakGlassActive: boolean, reason: string, actorUsername: string, ipAddress: string | null): Promise<{
        status: string;
        break_glass_active: boolean;
        reason: string;
        message: string;
    }>;
    verifyCiamM2MRequest(apiKeyHeader?: string, timestampHeader?: string, clientIp?: string): Promise<boolean>;
    listAccountsForCiam(query: {
        status?: string;
        department?: string;
        search?: string;
    }): Promise<{
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
            group_name: UserRole;
            use_ad_auth: boolean;
            is_active: boolean;
            last_login_at: string | null;
            created_at: string;
            updated_at: string;
        }[];
    }>;
    provisionAccountFromCiam(payload: {
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
        group_name: UserRole;
        is_active: boolean;
        created_at: string;
    }>;
    updateAccountStatusFromCiam(username: string, payload: {
        is_active: boolean;
        reason?: string;
        updated_by?: string;
    }): Promise<{
        username: string;
        is_active: boolean;
        message: string;
        updated_at: string;
    }>;
    private startHeartbeatWorker;
    runHeartbeatCycle(isFullSync?: boolean): Promise<{
        online: boolean;
        createdCount: number;
        updatedCount: number;
        totalAccounts: number;
        message: string;
    }>;
    private executeLocalAgentCommand;
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
    updateAiSettings(body: {
        ai_copilot_enabled?: boolean | string;
        ai_provider?: string;
        ai_model?: string;
        ai_api_key?: string;
        ai_base_url?: string;
        ai_system_prompt?: string;
        ai_allow_mcp_tools?: boolean | string;
    }, actorUsername: string, ipAddress: string | null): Promise<{
        enabled: boolean;
        provider: string;
        model: string;
        has_api_key: boolean;
        api_key_masked: string | null;
        base_url: string;
        system_prompt: string;
        allow_mcp_tools: boolean;
    }>;
    testAiConnection(overrideConfig?: {
        provider?: string;
        model?: string;
        api_key?: string;
        base_url?: string;
    }): Promise<{
        status: string;
        latency_ms: number;
        provider: string;
        model: string;
        message: string;
    }>;
    private buildSpokeLiveContext;
    chatWithCopilot(messages: Array<{
        role: string;
        content: string;
    }>, currentUser?: any): Promise<{
        message: {
            role: string;
            content: any;
        };
    }>;
}
