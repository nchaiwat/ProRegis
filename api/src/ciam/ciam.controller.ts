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
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CiamService } from './ciam.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

function extractClientIp(req: Request): string | null {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    null
  );
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
  constructor(private readonly ciamService: CiamService) {}

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
  ) {
    const ip = extractClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) || null;
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
@Controller(['v1/directory', 'api/v1/directory'])
export class CiamDirectoryController {
  constructor(private readonly ciamService: CiamService) {}

  @Get('accounts')
  async listAccounts(
    @Headers('x-management-api-key') apiKey: string,
    @Headers('x-request-timestamp') timestamp: string,
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
  ) {
    await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, extractClientIp(req) || undefined);
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
      created_by?: string;
    },
  ) {
    await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, extractClientIp(req) || undefined);
    return this.ciamService.provisionAccountFromCiam(body);
  }

  @Patch('accounts/:username/status')
  async updateAccountStatus(
    @Headers('x-management-api-key') apiKey: string,
    @Headers('x-request-timestamp') timestamp: string,
    @Req() req: Request,
    @Param('username') username: string,
    @Body() body: { is_active: boolean; reason?: string; updated_by?: string },
  ) {
    await this.ciamService.verifyCiamM2MRequest(apiKey, timestamp, extractClientIp(req) || undefined);
    return this.ciamService.updateAccountStatusFromCiam(username, body);
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
  async getAiSettings() {
    return this.ciamService.getAiSettings();
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
