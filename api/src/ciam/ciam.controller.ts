import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CiamService, CIAM_FRAMEWORK_VERSION } from './ciam.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { evaluateRateLimitOnly } from '../auth/bot-defense';

function extractClientIp(req: Request): string | null {
  const raw =
    (req.headers['x-ciam-origin-ip'] as string) ||
    (req.headers['x-origin-ip'] as string) ||
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string) ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    null;

  if (!raw) return null;
  const first = raw.split(',')[0].trim().replace(/^::ffff:/, '');
  return first || null;
}

// =============================================================================
// Group A: System Settings Management Channel (Admin Only)
// =============================================================================
@Controller(['settings/ciam-sso', 'api/settings/ciam-sso'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
export class CiamSettingsController {
  constructor(private readonly ciamService: CiamService) {}

  @Get()
  async getCiamSsoSettings() {
    return this.ciamService.getCiamSettings();
  }

  @Put()
  async updateCiamSsoSettings(@Body() body: any, @Req() req: Request) {
    const actor = (req as any).user?.username || 'admin';
    const ip = extractClientIp(req);
    return this.ciamService.updateCiamSettings(body, actor, ip);
  }

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  async testConnection(@Body() body?: { ciam_base_url?: string }) {
    return this.ciamService.testCiamConnection(body?.ciam_base_url);
  }
}

// =============================================================================
// Group B: Single Sign-On Execution Channel
// =============================================================================
@Controller(['auth/sso', 'api/auth/sso'])
export class CiamSsoAuthController {
  constructor(
    private readonly ciamService: CiamService,
    private readonly auditService: AuditService,
  ) {}

  @Get(['login', 'start'])
  async ssoLoginRedirect(@Res() res: Response) {
    return res.redirect('/auth/start');
  }

  @Get('config')
  async getSsoConfig() {
    return this.ciamService.getSsoConfig();
  }

  @Post('authorize-url')
  @HttpCode(HttpStatus.OK)
  async getAuthorizeUrl(@Body() body: { redirect_uri: string }) {
    return this.ciamService.createAuthorizeUrl(body?.redirect_uri);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async ssoCallback(
    @Body()
    body: {
      code: string;
      code_verifier?: string | null;
      redirect_uri?: string | null;
      state?: string | null;
    },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = (req.headers['user-agent'] as string) || null;
    const rateIp = evaluateRateLimitOnly(req, res, async (action, ip, details) => {
      await this.auditService.logAction('sso_callback', action, 'SecurityBotDefense', null, ip, userAgent, details);
      await this.auditService.recordTransactionLog({
        category: 'security_bot_defense',
        action: action.toLowerCase(),
        status: 'warning',
        ipAddress: ip,
        message: `ระบบป้องกันบอทตรวจพบเหตุการณ์ ${action} ที่ SSO Callback`,
        triggeredBy: `ip:${ip}`,
        details: { event_code: action, ...details },
      });
    });
    const ip = extractClientIp(req) || rateIp;
    return this.ciamService.handleSsoCallback(body, ip, userAgent);
  }

  @Post('break-glass-toggle')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN')
  async breakGlassToggle(
    @Body() body: { break_glass_active: boolean; reason: string },
    @Req() req: Request,
  ) {
    const actor = (req as any).user?.username || 'admin';
    const ip = extractClientIp(req);
    return this.ciamService.toggleBreakGlass(
      Boolean(body?.break_glass_active),
      body?.reason || '',
      actor,
      ip,
    );
  }
}

// =============================================================================
// Group C: Inbound Directory Governance & Remote Provisioning (Mode A M2M)
// =============================================================================
@Controller(['v1/directory', 'api/v1/directory', 'directory', 'api/directory'])
export class CiamDirectoryController {
  constructor(private readonly ciamService: CiamService) {}

  @Get('accounts')
  async listAccounts(
    @Headers('x-management-api-key') apiKey: string,
    @Headers('x-request-timestamp') timestamp: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, extractClientIp(req) || undefined);
    res.setHeader('X-CIAM-Framework-Version', CIAM_FRAMEWORK_VERSION);
    return this.ciamService.listAccountsForCiam({ status, department, search });
  }

  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  async provisionAccount(
    @Headers('x-management-api-key') apiKey: string,
    @Headers('x-request-timestamp') timestamp: string,
    @Req() req: Request,
    @Body()
    body: {
      username: string;
      full_name?: string;
      email?: string | null;
      department?: string | null;
      group_name?: string | null;
      use_ad_auth?: boolean;
      password?: string;
      must_change_password?: boolean;
      created_by?: string;
    },
  ) {
    const ip = extractClientIp(req);
    await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, ip || undefined);
    return this.ciamService.provisionAccountFromCiam(body, ip);
  }

  @Patch('accounts/:username/status')
  async updateAccountStatus(
    @Headers('x-management-api-key') apiKey: string,
    @Headers('x-request-timestamp') timestamp: string,
    @Req() req: Request,
    @Param('username') username: string,
    @Body() body: { is_active: boolean; reason?: string; updated_by?: string },
  ) {
    const ip = extractClientIp(req);
    await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, ip || undefined);
    return this.ciamService.updateAccountStatusFromCiam(username, body, ip);
  }
}

// =============================================================================
// Group D: Outbound Agent & Immediate Account Sync Button (Mode C)
// =============================================================================
@Controller(['settings/ciam-agent', 'api/settings/ciam-agent'])
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
export class CiamAgentController {
  constructor(private readonly ciamService: CiamService) {}

  @Post('sync-now')
  @HttpCode(HttpStatus.OK)
  async syncNow() {
    const result = await this.ciamService.runHeartbeatCycle(true);
    return {
      status: result.online ? 'success' : 'offline',
      ...result,
    };
  }
}

// =============================================================================
// Group E: In-App AI Copilot & MCP Tools (Backoffice Only)
// =============================================================================
@Controller()
export class AiCopilotController {
  constructor(
    private readonly ciamService: CiamService,
    private readonly auditService: AuditService,
  ) {}

  @Get(['settings/ai', 'api/settings/ai'])
  @UseGuards(JwtAuthGuard)
  async getAiSettings(@Req() req: Request) {
    return this.ciamService.getAiSettings((req as any).user);
  }

  @Put(['settings/ai', 'api/settings/ai'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN')
  async updateAiSettings(@Body() body: any, @Req() req: Request) {
    const actor = (req as any).user?.username || 'admin';
    const ip = extractClientIp(req);
    return this.ciamService.updateAiSettings(body, actor, ip);
  }

  @Post(['settings/ai/test', 'api/settings/ai/test'])
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN')
  async testAiConnection(@Body() body: any) {
    return this.ciamService.testAiConnection(body);
  }

  @Post(['ai/chat', 'api/ai/chat'])
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: { messages: Array<{ role: string; content: string }> }, @Req() req: Request) {
    return this.ciamService.chatWithCopilot(body?.messages || [], (req as any).user);
  }

  @Get(['backoffice/transaction-logs', 'api/backoffice/transaction-logs'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN')
  async getTransactionLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const logs = await this.auditService.getTransactionLogs(parsedLimit);
    return { logs };
  }
}
