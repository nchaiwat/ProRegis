import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  Query,
  Param,
  HttpCode,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { BackofficeService } from './backoffice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('backoffice')
export class BackofficeController {
  constructor(private readonly backofficeService: BackofficeService) {}

  // -------------------------------------------------------------------------
  // POST /backoffice/generate
  // Restricted to SYSTEM_ADMIN or QR_GENERATOR
  // -------------------------------------------------------------------------
  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'QR_GENERATOR')
  async generateCsv(
    @Body() body: { docNum: string; startSeq: number; quantity: number; preview?: boolean },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const actor = (req as any).user?.username || 'unknown';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    try {
      const rows = await this.backofficeService.generateBatch(
        actor,
        body.docNum,
        body.startSeq,
        body.quantity,
        ipAddress,
        body.preview,
      );

      if (body.preview) {
        return res.json({ success: true, rows });
      }

      const csvContent = this.backofficeService.buildCsv(rows);

      const filename = `QR_Batch_${body.docNum}_seq${String(body.startSeq).padStart(3, '0')}_qty${body.quantity}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(Buffer.from(csvContent, 'utf8'));
    } catch (err) {
      const status = typeof err.getStatus === 'function' ? err.getStatus() : 400;
      const message = err.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์';
      return res.status(status).json({
        statusCode: status,
        message: message,
        error: err.name || 'Bad Request',
      });
    }
  }

  // -------------------------------------------------------------------------
  // POST /backoffice/decrypt  (ใช้ฝั่ง Registration — ถอดรหัส Token)
  // -------------------------------------------------------------------------
  @Post('decrypt')
  @HttpCode(200)
  decryptToken(@Body() body: { token: string }) {
    const result = this.backofficeService.decryptToken(body.token);
    if (!result) {
      return { success: false, error: 'Invalid or tampered QR token' };
    }
    return { success: true, docNum: result.docNum, seqNum: result.seqNum };
  }

  // -------------------------------------------------------------------------
  // GET /backoffice/logs?limit=50 - Restricted to SYSTEM_ADMIN
  // -------------------------------------------------------------------------
  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN')
  async getLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const logs = await this.backofficeService.getLogs(parsedLimit);
    return { logs };
  }

  // -------------------------------------------------------------------------
  // GET /backoffice/next-sequence?docNum=xxx
  // -------------------------------------------------------------------------
  @Get('next-sequence')
  @UseGuards(JwtAuthGuard)
  async getNextSequence(@Query('docNum') docNum: string) {
    if (!docNum || !/^\d{9}$/.test(docNum)) {
      return { success: false, error: 'DocNum ต้องเป็นตัวเลข 9 หลัก' };
    }
    const nextSeq = await this.backofficeService.getNextSequence(docNum);
    return { success: true, nextSeq };
  }

  // -------------------------------------------------------------------------
  // GET /backoffice/dashboard-summary?startDate=xxx&endDate=yyy
  // -------------------------------------------------------------------------
  @Get('dashboard-summary')
  @UseGuards(JwtAuthGuard)
  async getDashboardSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const summary = await this.backofficeService.getDashboardSummary(startDate, endDate);
    return { success: true, summary };
  }

  // -------------------------------------------------------------------------
  // GET /backoffice/production-tracker
  // -------------------------------------------------------------------------
  @Get('production-tracker')
  @UseGuards(JwtAuthGuard)
  async getProductionTracker(@Query('mode') mode?: 'STATIC' | 'DYNAMIC') {
    const data = await this.backofficeService.getProductionTrackerList(mode);
    return { success: true, data };
  }

  // -------------------------------------------------------------------------
  // POST /backoffice/check-product
  // -------------------------------------------------------------------------
  @Post('check-product')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async checkProduct(@Body() body: { token?: string; label?: string; registrationId?: string }) {
    return this.backofficeService.checkProduct(body.token, body.label, body.registrationId);
  }

  // -------------------------------------------------------------------------
  // GET /backoffice/lot-summary/:docNum
  // -------------------------------------------------------------------------
  @Get('lot-summary/:docNum')
  @UseGuards(JwtAuthGuard)
  async getLotSummary(@Param('docNum') docNum: string) {
    return this.backofficeService.getLotSummary(docNum);
  }

  // -------------------------------------------------------------------------
  // GET /backoffice/settings - Restricted to SYSTEM_ADMIN
  // -------------------------------------------------------------------------
  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN')
  async getSettings() {
    return this.backofficeService.getSystemSettings();
  }

  // -------------------------------------------------------------------------
  // POST /backoffice/settings - Restricted to SYSTEM_ADMIN
  // -------------------------------------------------------------------------
  @Post('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN')
  async updateSettings(@Body() body: { key: string; value: string }) {
    if (!body.key || !body.value) {
      throw new BadRequestException('Key and Value are required');
    }
    await this.backofficeService.updateSystemSetting(body.key, body.value);
    return { success: true };
  }
}

