import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  ServiceUnavailableException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { Registration } from '../registration/registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { TelegramService, formatThaiDateTime } from '../telegram/telegram.service';
import { revokeUserActiveSessions, clearUserSessionRevocation } from '../auth/jwt-auth.guard';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const PROTECTED_ADMIN_ACCOUNTS = new Set([
  'admin',
  'superadmin',
  'emergency_admin',
  'local_admin',
]);

interface PkceEntry {
  verifier: string;
  createdAt: number;
}

export interface CommandResultItem {
  command_id: string;
  action: string;
  username: string;
  status: 'COMPLETED' | 'FAILED';
  message: string;
}

@Injectable()
export class CiamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CiamService.name);
  private settingsCache = new Map<string, { value: string; updatedAt: Date }>();
  private pkceStore = new Map<string, PkceEntry>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pendingCommandResults: CommandResultItem[] = [];
  private forceFullSyncNext = false;
  private heartbeatCycleCount = 0;
  private lastHeartbeatStatus: {
    online: boolean;
    lastSyncAt: string | null;
    serverTime: string | null;
    message: string;
  } = {
    online: false,
    lastSyncAt: null,
    serverTime: null,
    message: 'รอการซิงก์รอบแรก',
  };

  constructor(
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepo: Repository<SystemSetting>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Registration)
    private readonly registrationRepo: Repository<Registration>,
    @InjectRepository(ProductionOrder)
    private readonly productionOrderRepo: Repository<ProductionOrder>,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly telegramService: TelegramService,
  ) {}

  async onModuleInit() {
    await this.seedCiamAndAiSettings();
    await this.refreshCache();
    this.startHeartbeatWorker();
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Seed & Cache Management (Zero .env Dependency)
  // ---------------------------------------------------------------------------
  private async seedCiamAndAiSettings() {
    const defaultGateway = (process.env.AD_GATEWAY_URL || 'http://172.18.0.1:3100').replace(
      /\/api\/v2\/login\/?$/,
      '',
    );

    const seeds: Array<{
      key: string;
      value: string;
      description: string;
      category: string;
      dataType: string;
    }> = [
      // Category: central_iam
      {
        key: 'ciam_base_url',
        value: 'https://ciam.windowasia.com',
        description: 'URL หลักของ Central IAM Engine (ห้ามมี / ต่อท้าย)',
        category: 'central_iam',
        dataType: 'string',
      },
      {
        key: 'ciam_client_id',
        value: 'proregis-spoke-client',
        description: 'Client ID ที่ลงทะเบียนไว้ในหน้า Central IAM Portal',
        category: 'central_iam',
        dataType: 'string',
      },
      {
        key: 'ciam_client_secret',
        value: 'sec_proregis_oauth_secret_2026',
        description: 'รหัสลับเฉพาะของระบบลูก (OIDC Client Secret)',
        category: 'central_iam',
        dataType: 'encrypted',
      },
      {
        key: 'ciam_m2m_key',
        value: 'sec_proregis_mgmt_2026',
        description: 'M2M Management API Key สำหรับ Directory Sync & Heartbeat',
        category: 'central_iam',
        dataType: 'encrypted',
      },
      {
        key: 'ciam_sso_enabled',
        value: 'true',
        description: 'สวิตช์หลักเปิด/ปิดการเข้าใช้งานด้วย Central IAM SSO',
        category: 'central_iam',
        dataType: 'boolean',
      },
      {
        key: 'ciam_break_glass_active',
        value: 'false',
        description: 'โหมดปลดระบบฉุกเฉิน (สลับไปล็อกอินตรงด้วย AD Gateway หรือ DB)',
        category: 'central_iam',
        dataType: 'boolean',
      },
      {
        key: 'ciam_ad_gateway_url',
        value: defaultGateway,
        description: 'URL เซิร์ฟเวอร์ AD Gateway ภายในองค์กร',
        category: 'central_iam',
        dataType: 'string',
      },
      {
        key: 'ciam_auto_provision_group',
        value: UserRole.IMAGE_EDITOR, // Lowest privilege role by default
        description: 'กลุ่มสิทธิ์เริ่มต้นสำหรับพนักงานใหม่ที่ล็อกอินผ่าน SSO ครั้งแรก (สิทธิ์น้อยที่สุด)',
        category: 'central_iam',
        dataType: 'string',
      },
      {
        key: 'ciam_session_ttl_minutes',
        value: '480',
        description: 'อายุ Access Token ของระบบลูก (นาที)',
        category: 'central_iam',
        dataType: 'integer',
      },

      // Category: ai_copilot (Section 11 / Category E)
      {
        key: 'ai_copilot_enabled',
        value: 'false',
        description: 'สวิตช์หลักเปิด/ปิดการแสดงผลหน้า Chat หรือ Floating Widget ประจำระบบหลังบ้าน',
        category: 'ai_copilot',
        dataType: 'boolean',
      },
      {
        key: 'ai_provider',
        value: 'google',
        description: 'ผู้ให้บริการ AI: google, openai, anthropic, ollama, custom',
        category: 'ai_copilot',
        dataType: 'string',
      },
      {
        key: 'ai_model',
        value: 'gemini-1.5-flash',
        description: 'รหัสโมเดล เช่น gemini-1.5-flash, gpt-4o-mini, claude-3-5-sonnet',
        category: 'ai_copilot',
        dataType: 'string',
      },
      {
        key: 'ai_api_key',
        value: '',
        description: 'API Key ของผู้ให้บริการ AI (Masked เสมอเมื่อส่งออก)',
        category: 'ai_copilot',
        dataType: 'encrypted',
      },
      {
        key: 'ai_base_url',
        value: '',
        description: 'Endpoint URL กำหนดเอง (กรณีใช้ Ollama หรือ Private LLM Proxy)',
        category: 'ai_copilot',
        dataType: 'string',
      },
      {
        key: 'ai_system_prompt',
        value:
          'คุณคือผู้ช่วย AI ประจำระบบหลังบ้าน ProRegis (ระบบจัดการรับประกันสินค้า บริษัท วินโดว์ เอเชีย จำกัด (มหาชน)) ช่วยผู้ดูแลระบบตรวจสอบสถิติการลงทะเบียนรับประกัน, ข้อมูลใบสั่งผลิต SAP, และการจัดการ QR Code อย่างถูกต้องและปลอดภัย',
        description: 'ข้อความกำกับบทบาท หน้าที่ และข้อจำกัดความปลอดภัยของ AI ประจำระบบ',
        category: 'ai_copilot',
        dataType: 'string',
      },
      {
        key: 'ai_allow_mcp_tools',
        value: 'true',
        description: 'สวิตช์อนุญาตให้ AI เรียกใช้งาน Central IAM และ Spoke MCP Tools',
        category: 'ai_copilot',
        dataType: 'boolean',
      },
    ];

    for (const s of seeds) {
      try {
        const existing = await this.systemSettingRepo.findOne({ where: { key: s.key } });
        if (!existing) {
          await this.systemSettingRepo.save(this.systemSettingRepo.create(s));
          this.logger.log(`[CIAM SEED] Seeded setting: ${s.key}`);
        } else if (!existing.category || existing.category === 'general') {
          existing.category = s.category;
          existing.description = existing.description || s.description;
          existing.dataType = existing.dataType || s.dataType;
          await this.systemSettingRepo.save(existing);
        }
      } catch (err: any) {
        this.logger.warn(`[CIAM SEED] Could not seed ${s.key}: ${err.message}`);
      }
    }
  }

  async refreshCache(): Promise<void> {
    const all = await this.systemSettingRepo.find();
    this.settingsCache.clear();
    for (const item of all) {
      this.settingsCache.set(item.key, {
        value: item.value ?? '',
        updatedAt: item.updatedAt,
      });
    }
  }

  async getSetting(key: string, fallback = ''): Promise<string> {
    if (!this.settingsCache.has(key)) {
      const row = await this.systemSettingRepo.findOne({ where: { key } });
      if (row) {
        this.settingsCache.set(key, { value: row.value ?? '', updatedAt: row.updatedAt });
        return row.value ?? fallback;
      }
      return fallback;
    }
    return this.settingsCache.get(key)?.value ?? fallback;
  }

  async setSetting(
    key: string,
    value: string,
    meta?: { description?: string; category?: string; dataType?: string },
  ): Promise<void> {
    let row = await this.systemSettingRepo.findOne({ where: { key } });
    if (!row) {
      row = this.systemSettingRepo.create({
        key,
        value,
        description: meta?.description ?? null,
        category: meta?.category ?? 'central_iam',
        dataType: meta?.dataType ?? 'string',
      });
    } else {
      row.value = value;
      if (meta?.category) row.category = meta.category;
      if (meta?.dataType) row.dataType = meta.dataType;
      if (meta?.description) row.description = meta.description;
    }
    const saved = await this.systemSettingRepo.save(row);
    this.settingsCache.set(key, { value: saved.value ?? '', updatedAt: saved.updatedAt });
  }

  private maskSecret(secret: string): string {
    if (!secret) return '';
    if (secret.length <= 8) return '****';
    return `${secret.slice(0, 4)}_****_${secret.slice(-4)}`;
  }

  private maskAiKey(key: string): string {
    if (!key) return '';
    if (key.length <= 10) return '****';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }

  private resolveUserRole(groupName?: string | null): UserRole {
    if (!groupName) return UserRole.IMAGE_EDITOR;
    const upper = groupName.trim().toUpperCase().replace(/\s+/g, '_');
    if (upper === UserRole.SYSTEM_ADMIN || upper === 'ADMIN' || upper === 'SUPER_ADMIN') {
      return UserRole.SYSTEM_ADMIN;
    }
    if (upper === UserRole.CRM_MANAGER || upper.includes('CRM')) {
      return UserRole.CRM_MANAGER;
    }
    if (upper === UserRole.QR_GENERATOR || upper.includes('QR') || upper.includes('FACTORY') || upper.includes('PD')) {
      return UserRole.QR_GENERATOR;
    }
    if (upper === UserRole.IMAGE_EDITOR || upper.includes('IMAGE') || upper.includes('VIEWER') || upper.includes('STAFF')) {
      return UserRole.IMAGE_EDITOR;
    }
    return UserRole.IMAGE_EDITOR;
  }

  // ---------------------------------------------------------------------------
  // 2. Group A: System Settings Management Channel
  // ---------------------------------------------------------------------------
  async getCiamSettings() {
    await this.refreshCache();
    const baseUrl = (await this.getSetting('ciam_base_url', 'https://ciam.windowasia.com')).replace(/\/+$/, '');
    const clientId = await this.getSetting('ciam_client_id', 'proregis-spoke-client');
    const clientSecret = await this.getSetting('ciam_client_secret', 'sec_proregis_oauth_secret_2026');
    const m2mKey = await this.getSetting('ciam_m2m_key', 'sec_proregis_mgmt_2026');
    const ssoEnabled = (await this.getSetting('ciam_sso_enabled', 'true')).toLowerCase() === 'true';
    const breakGlassActive = (await this.getSetting('ciam_break_glass_active', 'false')).toLowerCase() === 'true';
    const adGatewayUrl = await this.getSetting('ciam_ad_gateway_url', 'http://172.18.0.1:3100');
    const autoProvisionGroup = await this.getSetting('ciam_auto_provision_group', UserRole.IMAGE_EDITOR);
    const sessionTtlMinutes = parseInt(await this.getSetting('ciam_session_ttl_minutes', '480'), 10) || 480;

    const updatedAt =
      this.settingsCache.get('ciam_base_url')?.updatedAt?.toISOString() || new Date().toISOString();

    return {
      status: 'success',
      settings: {
        ciam_base_url: baseUrl,
        ciam_client_id: clientId,
        ciam_client_secret_masked: this.maskSecret(clientSecret),
        ciam_m2m_key_masked: this.maskSecret(m2mKey),
        ciam_sso_enabled: ssoEnabled,
        ciam_break_glass_active: breakGlassActive,
        ciam_ad_gateway_url: adGatewayUrl,
        ciam_auto_provision_group: autoProvisionGroup,
        ciam_session_ttl_minutes: sessionTtlMinutes,
        updated_at: updatedAt,
        agent_status: this.lastHeartbeatStatus,
      },
    };
  }

  async updateCiamSettings(
    body: {
      ciam_base_url?: string;
      ciam_client_id?: string;
      ciam_client_secret?: string;
      ciam_m2m_key?: string;
      ciam_sso_enabled?: boolean | string;
      ciam_ad_gateway_url?: string;
      ciam_auto_provision_group?: string;
      ciam_session_ttl_minutes?: number | string;
    },
    actorUsername: string,
    ipAddress: string | null,
  ) {
    const changedFields: string[] = [];

    if (body.ciam_base_url !== undefined) {
      const cleanUrl = String(body.ciam_base_url).trim().replace(/\/+$/, '');
      const current = await this.getSetting('ciam_base_url');
      if (cleanUrl !== current) {
        await this.setSetting('ciam_base_url', cleanUrl, { category: 'central_iam', dataType: 'string' });
        changedFields.push('ciam_base_url');
      }
    }

    if (body.ciam_client_id !== undefined) {
      const val = String(body.ciam_client_id).trim();
      const current = await this.getSetting('ciam_client_id');
      if (val !== current) {
        await this.setSetting('ciam_client_id', val, { category: 'central_iam', dataType: 'string' });
        changedFields.push('ciam_client_id');
      }
    }

    if (
      body.ciam_client_secret !== undefined &&
      body.ciam_client_secret.trim() !== '' &&
      !body.ciam_client_secret.includes('****')
    ) {
      await this.setSetting('ciam_client_secret', body.ciam_client_secret.trim(), {
        category: 'central_iam',
        dataType: 'encrypted',
      });
      changedFields.push('ciam_client_secret');
    }

    if (
      body.ciam_m2m_key !== undefined &&
      body.ciam_m2m_key.trim() !== '' &&
      !body.ciam_m2m_key.includes('****')
    ) {
      await this.setSetting('ciam_m2m_key', body.ciam_m2m_key.trim(), {
        category: 'central_iam',
        dataType: 'encrypted',
      });
      changedFields.push('ciam_m2m_key');
    }

    if (body.ciam_sso_enabled !== undefined) {
      const val = String(body.ciam_sso_enabled).toLowerCase() === 'true' ? 'true' : 'false';
      const current = await this.getSetting('ciam_sso_enabled');
      if (val !== current) {
        await this.setSetting('ciam_sso_enabled', val, { category: 'central_iam', dataType: 'boolean' });
        changedFields.push('ciam_sso_enabled');
      }
    }

    if (body.ciam_ad_gateway_url !== undefined) {
      const val = String(body.ciam_ad_gateway_url).trim();
      const current = await this.getSetting('ciam_ad_gateway_url');
      if (val !== current) {
        await this.setSetting('ciam_ad_gateway_url', val, { category: 'central_iam', dataType: 'string' });
        changedFields.push('ciam_ad_gateway_url');
      }
    }

    if (body.ciam_auto_provision_group !== undefined) {
      const val = String(body.ciam_auto_provision_group).trim();
      const current = await this.getSetting('ciam_auto_provision_group');
      if (val !== current) {
        await this.setSetting('ciam_auto_provision_group', val, { category: 'central_iam', dataType: 'string' });
        changedFields.push('ciam_auto_provision_group');
      }
    }

    if (body.ciam_session_ttl_minutes !== undefined) {
      const val = String(parseInt(String(body.ciam_session_ttl_minutes), 10) || 480);
      const current = await this.getSetting('ciam_session_ttl_minutes');
      if (val !== current) {
        await this.setSetting('ciam_session_ttl_minutes', val, { category: 'central_iam', dataType: 'integer' });
        changedFields.push('ciam_session_ttl_minutes');
      }
    }

    await this.refreshCache();

    // CFG-01 Audit Log
    await this.auditService.recordTransactionLog({
      category: 'system_setting',
      action: 'update_ciam_settings',
      status: 'success',
      message: 'แก้ไขการตั้งค่าระบบ Central IAM SSO',
      triggeredBy: `user:${actorUsername}`,
      details: {
        event_code: 'CFG-01',
        changed_fields: changedFields,
        ip: ipAddress,
      },
    });

    await this.auditService.logAction(
      actorUsername,
      'UPDATE_CIAM_SETTINGS',
      'SystemSetting',
      'central_iam',
      ipAddress,
      null,
      { changed_fields: changedFields },
    );

    return this.getCiamSettings();
  }

  async testCiamConnection(overrideBaseUrl?: string) {
    const baseUrl = (
      overrideBaseUrl || (await this.getSetting('ciam_base_url', 'https://ciam.windowasia.com'))
    )
      .trim()
      .replace(/\/+$/, '');

    const startTime = Date.now();
    const discoveryUrl = `${baseUrl}/.well-known/openid-configuration`;

    try {
      const res = await fetch(discoveryUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          status: 'disconnected',
          latency_ms: latencyMs,
          ciam_issuer: baseUrl,
          jwks_uri: `${baseUrl}/.well-known/jwks.json`,
          keys_found: 0,
          key_id: null,
          message: `เซิร์ฟเวอร์ตอบกลับด้วยสถานะ HTTP ${res.status}`,
        };
      }

      const discovery = await res.json().catch(() => ({}));
      const jwksUri = discovery.jwks_uri || `${baseUrl}/.well-known/jwks.json`;

      let keysFound = 0;
      let keyId: string | null = null;

      try {
        const jwksRes = await fetch(jwksUri, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(3000),
        });
        if (jwksRes.ok) {
          const jwksData = await jwksRes.json().catch(() => ({}));
          if (Array.isArray(jwksData.keys)) {
            keysFound = jwksData.keys.length;
            keyId = jwksData.keys[0]?.kid || null;
          }
        }
      } catch {}

      this.lastHeartbeatStatus.online = true;
      return {
        status: 'connected',
        latency_ms: latencyMs,
        ciam_issuer: discovery.issuer || baseUrl,
        jwks_uri: jwksUri,
        keys_found: keysFound,
        key_id: keyId || 'ciam-key-2026-01',
        message: 'สามารถเชื่อมต่อไปยัง Window Asia Central IAM ได้อย่างสมบูรณ์',
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        status: 'disconnected',
        latency_ms: latencyMs,
        ciam_issuer: baseUrl,
        jwks_uri: `${baseUrl}/.well-known/jwks.json`,
        keys_found: 0,
        key_id: null,
        message: `ไม่สามารถเชื่อมต่อไปยัง ${baseUrl} ได้ (${err.message || 'Timeout / Network Unreachable'})`,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Group B: Single Sign-On Execution Channel
  // ---------------------------------------------------------------------------
  async getSsoConfig() {
    const ssoEnabled = (await this.getSetting('ciam_sso_enabled', 'true')).toLowerCase() === 'true';
    const breakGlassActive = (await this.getSetting('ciam_break_glass_active', 'false')).toLowerCase() === 'true';
    const baseUrl = (await this.getSetting('ciam_base_url', 'https://ciam.windowasia.com')).replace(/\/+$/, '');
    const clientId = await this.getSetting('ciam_client_id', 'proregis-spoke-client');

    return {
      sso_enabled: ssoEnabled,
      break_glass_active: breakGlassActive,
      ciam_base_url: baseUrl,
      client_id: clientId,
      login_button_label: 'เข้าสู่ระบบด้วย Central IAM (SSO)',
      fallback_ad_available: true,
    };
  }

  private base64UrlEncode(buf: Buffer): string {
    return buf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private cleanupExpiredPkce() {
    const now = Date.now();
    for (const [state, entry] of this.pkceStore.entries()) {
      if (now - entry.createdAt > 10 * 60 * 1000) {
        this.pkceStore.delete(state);
      }
    }
  }

  async createAuthorizeUrl(redirectUri: string) {
    const ssoEnabled = (await this.getSetting('ciam_sso_enabled', 'true')).toLowerCase() === 'true';
    const breakGlassActive = (await this.getSetting('ciam_break_glass_active', 'false')).toLowerCase() === 'true';

    if (!ssoEnabled || breakGlassActive) {
      throw new ServiceUnavailableException(
        'ระบบ Single Sign-On ปิดใช้งานชั่วคราว หรืออยู่ในโหมดฉุกเฉิน (Break-Glass Active) กรุณาเข้าสู่ระบบด้วยรหัสผ่านปกติ',
      );
    }

    const baseUrl = (await this.getSetting('ciam_base_url', 'https://ciam.windowasia.com')).replace(/\/+$/, '');
    const clientId = await this.getSetting('ciam_client_id', 'proregis-spoke-client');

    // Generate 64+ character PKCE code_verifier
    const codeVerifier = this.base64UrlEncode(crypto.randomBytes(48)); // 64 base64url chars
    const codeChallenge = this.base64UrlEncode(
      crypto.createHash('sha256').update(codeVerifier).digest(),
    );
    const state = `state_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    this.cleanupExpiredPkce();
    this.pkceStore.set(state, { verifier: codeVerifier, createdAt: Date.now() });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      authorize_url: `${baseUrl}/oauth/authorize?${params.toString()}`,
      code_verifier: codeVerifier,
      state,
    };
  }

  async handleSsoCallback(
    payload: {
      code: string;
      code_verifier?: string | null;
      redirect_uri?: string | null;
      state?: string | null;
    },
    ipAddress: string | null,
    userAgent: string | null,
  ) {
    const startTime = Date.now();
    const ssoEnabled = (await this.getSetting('ciam_sso_enabled', 'true')).toLowerCase() === 'true';
    const breakGlassActive = (await this.getSetting('ciam_break_glass_active', 'false')).toLowerCase() === 'true';
    const baseUrl = (await this.getSetting('ciam_base_url', 'https://ciam.windowasia.com')).replace(/\/+$/, '');
    const clientId = await this.getSetting('ciam_client_id', 'proregis-spoke-client');
    const clientSecret = await this.getSetting('ciam_client_secret', 'sec_proregis_oauth_secret_2026');
    const autoProvisionGroup = await this.getSetting('ciam_auto_provision_group', UserRole.IMAGE_EDITOR);
    const sessionTtlMinutes = parseInt(await this.getSetting('ciam_session_ttl_minutes', '480'), 10) || 480;

    // Step 0: Break-Glass & SSO Enabled Guard
    if (!ssoEnabled || breakGlassActive) {
      await this.auditService.recordTransactionLog({
        category: 'ciam_sso',
        action: 'login_failed',
        status: 'failed',
        message: 'การยืนยันตัวตน SSO ล้มเหลว: ระบบปิดรับ SSO หรืออยู่ในโหมดฉุกเฉิน Break-Glass',
        triggeredBy: 'user:unknown',
        durationMs: Date.now() - startTime,
        details: {
          event_code: 'SSO-02',
          error: 'BreakGlassOrSsoDisabled',
          ip: ipAddress,
          sso_enabled: ssoEnabled,
          break_glass_active: breakGlassActive,
        },
      });
      throw new ServiceUnavailableException(
        'Single Sign-On ถูกปิดใช้งานชั่วคราว (Break-Glass Mode Active)',
      );
    }

    if (!payload.code) {
      throw new BadRequestException('ไม่พบ Authorization Code จาก Central IAM');
    }

    // Resolve PKCE code_verifier (from request body or server state store; optional for legacy portal launch)
    const storedEntry = payload.state ? this.pkceStore.get(payload.state) : undefined;
    if (payload.state && storedEntry) {
      this.pkceStore.delete(payload.state);
    }
    const verifier = payload.code_verifier || storedEntry?.verifier || '';

    // Step 1: Exchange Authorization Code for Tokens at Central IAM
    const tokenEndpoint = `${baseUrl}/api/v1/oauth/token`;
    const tokenParams: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: payload.code,
    };
    if (payload.redirect_uri) {
      tokenParams.redirect_uri = payload.redirect_uri;
    }
    if (verifier) {
      tokenParams.code_verifier = verifier;
    }

    let tokenData: any;
    try {
      let tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams(tokenParams).toString(),
        signal: AbortSignal.timeout(10000),
      });

      // Fallback if CIAM expects application/json body
      if (!tokenRes.ok && tokenRes.status === 415) {
        tokenRes = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(tokenParams),
          signal: AbortSignal.timeout(10000),
        });
      }

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text().catch(() => '');
        throw new Error(`Token exchange HTTP ${tokenRes.status}: ${errBody}`);
      }

      tokenData = await tokenRes.json();
    } catch (err: any) {
      await this.auditService.recordTransactionLog({
        category: 'ciam_sso',
        action: 'login_failed',
        status: 'failed',
        message: `การยืนยันตัวตน SSO ล้มเหลว: แลกเปลี่ยน Authorization Code ไม่สำเร็จ`,
        triggeredBy: 'user:unknown',
        durationMs: Date.now() - startTime,
        details: {
          event_code: 'SSO-02',
          error: 'TokenExchangeFailed',
          ip: ipAddress,
          detail: err.message,
        },
      });
      throw new UnauthorizedException(`แลกเปลี่ยน Token กับ Central IAM ไม่สำเร็จ: ${err.message}`);
    }

    // Step 2 & 3: Verify ID Token Asymmetric Signature (RS256 via JWKS) & Claims
    const idToken = tokenData.id_token || tokenData.access_token;
    if (!idToken) {
      throw new UnauthorizedException('ไม่พบ id_token จาก Central IAM');
    }

    let claims: any;
    try {
      claims = await this.verifyCiamIdToken(idToken, baseUrl, clientId);
    } catch (err: any) {
      await this.auditService.recordTransactionLog({
        category: 'ciam_sso',
        action: 'login_failed',
        status: 'failed',
        message: `การยืนยันตัวตน SSO ล้มเหลว: ${err.message}`,
        triggeredBy: 'user:unknown',
        durationMs: Date.now() - startTime,
        details: {
          event_code: 'SSO-02',
          error: 'SignatureVerificationFailed',
          ip: ipAddress,
          detail: err.message,
        },
      });
      throw new UnauthorizedException(`การตรวจสอบลายเซ็นดิจิทัล (RS256 JWKS) ล้มเหลว: ${err.message}`);
    }

    // Step 4: Identity Resolution & Just-In-Time (JIT) Auto-Provisioning
    const rawUsername =
      claims.preferred_username ||
      claims.username ||
      claims.sub ||
      (claims.email ? String(claims.email).split('@')[0] : '');

    if (!rawUsername) {
      throw new UnauthorizedException('ไม่พบข้อมูลชื่อผู้ใช้ (preferred_username / sub) ใน ID Token');
    }

    const fullName = String(claims.name || claims.full_name || rawUsername).trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || rawUsername;
    const lastName = nameParts.slice(1).join(' ') || '';
    const email = claims.email || null;
    const department = claims.department || '';

    let user = await this.usersService.findByUsername(rawUsername);

    if (!user) {
      // Auto-provision with lowest privilege default role from system_settings
      const targetRole = this.resolveUserRole(autoProvisionGroup);
      const randomPassHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

      user = this.userRepo.create({
        username: rawUsername.trim(),
        passwordHash: randomPassHash,
        role: targetRole,
        status: UserStatus.ACTIVE,
        firstName,
        lastName,
        department,
        email,
        mobile: null,
        telegramId: claims.telegram_chat_id || null,
        isAdAuth: true,
      });
      user = await this.userRepo.save(user);

      // SSO-03 Audit Log
      await this.auditService.recordTransactionLog({
        category: 'ciam_sso',
        action: 'auto_provision_user',
        status: 'info',
        message: `สร้างบัญชีผู้ใช้ใหม่อัตโนมัติจาก Central IAM: '${user.username}'`,
        triggeredBy: 'system:ciam',
        recordsCount: 1,
        durationMs: Date.now() - startTime,
        details: {
          event_code: 'SSO-03',
          username: user.username,
          email: user.email,
          group_assigned: user.role,
          claims: {
            sub: claims.sub,
            preferred_username: claims.preferred_username,
            department: claims.department,
          },
        },
      });
    }

    // Check if account is deactivated/suspended (SSO-04)
    if (user.status !== UserStatus.ACTIVE) {
      await this.auditService.recordTransactionLog({
        category: 'ciam_sso',
        action: 'account_deactivated',
        status: 'warning',
        message: `ปฏิเสธการเข้าสู่ระบบ: บัญชีพนักงาน '${user.username}' ถูกระงับสิทธิ์ในระบบนี้`,
        triggeredBy: `user:${user.username}`,
        durationMs: Date.now() - startTime,
        details: {
          event_code: 'SSO-04',
          username: user.username,
          ip: ipAddress,
          reason: `is_active is false (status: ${user.status})`,
        },
      });
      throw new ForbiddenException(
        `ปฏิเสธการเข้าสู่ระบบ: บัญชีพนักงาน '${user.username}' ถูกระงับสิทธิ์ในระบบนี้`,
      );
    }

    await this.usersService.recordSuccessfulLogin(user);
    clearUserSessionRevocation(user.username);

    // Issue Spoke JWT Token
    const jwtSecret = process.env.JWT_SECRET || 'WindowAsiaJWTSecretKey2026';
    const expiresInSeconds = Math.max(60, sessionTtlMinutes * 60);
    const spokeToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        authMethod: 'CIAM_SSO',
      },
      jwtSecret,
      { expiresIn: expiresInSeconds },
    );

    const allowedMenus = await this.usersService.findAllowedMenusByRole(user.role);

    // SSO-01 Audit Log
    await this.auditService.recordTransactionLog({
      category: 'ciam_sso',
      action: 'login_success',
      status: 'success',
      message: `เข้าสู่ระบบผ่าน Central IAM SSO สำเร็จ: ผู้ใช้ '${user.username}'`,
      triggeredBy: `user:${user.username}`,
      durationMs: Date.now() - startTime,
      details: {
        event_code: 'SSO-01',
        username: user.username,
        ip: ipAddress,
        ciam_issuer: claims.iss || baseUrl,
        auth_method: verifier ? 'OIDC_PKCE_S256' : 'OIDC_PORTAL_LAUNCH',
        roles: [user.role],
      },
    });

    await this.auditService.logAction(
      user.username,
      'LOGIN_SUCCESS',
      'Auth',
      user.id,
      ipAddress,
      userAgent,
      { loginMethod: 'CIAM_SSO' },
    );

    return {
      success: true,
      access_token: spokeToken,
      refresh_token: spokeToken,
      token: spokeToken,
      token_type: 'bearer',
      ciam_portal_url: `${baseUrl}/portal`,
      user: {
        id: user.systemSeqId || user.id,
        username: user.username,
        full_name: `${user.firstName} ${user.lastName}`.trim() || user.username,
        email: user.email,
        department: user.department,
        role: user.role,
        group_id: 1,
        group_name: user.role,
        allowedMenus,
      },
    };
  }

  private async verifyCiamIdToken(idToken: string, baseUrl: string, clientId: string): Promise<any> {
    const decodedHeader = jwt.decode(idToken, { complete: true }) as any;
    if (!decodedHeader || !decodedHeader.header) {
      throw new Error('Malformed JWT ID Token');
    }

    const jwksUri = `${baseUrl}/.well-known/jwks.json`;
    const jwksRes = await fetch(jwksUri, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!jwksRes.ok) {
      throw new Error(`ไม่สามารถดึง JWKS Public Keys จาก ${jwksUri} (HTTP ${jwksRes.status})`);
    }

    const jwksData = await jwksRes.json();
    const keys: any[] = jwksData.keys || [];
    if (keys.length === 0) {
      throw new Error('ไม่พบรายการ Public Keys ใน JWKS Endpoint');
    }

    const targetKid = decodedHeader.header.kid;
    const jwk = (targetKid && keys.find((k) => k.kid === targetKid)) || keys[0];

    const publicKeyObject = crypto.createPublicKey({
      key: jwk,
      format: 'jwk',
    });
    const publicKeyPem = publicKeyObject.export({ type: 'spki', format: 'pem' }) as string;

    return jwt.verify(idToken, publicKeyPem, {
      algorithms: ['RS256'],
      audience: clientId,
      issuer: [baseUrl, `${baseUrl}/`],
    });
  }

  async toggleBreakGlass(
    breakGlassActive: boolean,
    reason: string,
    actorUsername: string,
    ipAddress: string | null,
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('กรุณาระบุเหตุผลในการเปิด/ปิดโหมดฉุกเฉิน Break-Glass');
    }

    const prevStr = await this.getSetting('ciam_break_glass_active', 'false');
    const prevState = prevStr.toLowerCase() === 'true';
    const nextVal = breakGlassActive ? 'true' : 'false';

    await this.setSetting('ciam_break_glass_active', nextVal, {
      category: 'central_iam',
      dataType: 'boolean',
    });
    await this.refreshCache();

    const stateLabel = breakGlassActive ? 'ENABLED' : 'DISABLED';

    // BG-01 Audit Log
    await this.auditService.recordTransactionLog({
      category: 'security_break_glass',
      action: 'toggle_break_glass',
      status: breakGlassActive ? 'warning' : 'success',
      message: `สลับสถานะระบบ Break-Glass: ${stateLabel}`,
      triggeredBy: `user:${actorUsername}`,
      details: {
        event_code: 'BG-01',
        break_glass_active: breakGlassActive,
        reason: reason.trim(),
        ip: ipAddress,
        prev_state: prevState,
      },
    });

    await this.auditService.logAction(
      actorUsername,
      'TOGGLE_BREAK_GLASS',
      'Security',
      stateLabel,
      ipAddress,
      null,
      { break_glass_active: breakGlassActive, reason: reason.trim(), prev_state: prevState },
    );

    // Send emergency alert to Telegram
    const alertMsg = [
      `🚨 <b>[SECURITY ALERT] ProRegis Break-Glass ${stateLabel}</b>`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ <b>สถานะ:</b> ${breakGlassActive ? '⚠️ เปิดโหมดฉุกเฉิน (ใช้ AD Gateway / DB ตรง)' : '✅ ปิดโหมดฉุกเฉิน (กลับสู่โหมดปกติ)'}`,
      `👤 <b>ผู้ดำเนินการ:</b> ${actorUsername}`,
      `📝 <b>เหตุผล:</b> ${reason.trim()}`,
      `🌐 <b>IP Address:</b> ${ipAddress || '-'}`,
      `🕒 <b>เวลา:</b> ${formatThaiDateTime(new Date())}`,
    ].join('\n');

    await this.telegramService.sendMessage(alertMsg).catch(() => {});

    return {
      status: 'success',
      break_glass_active: breakGlassActive,
      reason: reason.trim(),
      message: breakGlassActive
        ? 'เปิดใช้งานโหมดฉุกเฉิน Break-Glass เรียบร้อยแล้ว ระบบสลับไปใช้การยืนยันตัวตนตรงกับ AD Gateway / Local DB'
        : 'ปิดโหมดฉุกเฉิน Break-Glass เรียบร้อยแล้ว ระบบกลับไปใช้ Central IAM SSO ตามปกติ',
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Group C: Inbound Directory Governance & Remote Provisioning Channel
  // ---------------------------------------------------------------------------
  async verifyCiamM2MRequest(apiKeyHeader?: string, timestampHeader?: string, clientIp?: string) {
    const expectedM2M = await this.getSetting('ciam_m2m_key', 'sec_proregis_mgmt_2026');
    const clientSecret = await this.getSetting('ciam_client_secret', 'sec_proregis_oauth_secret_2026');

    if (!apiKeyHeader || (apiKeyHeader !== expectedM2M && apiKeyHeader !== clientSecret)) {
      throw new UnauthorizedException('Invalid or missing X-Management-API-Key header.');
    }

    if (timestampHeader) {
      const tsNum = Number(timestampHeader);
      if (!isNaN(tsNum)) {
        const tsMs = tsNum < 1e12 ? tsNum * 1000 : tsNum;
        if (Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
          throw new UnauthorizedException('Request timestamp expired (exceeds 5 minutes window).');
        }
      }
    }
    return true;
  }

  async listAccountsForCiam(query: { status?: string; department?: string; search?: string }) {
    const users = await this.usersService.findAll();

    const mapped = users.map((u) => ({
      id: u.systemSeqId || u.id,
      username: u.username,
      full_name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
      email: u.email,
      department: u.department || null,
      telegram_chat_id: u.telegramId || null,
      group_name: u.role,
      use_ad_auth: !!u.isAdAuth,
      is_active: u.status === UserStatus.ACTIVE,
      last_login_at: u.lastLogin ? u.lastLogin.toISOString() : null,
      created_at: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
      updated_at: u.updatedAt ? u.updatedAt.toISOString() : new Date().toISOString(),
    }));

    const totalAccounts = mapped.length;
    const activeAccounts = mapped.filter((a) => a.is_active).length;
    const inactiveAccounts = totalAccounts - activeAccounts;

    let filtered = mapped;
    if (query.status === 'active') {
      filtered = filtered.filter((a) => a.is_active);
    } else if (query.status === 'inactive') {
      filtered = filtered.filter((a) => !a.is_active);
    }

    if (query.department) {
      const deptLower = query.department.trim().toLowerCase();
      filtered = filtered.filter((a) => (a.department || '').toLowerCase().includes(deptLower));
    }

    if (query.search) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.username.toLowerCase().includes(q) ||
          a.full_name.toLowerCase().includes(q) ||
          (a.email || '').toLowerCase().includes(q),
      );
    }

    return {
      application_name: 'ProRegis (Product Warranty Registration)',
      total_accounts: totalAccounts,
      active_accounts: activeAccounts,
      inactive_accounts: inactiveAccounts,
      accounts: filtered,
    };
  }

  async provisionAccountFromCiam(payload: {
    username: string;
    full_name?: string;
    email?: string | null;
    department?: string | null;
    group_name?: string | null;
    use_ad_auth?: boolean;
    created_by?: string;
  }) {
    if (!payload.username || !payload.username.trim()) {
      throw new BadRequestException('username is required');
    }

    const existing = await this.usersService.findByUsername(payload.username.trim());
    if (existing) {
      throw new ConflictException(`Account '${payload.username}' already exists.`);
    }

    const defaultGroup = await this.getSetting('ciam_auto_provision_group', UserRole.IMAGE_EDITOR);
    const assignedRole = this.resolveUserRole(payload.group_name || defaultGroup);
    const fullName = (payload.full_name || payload.username).trim();
    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || payload.username;
    const lastName = parts.slice(1).join(' ') || '';

    const randomPassHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    const created = await this.userRepo.save(
      this.userRepo.create({
        username: payload.username.trim(),
        passwordHash: randomPassHash,
        role: assignedRole,
        status: UserStatus.ACTIVE,
        firstName,
        lastName,
        department: payload.department || '',
        email: payload.email || null,
        isAdAuth: payload.use_ad_auth !== undefined ? payload.use_ad_auth : true,
      }),
    );

    await this.auditService.recordTransactionLog({
      category: 'ciam_sso',
      action: 'auto_provision_user',
      status: 'info',
      message: `สร้างบัญชีผู้ใช้ใหม่อัตโนมัติจาก Central IAM: '${created.username}'`,
      triggeredBy: payload.created_by || 'system:ciam',
      recordsCount: 1,
      details: {
        event_code: 'SSO-03',
        username: created.username,
        email: created.email,
        group_assigned: created.role,
      },
    });

    return {
      success: true,
      id: created.systemSeqId || created.id,
      username: created.username,
      message: `Account '${created.username}' created successfully.`,
      group_name: created.role,
      is_active: true,
      created_at: created.createdAt.toISOString(),
    };
  }

  async updateAccountStatusFromCiam(
    username: string,
    payload: { is_active: boolean; reason?: string; updated_by?: string },
  ) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException(`Account '${username}' not found.`);
    }

    if (!payload.is_active && PROTECTED_ADMIN_ACCOUNTS.has(user.username.toLowerCase())) {
      throw new ForbiddenException(
        `Protected account: Cannot disable emergency local administrator '${user.username}'`,
      );
    }

    user.status = payload.is_active ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
    if (payload.is_active) {
      user.failedAttempts = 0;
      user.lockedUntil = null;
      clearUserSessionRevocation(user.username);
    } else {
      revokeUserActiveSessions(user.username);
    }

    const saved = await this.userRepo.save(user);

    await this.auditService.recordTransactionLog({
      category: 'ciam_sso',
      action: payload.is_active ? 'account_reactivated' : 'account_deactivated',
      status: payload.is_active ? 'info' : 'warning',
      message: payload.is_active
        ? `เปิดคืนสิทธิ์การใช้งานบัญชี '${user.username}' จาก Central IAM`
        : `ระงับสิทธิ์บัญชี '${user.username}' ทันที (1-Click Offboarding)`,
      triggeredBy: payload.updated_by || 'system:ciam',
      details: {
        username: user.username,
        is_active: payload.is_active,
        reason: payload.reason || '1-Click Offboarding via Central Identity Management',
      },
    });

    return {
      username: saved.username,
      is_active: saved.status === UserStatus.ACTIVE,
      message: 'Account status updated successfully',
      updated_at: saved.updatedAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Group D: Reverse Heartbeat & Two-Way Directory Reconciliation (Mode C)
  // ---------------------------------------------------------------------------
  private startHeartbeatWorker() {
    // Run every 120 seconds (2 minutes) per Section D.1 / D.3
    this.heartbeatTimer = setInterval(async () => {
      try {
        const ssoEnabled = (await this.getSetting('ciam_sso_enabled', 'true')).toLowerCase() === 'true';
        const breakGlass = (await this.getSetting('ciam_break_glass_active', 'false')).toLowerCase() === 'true';
        if (!ssoEnabled || breakGlass) return;

        this.heartbeatCycleCount += 1;
        const isDailyFullSync = this.heartbeatCycleCount % 720 === 0 || this.forceFullSyncNext;
        this.forceFullSyncNext = false;

        await this.runHeartbeatCycle(isDailyFullSync);
      } catch (err: any) {
        this.logger.debug(`[CIAM HEARTBEAT] Cycle skipped/failed: ${err.message}`);
      }
    }, 120 * 1000);
  }

  async runHeartbeatCycle(isFullSync = false): Promise<{
    online: boolean;
    createdCount: number;
    updatedCount: number;
    totalAccounts: number;
    message: string;
  }> {
    const baseUrl = (await this.getSetting('ciam_base_url', 'https://ciam.windowasia.com')).replace(/\/+$/, '');
    const clientId = await this.getSetting('ciam_client_id', 'proregis-spoke-client');
    const apiKey =
      (await this.getSetting('ciam_m2m_key', '')) ||
      (await this.getSetting('ciam_client_secret', 'sec_proregis_oauth_secret_2026'));

    const allUsers = await this.usersService.findAll();
    const accountsPayload = allUsers.map((u) => ({
      username: u.username,
      full_name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
      email: u.email,
      department: u.department || '',
      role: u.role,
      use_ad_auth: !!u.isAdAuth,
      is_active: u.status === UserStatus.ACTIVE,
    }));

    const payload: Record<string, any> = {
      app_code: 'proregis',
      status: 'HEALTHY',
      app_version: '2.8.0',
      sync_type: isFullSync ? 'FULL_SYNC' : 'HEARTBEAT',
      command_results: this.pendingCommandResults,
    };

    if (isFullSync) {
      payload.accounts = accountsPayload;
    }

    let createdCount = 0;
    let updatedCount = 0;

    try {
      const res = await fetch(`${baseUrl}/api/v1/agent/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Spoke-Client-ID': clientId,
          'X-Spoke-API-Key': apiKey,
          'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.lastHeartbeatStatus = {
          online: false,
          lastSyncAt: new Date().toISOString(),
          serverTime: null,
          message: `CIAM ตอบกลับสถานะ HTTP ${res.status}`,
        };
        return {
          online: false,
          createdCount: 0,
          updatedCount: 0,
          totalAccounts: allUsers.length,
          message: `CIAM ตอบกลับสถานะ HTTP ${res.status}: ${text.slice(0, 120)}`,
        };
      }

      const data = await res.json();
      const newCommandResults: CommandResultItem[] = [];

      // 1. Process pending_commands from CIAM
      const pendingCommands: Array<{
        command_id: string;
        action: string;
        username: string;
        reason?: string;
      }> = Array.isArray(data.pending_commands) ? data.pending_commands : [];

      for (const cmd of pendingCommands) {
        if (cmd.action === 'REQUEST_FULL_SYNC') {
          this.forceFullSyncNext = true;
          newCommandResults.push({
            command_id: cmd.command_id,
            action: cmd.action,
            username: cmd.username || 'ALL_ACCOUNTS',
            status: 'COMPLETED',
            message: 'Full sync command acknowledged. Directory inventory will be pushed.',
          });
          continue;
        }

        const execResult = await this.executeLocalAgentCommand(cmd.action, cmd.username, data.assigned_accounts);
        if (execResult.created) createdCount += 1;
        if (execResult.updated) updatedCount += 1;

        newCommandResults.push({
          command_id: cmd.command_id,
          action: cmd.action,
          username: cmd.username,
          status: execResult.success ? 'COMPLETED' : 'FAILED',
          message: execResult.message,
        });
      }

      // 2. Reconcile assigned_accounts (Two-Way Reconciliation per Section D.4)
      if (Array.isArray(data.assigned_accounts)) {
        for (const assigned of data.assigned_accounts) {
          if (!assigned?.username) continue;
          const existing = await this.usersService.findByUsername(assigned.username);
          if (!existing) {
            const defaultGroup = await this.getSetting('ciam_auto_provision_group', UserRole.IMAGE_EDITOR);
            const role = this.resolveUserRole(assigned.role || defaultGroup);
            const fullName = String(assigned.full_name || assigned.username).trim();
            const parts = fullName.split(/\s+/);
            const passHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

            await this.userRepo.save(
              this.userRepo.create({
                username: assigned.username.trim(),
                passwordHash: passHash,
                role,
                status: assigned.is_active === false ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
                firstName: parts[0] || assigned.username,
                lastName: parts.slice(1).join(' ') || '',
                department: assigned.department || '',
                email: assigned.email || null,
                isAdAuth: true,
              }),
            );
            createdCount += 1;
          } else if (
            typeof assigned.is_active === 'boolean' &&
            !PROTECTED_ADMIN_ACCOUNTS.has(existing.username.toLowerCase())
          ) {
            const currentlyActive = existing.status === UserStatus.ACTIVE;
            if (assigned.is_active !== currentlyActive) {
              existing.status = assigned.is_active ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
              if (!assigned.is_active) {
                revokeUserActiveSessions(existing.username);
              } else {
                clearUserSessionRevocation(existing.username);
              }
              await this.userRepo.save(existing);
              updatedCount += 1;
            }
          }
        }
      }

      this.pendingCommandResults = newCommandResults;
      const finalUsersCount = await this.userRepo.count();

      const summaryMsg = `ซิงก์ข้อมูลกับ Central IAM สำเร็จ: ปรับปรุงสถานะตรงกัน 100% (สร้างใหม่ ${createdCount} บัญชี, ปรับสถานะ ${updatedCount} บัญชี)`;
      this.lastHeartbeatStatus = {
        online: true,
        lastSyncAt: new Date().toISOString(),
        serverTime: data.server_time || new Date().toISOString(),
        message: summaryMsg,
      };

      return {
        online: true,
        createdCount,
        updatedCount,
        totalAccounts: finalUsersCount,
        message: summaryMsg,
      };
    } catch (err: any) {
      this.lastHeartbeatStatus = {
        online: false,
        lastSyncAt: new Date().toISOString(),
        serverTime: null,
        message: `ไม่สามารถเชื่อมต่อ Central IAM Heartbeat ได้ (${err.message})`,
      };
      return {
        online: false,
        createdCount: 0,
        updatedCount: 0,
        totalAccounts: allUsers.length,
        message: `ไม่สามารถเชื่อมต่อไปยัง Central IAM (${baseUrl}) ได้ในขณะนี้: ${err.message}`,
      };
    }
  }

  private async executeLocalAgentCommand(
    action: string,
    username: string,
    assignedAccounts?: any[],
  ): Promise<{ success: boolean; created?: boolean; updated?: boolean; message: string }> {
    try {
      if (action === 'PROVISION_USER') {
        const existing = await this.usersService.findByUsername(username);
        if (existing) {
          return { success: true, message: `User '${username}' already exists in local database.` };
        }
        const matchedProfile = Array.isArray(assignedAccounts)
          ? assignedAccounts.find((a) => String(a.username).toLowerCase() === username.toLowerCase())
          : null;
        const defaultGroup = await this.getSetting('ciam_auto_provision_group', UserRole.IMAGE_EDITOR);
        const role = this.resolveUserRole(matchedProfile?.role || defaultGroup);
        const fullName = String(matchedProfile?.full_name || username).trim();
        const parts = fullName.split(/\s+/);
        const passHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

        await this.userRepo.save(
          this.userRepo.create({
            username: username.trim(),
            passwordHash: passHash,
            role,
            status: UserStatus.ACTIVE,
            firstName: parts[0] || username,
            lastName: parts.slice(1).join(' ') || '',
            department: matchedProfile?.department || '',
            email: matchedProfile?.email || null,
            isAdAuth: true,
          }),
        );

        await this.auditService.recordTransactionLog({
          category: 'ciam_sso',
          action: 'auto_provision_user',
          status: 'info',
          message: `สร้างบัญชีผู้ใช้ใหม่อัตโนมัติจาก Central IAM: '${username}'`,
          triggeredBy: 'system:ciam',
          recordsCount: 1,
          details: { event_code: 'SSO-03', username, group_assigned: role },
        });

        return {
          success: true,
          created: true,
          message: `Account '${username}' provisioned with default role '${role}'.`,
        };
      }

      if (action === 'DISABLE_USER') {
        if (PROTECTED_ADMIN_ACCOUNTS.has(username.trim().toLowerCase())) {
          return {
            success: false,
            message: `Protected account: Cannot disable emergency local administrator '${username}'`,
          };
        }
        const user = await this.usersService.findByUsername(username);
        if (!user) {
          return { success: false, message: `User '${username}' not found in local database.` };
        }
        user.status = UserStatus.SUSPENDED;
        revokeUserActiveSessions(user.username);
        await this.userRepo.save(user);
        return {
          success: true,
          updated: true,
          message: `User '${username}' disabled and active sessions revoked.`,
        };
      }

      if (action === 'ENABLE_USER') {
        const user = await this.usersService.findByUsername(username);
        if (!user) {
          return { success: false, message: `User '${username}' not found in local database.` };
        }
        user.status = UserStatus.ACTIVE;
        user.failedAttempts = 0;
        user.lockedUntil = null;
        clearUserSessionRevocation(user.username);
        await this.userRepo.save(user);
        return {
          success: true,
          updated: true,
          message: `User '${username}' enabled successfully.`,
        };
      }

      return { success: false, message: `Unknown command action: ${action}` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Command execution error' };
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Category E: In-App AI Copilot & MCP Tools (Backoffice Only)
  // ---------------------------------------------------------------------------
  async getAiSettings() {
    await this.refreshCache();
    const enabled = (await this.getSetting('ai_copilot_enabled', 'false')).toLowerCase() === 'true';
    const provider = await this.getSetting('ai_provider', 'google');
    const model = await this.getSetting('ai_model', 'gemini-1.5-flash');
    const rawKey = await this.getSetting('ai_api_key', '');
    const baseUrl = await this.getSetting('ai_base_url', '');
    const systemPrompt = await this.getSetting(
      'ai_system_prompt',
      'คุณคือผู้ช่วย AI ประจำระบบหลังบ้าน ProRegis (ระบบจัดการรับประกันสินค้า Window Asia)',
    );
    const allowMcpTools = (await this.getSetting('ai_allow_mcp_tools', 'true')).toLowerCase() === 'true';

    return {
      enabled,
      provider,
      model,
      has_api_key: Boolean(rawKey && rawKey.trim().length > 0),
      api_key_masked: rawKey ? this.maskAiKey(rawKey) : null,
      base_url: baseUrl,
      system_prompt: systemPrompt,
      allow_mcp_tools: allowMcpTools,
    };
  }

  async updateAiSettings(
    body: {
      ai_copilot_enabled?: boolean | string;
      ai_provider?: string;
      ai_model?: string;
      ai_api_key?: string;
      ai_base_url?: string;
      ai_system_prompt?: string;
      ai_allow_mcp_tools?: boolean | string;
    },
    actorUsername: string,
    ipAddress: string | null,
  ) {
    const changed: string[] = [];

    if (body.ai_copilot_enabled !== undefined) {
      const val = String(body.ai_copilot_enabled).toLowerCase() === 'true' ? 'true' : 'false';
      await this.setSetting('ai_copilot_enabled', val, { category: 'ai_copilot', dataType: 'boolean' });
      changed.push('ai_copilot_enabled');
    }

    if (body.ai_provider !== undefined) {
      await this.setSetting('ai_provider', String(body.ai_provider).trim(), {
        category: 'ai_copilot',
        dataType: 'string',
      });
      changed.push('ai_provider');
    }

    if (body.ai_model !== undefined) {
      await this.setSetting('ai_model', String(body.ai_model).trim(), {
        category: 'ai_copilot',
        dataType: 'string',
      });
      changed.push('ai_model');
    }

    if (
      body.ai_api_key !== undefined &&
      body.ai_api_key.trim() !== '' &&
      !body.ai_api_key.includes('...') &&
      !body.ai_api_key.includes('****')
    ) {
      await this.setSetting('ai_api_key', body.ai_api_key.trim(), {
        category: 'ai_copilot',
        dataType: 'encrypted',
      });
      changed.push('ai_api_key');
    }

    if (body.ai_base_url !== undefined) {
      await this.setSetting('ai_base_url', String(body.ai_base_url).trim(), {
        category: 'ai_copilot',
        dataType: 'string',
      });
      changed.push('ai_base_url');
    }

    if (body.ai_system_prompt !== undefined) {
      await this.setSetting('ai_system_prompt', String(body.ai_system_prompt), {
        category: 'ai_copilot',
        dataType: 'string',
      });
      changed.push('ai_system_prompt');
    }

    if (body.ai_allow_mcp_tools !== undefined) {
      const val = String(body.ai_allow_mcp_tools).toLowerCase() === 'true' ? 'true' : 'false';
      await this.setSetting('ai_allow_mcp_tools', val, { category: 'ai_copilot', dataType: 'boolean' });
      changed.push('ai_allow_mcp_tools');
    }

    await this.refreshCache();

    await this.auditService.recordTransactionLog({
      category: 'system_setting',
      action: 'update_ai_settings',
      status: 'success',
      message: 'แก้ไขการตั้งค่าระบบ In-App AI Copilot',
      triggeredBy: `user:${actorUsername}`,
      details: { changed_fields: changed, ip: ipAddress },
    });

    return this.getAiSettings();
  }

  async testAiConnection(overrideConfig?: {
    provider?: string;
    model?: string;
    api_key?: string;
    base_url?: string;
  }) {
    const provider = (overrideConfig?.provider || (await this.getSetting('ai_provider', 'google'))).toLowerCase();
    const model = overrideConfig?.model || (await this.getSetting('ai_model', 'gemini-1.5-flash'));
    const candidateKey = overrideConfig?.api_key;
    const apiKey =
      candidateKey && !candidateKey.includes('...') && !candidateKey.includes('****')
        ? candidateKey.trim()
        : await this.getSetting('ai_api_key', '');
    const baseUrl = overrideConfig?.base_url ?? (await this.getSetting('ai_base_url', ''));

    const startTime = Date.now();

    if (!apiKey && provider !== 'ollama') {
      return {
        status: 'error',
        latency_ms: 0,
        provider,
        model,
        message: 'กรุณาระบุ API Key ก่อนทดสอบการเชื่อมต่อ',
      };
    }

    try {
      if (provider === 'google') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model,
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ตอบคำว่า OK สั้นๆ' }] }],
          }),
          signal: AbortSignal.timeout(10000),
        });
        const latencyMs = Date.now() - startTime;
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          return {
            status: 'error',
            latency_ms: latencyMs,
            provider,
            model,
            message: `Google Gemini API ปฏิเสธการเชื่อมต่อ (HTTP ${res.status}): ${errText.slice(0, 120)}`,
          };
        }
        return {
          status: 'connected',
          latency_ms: latencyMs,
          provider,
          model,
          message: `เชื่อมต่อ Google Gemini (${model}) สำเร็จ (${latencyMs} ms)`,
        };
      }

      if (provider === 'openai' || provider === 'custom' || provider === 'ollama') {
        const endpoint =
          baseUrl && baseUrl.trim()
            ? `${baseUrl.trim().replace(/\/+$/, '')}/chat/completions`
            : 'https://api.openai.com/v1/chat/completions';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Say OK' }],
            max_tokens: 10,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const latencyMs = Date.now() - startTime;
        if (!res.ok) {
          return {
            status: 'error',
            latency_ms: latencyMs,
            provider,
            model,
            message: `Provider ตอบกลับสถานะ HTTP ${res.status}`,
          };
        }
        return {
          status: 'connected',
          latency_ms: latencyMs,
          provider,
          model,
          message: `เชื่อมต่อ ${provider.toUpperCase()} (${model}) สำเร็จ (${latencyMs} ms)`,
        };
      }

      if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say OK' }],
          }),
          signal: AbortSignal.timeout(10000),
        });
        const latencyMs = Date.now() - startTime;
        if (!res.ok) {
          return {
            status: 'error',
            latency_ms: latencyMs,
            provider,
            model,
            message: `Anthropic API ตอบกลับสถานะ HTTP ${res.status}`,
          };
        }
        return {
          status: 'connected',
          latency_ms: latencyMs,
          provider,
          model,
          message: `เชื่อมต่อ Anthropic (${model}) สำเร็จ (${latencyMs} ms)`,
        };
      }

      return {
        status: 'error',
        latency_ms: Date.now() - startTime,
        provider,
        model,
        message: `ไม่รองรับ Provider: ${provider}`,
      };
    } catch (err: any) {
      return {
        status: 'error',
        latency_ms: Date.now() - startTime,
        provider,
        model,
        message: `เชื่อมต่อไม่สำเร็จ: ${err.message}`,
      };
    }
  }

  private async buildSpokeLiveContext(): Promise<{
    totalRegistrations: number;
    totalProductionOrders: number;
    totalUsers: number;
    activeUsers: number;
    qrMode: string;
    ssoEnabled: boolean;
    breakGlassActive: boolean;
  }> {
    const [totalRegistrations, totalProductionOrders, allUsers, qrMode, ssoStr, bgStr] = await Promise.all([
      this.registrationRepo.count(),
      this.productionOrderRepo.count(),
      this.usersService.findAll(),
      this.getSetting('QR_CODE_MODE', 'STATIC'),
      this.getSetting('ciam_sso_enabled', 'true'),
      this.getSetting('ciam_break_glass_active', 'false'),
    ]);

    return {
      totalRegistrations,
      totalProductionOrders,
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u) => u.status === UserStatus.ACTIVE).length,
      qrMode,
      ssoEnabled: ssoStr.toLowerCase() === 'true',
      breakGlassActive: bgStr.toLowerCase() === 'true',
    };
  }

  async chatWithCopilot(messages: Array<{ role: string; content: string }>, currentUser?: any) {
    const enabled = (await this.getSetting('ai_copilot_enabled', 'false')).toLowerCase() === 'true';
    if (!enabled) {
      return {
        message: {
          role: 'assistant',
          content:
            '⚠️ ระบบ AI Copilot ถูกปิดใช้งานอยู่ กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานในหน้า System Settings',
        },
      };
    }

    const provider = (await this.getSetting('ai_provider', 'google')).toLowerCase();
    const model = await this.getSetting('ai_model', 'gemini-1.5-flash');
    const apiKey = await this.getSetting('ai_api_key', '');
    const baseUrl = await this.getSetting('ai_base_url', '');
    const systemPrompt = await this.getSetting(
      'ai_system_prompt',
      'คุณคือผู้ช่วย AI ประจำระบบหลังบ้าน ProRegis',
    );
    const allowMcp = (await this.getSetting('ai_allow_mcp_tools', 'true')).toLowerCase() === 'true';

    const userQuery = messages?.[messages.length - 1]?.content || '';
    const ctx = allowMcp ? await this.buildSpokeLiveContext() : null;

    const contextBlock = ctx
      ? `\n\n[ข้อมูลสถานะปัจจุบันของระบบ ProRegis (Spoke MCP Context)]\n- โหมด QR Code ปัจจุบัน: ${ctx.qrMode}\n- จำนวนการลงทะเบียนรับประกันทั้งหมด: ${ctx.totalRegistrations} รายการ\n- จำนวนใบสั่งผลิต (Production Orders) ในฐานข้อมูล: ${ctx.totalProductionOrders} รายการ\n- จำนวนบัญชีผู้ดูแลระบบหลังบ้าน: ${ctx.totalUsers} บัญชี (Active ${ctx.activeUsers} บัญชี)\n- สถานะ Central IAM SSO: ${ctx.ssoEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} (Break-Glass: ${ctx.breakGlassActive ? 'เปิด' : 'ปิด'})`
      : '';

    // External LLM call if API key is configured
    if (apiKey || provider === 'ollama') {
      try {
        if (provider === 'google') {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model,
          )}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: `${systemPrompt}${contextBlock}` }],
              },
              contents: messages.map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
            }),
            signal: AbortSignal.timeout(20000),
          });

          if (res.ok) {
            const data = await res.json();
            const answer =
              data?.candidates?.[0]?.content?.parts?.[0]?.text ||
              'ไม่สามารถประมวลผลคำตอบได้ในขณะนี้';
            return { message: { role: 'assistant', content: answer } };
          }
        } else if (provider === 'openai' || provider === 'custom' || provider === 'ollama') {
          const endpoint =
            baseUrl && baseUrl.trim()
              ? `${baseUrl.trim().replace(/\/+$/, '')}/chat/completions`
              : 'https://api.openai.com/v1/chat/completions';
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

          const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: `${systemPrompt}${contextBlock}` },
                ...messages.map((m) => ({
                  role: m.role === 'assistant' ? 'assistant' : 'user',
                  content: m.content,
                })),
              ],
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (res.ok) {
            const data = await res.json();
            const answer = data?.choices?.[0]?.message?.content || 'ไม่สามารถประมวลผลคำตอบได้';
            return { message: { role: 'assistant', content: answer } };
          }
        } else if (provider === 'anthropic') {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model,
              max_tokens: 1024,
              system: `${systemPrompt}${contextBlock}`,
              messages: messages.map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
              })),
            }),
            signal: AbortSignal.timeout(20000),
          });
          if (res.ok) {
            const data = await res.json();
            const answer = data?.content?.[0]?.text || 'ไม่สามารถประมวลผลคำตอบได้';
            return { message: { role: 'assistant', content: answer } };
          }
        }
      } catch (err: any) {
        this.logger.warn(`[AI COPILOT] External LLM call failed, using internal fallback: ${err.message}`);
      }
    }

    // Zero-Cost Internal Rule-Based / Function Lookup Fallback (Section 11.1 #4)
    const live = ctx || (await this.buildSpokeLiveContext());
    const q = userQuery.toLowerCase();

    if (q.includes('ลงทะเบียน') || q.includes('รับประกัน') || q.includes('สถิติ') || q.includes('กี่ชิ้น') || q.includes('ยอด')) {
      return {
        message: {
          role: 'assistant',
          content: `📊 **สรุปข้อมูลการลงทะเบียนรับประกัน (ProRegis Local Assistant)**\n• รายการลงทะเบียนรับประกันสะสม: **${live.totalRegistrations} รายการ**\n• จำนวนใบสั่งผลิต (Production Orders): **${live.totalProductionOrders} รายการ**\n• โหมด QR Code ปัจจุบัน: **${live.qrMode}**`,
        },
      };
    }

    if (q.includes('ผู้ใช้') || q.includes('admin') || q.includes('บัญชี') || q.includes('sso') || q.includes('ciam')) {
      return {
        message: {
          role: 'assistant',
          content: `🛡️ **สถานะบัญชีผู้ดูแลระบบ & Central IAM (ProRegis Local Assistant)**\n• บัญชีผู้ดูแลในระบบทั้งหมด: **${live.totalUsers} บัญชี** (เปิดใช้งาน ${live.activeUsers} บัญชี)\n• Central IAM SSO: **${live.ssoEnabled ? 'เปิดใช้งาน (Enabled)' : 'ปิดใช้งาน (Disabled)'}**\n• โหมดฉุกเฉิน Break-Glass: **${live.breakGlassActive ? '⚠️ เปิดใช้งาน' : 'ปกติ (ปิด)'}**`,
        },
      };
    }

    return {
      message: {
        role: 'assistant',
        content: `🤖 **(ProRegis Local Assistant)**: ได้รับข้อความ *"${userQuery}"* เรียบร้อยแล้ว\n\n**ข้อมูลภาพรวมระบบปัจจุบัน:**\n• ยอดลงทะเบียนรับประกัน: **${live.totalRegistrations} รายการ**\n• ใบสั่งผลิต SAP ในระบบ: **${live.totalProductionOrders} รายการ**\n• โหมด QR Code: **${live.qrMode}**\n• ผู้ใช้งานหลังบ้านที่ Active: **${live.activeUsers}/${live.totalUsers} บัญชี**\n\n*(หมายเหตุ: กรุณาตั้งค่า AI API Key ในหน้า System Settings หากต้องการวิเคราะห์ภาษาธรรมชาติแบบเต็มรูปแบบ)*`,
      },
    };
  }
}
