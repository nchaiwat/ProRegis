import { Controller, Get, Post, Query, Param, Req, Res, UseGuards, HttpCode, Body } from '@nestjs/common';
import { CrmService, CrmFilterDto } from './crm.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import type { Request, Response } from 'express';

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SYSTEM_ADMIN', 'CRM_MANAGER') // Only admins or CRM managers can access customer database
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly auditService: AuditService,
  ) {}

  @Get('registrations')
  async listRegistrations(@Query() query: CrmFilterDto) {
    return this.crmService.getRegistrations(query);
  }

  @Get('registrations/:id')
  async getDetails(@Param('id') id: string, @Req() req: Request) {
    const actor = (req as any).user?.username || 'unknown';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    const registration = await this.crmService.getRegistrationDetails(id);

    // Audit logs for viewing PII (HIPAA/GDPR/PDPA audit compliance)
    await this.auditService.logAction(
      actor,
      'VIEW_PII',
      'Registration',
      id,
      ipAddress,
      userAgent,
      {
        fieldsViewed: ['firstName', 'lastName', 'phone', 'email', 'address', 'latitude', 'longitude'],
        token: registration.token,
      },
    );

    return registration;
  }

  @Post('export')
  @HttpCode(200)
  async exportCsv(
    @Body() body: Omit<CrmFilterDto, 'page' | 'limit'>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const actor = (req as any).user?.username || 'unknown';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    const list = await this.crmService.getAllRegistrationsForExport(body);

    // Log the PII export event
    await this.auditService.logAction(
      actor,
      'EXPORT_PII',
      'Registration',
      null,
      ipAddress,
      userAgent,
      {
        recordCount: list.length,
        filtersApplied: body,
      },
    );

    // Build CSV content
    const BOM = '\uFEFF'; // UTF-8 BOM
    const header = 'Ref ID,Registered At,First Name,Last Name,Phone,Email,Address,Province,Postal Code,Product Code,QR Token,Production Order,Unit Seq,Lat,Lng,Status';
    const lines = list.map((item) => {
      const dateStr = item.registeredAt ? new Date(item.registeredAt).toISOString().split('T')[0] : '';
      // Escape columns containing commas
      const escapedAddress = `"${(item.address || '').replace(/"/g, '""')}"`;
      const escapedFirstName = `"${(item.firstName || '').replace(/"/g, '""')}"`;
      const escapedLastName = `"${(item.lastName || '').replace(/"/g, '""')}"`;
      return [
        item.id,
        dateStr,
        escapedFirstName,
        escapedLastName,
        item.phone || '',
        item.email || '',
        escapedAddress,
        item.province || '',
        item.postalCode || '',
        item.token || '',
        item.token || '', // Raw QR token
        item.docNum || '',
        item.seqNum || '',
        item.latitude || '',
        item.longitude || '',
        item.status || '',
      ].join(',');
    });

    const csvContent = BOM + [header, ...lines].join('\r\n');
    const filename = `Customer_Registrations_Export_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(csvContent, 'utf8'));
  }
}
