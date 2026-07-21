import { Injectable, UnauthorizedException, BadRequestException, Inject, forwardRef, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { GenerationLog } from './generation-log.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { Registration } from '../registration/registration.entity';
import { SystemSetting } from './system-setting.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { TelegramService, formatThaiDateTime } from '../telegram/telegram.service';
import { SapService, SapProductionOrderInfo } from '../sap/sap.service';
import { ProductsService } from '../products/products.service';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Encryption Config — ควรย้ายเป็น ENV variable ใน Production
// ---------------------------------------------------------------------------
const SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.AES_SECRET_KEY || 'WindowAsiaSecretKey2026')
  .digest()
  .slice(0, 16); // 16 bytes = AES-128

const IV = crypto
  .createHash('sha256')
  .update(process.env.AES_IV_KEY || 'WindowAsiaIV2026')
  .digest()
  .slice(0, 16); // 16 bytes IV

const provinceMapping: Record<string, string> = {
  'bangkok': 'กรุงเทพมหานคร',
  'nonthaburi': 'นนทบุรี',
  'samut prakan': 'สมุทรปราการ',
  'samutprakan': 'สมุทรปราการ',
  'chiang mai': 'เชียงใหม่',
  'chiangmai': 'เชียงใหม่',
  'chonburi': 'ชลบุรี',
  'phuket': 'ภูเก็ต',
  'khon kaen': 'ขอนแก่น',
  'khonkaen': 'ขอนแก่น',
  'nakhon ratchasima': 'นครราชสีมา',
  'nakhonratchasima': 'นครราชสีมา',
  'korat': 'นครราชสีมา',
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
export interface GeneratedRow {
  code: string;      // AES-128-CBC + Base64URL ของ "docNum:seqStr"
  pd: string;        // docNum + seqStr ต่อกัน เช่น 260600007001
}

@Injectable()
export class BackofficeService implements OnModuleInit {
  private readonly logger = new Logger(BackofficeService.name);

  constructor(
    @InjectRepository(GenerationLog)
    private readonly logRepository: Repository<GenerationLog>,
    @InjectRepository(ProductionOrder)
    private readonly productionOrderRepository: Repository<ProductionOrder>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly telegramService: TelegramService,
    private readonly sapService: SapService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedSettings();
  }

  private async seedSettings() {
    const defaultSettings = [
      { key: 'QR_CODE_MODE', value: 'STATIC' },
      { key: 'VERIFICATION_MODE', value: 'OTP' },
      { key: 'TELEGRAM_API_BASE_URL', value: 'https://api.telegram.org' },
      { key: 'TELEGRAM_BOT_TOKEN', value: '8231754616:AAHcITgZR6_Gc8XJx-6Fxj-Cyy5bZZQG2hw' },
      { key: 'TELEGRAM_GROUP_ID', value: '-5394050672' },
      { key: 'SAP_SERVICE_LAYER_URL', value: 'http://wa-dbs2.wa.net:50002/b1s/v2' },
      { key: 'SAP_COMPANY_DB', value: 'SBO_WA_Test_20260531' },
      { key: 'SAP_USERNAME', value: 'Chaiwat.N' },
      { key: 'SAP_PASSWORD', value: 'Ojmcpnna2!' },
      { key: 'SMS_PROVIDER_NAME', value: 'SMSMKT' },
      { key: 'SMS_API_KEY', value: 'a7aa2b729a72af46265ea2a15b15e708' },
      { key: 'SMS_API_SECRET', value: '4bu6uRdNlUKq10ZI' },
      { key: 'SMS_SEND_URL', value: 'https://portal-otp.smsmkt.com/api/otp-send' },
      { key: 'SMS_VALIDATE_URL', value: 'https://portal-otp.smsmkt.com/api/otp-validate' },
      { key: 'SMS_PROJECT_KEY', value: 'mZP-------' },
      { key: 'SMS_OTP_MODE', value: 'TEST' },
    ];
    for (const setting of defaultSettings) {
      try {
        const exists = await this.systemSettingRepository.findOne({ where: { key: setting.key } });
        if (!exists) {
          await this.systemSettingRepository.save(this.systemSettingRepository.create(setting));
          console.log(`[BACKOFFICE SERVICE] Seeded default setting: ${setting.key}=${setting.value}`);
        }
      } catch (err) {
        console.warn(`[BACKOFFICE SERVICE] Failed to seed setting: ${setting.key}`, err.message);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Settings Management
  // -------------------------------------------------------------------------
  async getSystemSettings(): Promise<Record<string, { value: string; updatedAt: Date }>> {
    const list = await this.systemSettingRepository.find();
    const result: Record<string, { value: string; updatedAt: Date }> = {};
    for (const item of list) {
      result[item.key] = { value: item.value, updatedAt: item.updatedAt };
    }
    // Fallbacks
    const now = new Date();
    if (!result['QR_CODE_MODE']) result['QR_CODE_MODE'] = { value: 'STATIC', updatedAt: now };
    if (!result['VERIFICATION_MODE']) result['VERIFICATION_MODE'] = { value: 'OTP', updatedAt: now };
    return result;
  }

  async updateSystemSetting(key: string, value: string): Promise<void> {
    let setting = await this.systemSettingRepository.findOne({ where: { key } });
    if (!setting) {
      setting = this.systemSettingRepository.create({ key, value });
    } else {
      setting.value = value;
    }
    await this.systemSettingRepository.save(setting);
  }

  async getSettingValue(key: string, defaultValue: string): Promise<string> {
    const setting = await this.systemSettingRepository.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
  }

  // -------------------------------------------------------------------------
  // AES-128-CBC Encrypt → Base64URL
  // -------------------------------------------------------------------------
  encryptToToken(docNum: string, seqStr: string): string {
    const rawData = `${docNum}:${seqStr}`;
    const cipher = crypto.createCipheriv('aes-128-cbc', SECRET_KEY, IV);
    let encrypted = cipher.update(rawData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    // Convert to Base64URL (URL-safe)
    return encrypted
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // -------------------------------------------------------------------------
  // AES-128-CBC Decrypt ← Base64URL  (ใช้ฝั่ง Registration)
  // -------------------------------------------------------------------------
  decryptToken(token: string): { docNum: string; seqNum: string } | null {
    try {
      // Restore Base64URL → standard Base64
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const decipher = crypto.createDecipheriv('aes-128-cbc', SECRET_KEY, IV);
      let decrypted = decipher.update(base64, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      const parts = decrypted.split(':');
      if (parts.length === 2) {
        return { docNum: parts[0], seqNum: parts[1] };
      }
      return null;
    } catch {
      return null; // Token ปลอม หรือถูกแก้ไข
    }
  }

  // -------------------------------------------------------------------------
  // Get Next Sequence สำหรับ DocNum
  // -------------------------------------------------------------------------
  async getNextSequence(docNum: string): Promise<number> {
    const logs = await this.logRepository.find({ where: { docNum } });
    if (logs.length === 0) {
      return 1;
    }
    let maxSeq = 0;
    for (const log of logs) {
      const endSeq = log.startSeq + log.quantity - 1;
      if (endSeq > maxSeq) {
        maxSeq = endSeq;
      }
    }
    return maxSeq + 1;
  }

  // -------------------------------------------------------------------------
  // Generate Batch — สร้างรายการ Token + บันทึก Log
  // -------------------------------------------------------------------------
  async generateBatch(
    actor: string,
    docNum: string,
    startSeq: number,
    quantity: number,
    ipAddress: string,
    previewOnly = false,
  ): Promise<GeneratedRow[]> {
    // Validate inputs
    if (!docNum || !/^\d{9}$/.test(docNum)) {
      throw new BadRequestException('DocNum ต้องเป็นตัวเลข 9 หลัก เช่น 260600007');
    }
    if (quantity < 1 || quantity > 500) {
      throw new BadRequestException('จำนวน QR ต้องอยู่ระหว่าง 1 ถึง 500');
    }

    const requestedEndSeq = startSeq + quantity - 1;

    // Check overlaps (ทับซ้อนกับประวัติการสร้างของ DocNum นี้ที่มีอยู่ก่อนหน้า)
    const overlaps = await this.logRepository
      .createQueryBuilder('log')
      .where('log.docNum = :docNum', { docNum })
      .andWhere(
        '(log.startSeq <= :requestedEndSeq AND (log.startSeq + log.quantity - 1) >= :startSeq)',
        { requestedEndSeq, startSeq }
      )
      .getMany();

    if (overlaps.length > 0) {
      // Trigger Telegram Alert
      const timeStr = formatThaiDateTime(new Date());
      const alertMsg = [
        `🔳 <b>[ProRegis]</b> · ${timeStr}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `⚠️ <b>ตรวจพบการพยายามสร้าง QR Code ซ้ำซ้อน!</b>\n`,
        `👤 <b>ผู้ส่งคำขอ:</b> <code>${actor}</code>`,
        `📦 <b>Production Order (PD):</b> <code>${docNum}</code>`,
        `🔢 <b>ช่วงรหัสที่ขอ:</b> <code>${startSeq}</code> ถึง <code>${requestedEndSeq}</code> (จำนวน: ${quantity})`,
        `🖥️ <b>IP Address:</b> <code>${ipAddress}</code>`,
        `❌ <b>ผลลัพธ์:</b> <i>ถูกระงับเนื่องจากลำดับตัวเลขนี้เคยถูกสร้างคิวอาร์โค้ดแล้วในระบบ</i>`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `🔍 <i>โปรดตรวจสอบช่วง Running Number ของ Production Order ดังกล่าว</i>`
      ].join('\n');

      this.telegramService.sendMessage(alertMsg).catch((err) => {
        console.error('[TELEGRAM ALERT ERROR] Failed to send duplicate QR warning Telegram:', err);
      });

      const nextSeq = await this.getNextSequence(docNum);
      throw new BadRequestException(
        `ช่วง Running Number ${startSeq} ถึง ${requestedEndSeq} มีบางส่วนซ้ำซ้อนหรือเหลื่อมกับรหัส QR ที่สร้างไว้แล้วในระบบ (Running ล่าสุดคือ ${nextSeq - 1}, แนะนำให้สร้างต่อที่ลำดับที่ ${nextSeq})`
      );
    }

    // Fetch production order from SAP Service Layer eagerly
    const bypassValidation = this.configService.get<string>('SAP_BYPASS_VALIDATION', 'false') === 'true';
    let poInfo: SapProductionOrderInfo | null = null;
    try {
      poInfo = await this.sapService.getProductionOrder(docNum);
    } catch (err) {
      console.error('[SAP ERROR] Failed to fetch production order:', err);
    }

    if (!poInfo) {
      if (bypassValidation) {
        // Fallback for Local / development mode
        const defaultSuffix = docNum.substring(5, 9) || '205';
        poInfo = {
          itemCode: `FA00-D0112-200${defaultSuffix}`,
          itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9) || '007'} (Mock SAP B1)`,
          plannedQty: 100,
          orderDate: '2026-06-01',
          startDate: '2026-06-05',
          status: 'bposReleased',
          completedQty: 10,
        };
        console.warn(`[SAP BYPASS] Production order ${docNum} not found in SAP B1. Bypassing validation in Local/Mock mode.`);
      } else {
        throw new BadRequestException(`ไม่พบเลขที่สั่งผลิต (PD) ${docNum} นี้ในระบบ SAP B1`);
      }
    }

    const activePoInfo = poInfo!;

    // Check ItemCode prefix (Must start with FA or FU)
    const itemCodeUpper = (activePoInfo.itemCode || '').toUpperCase();
    if (!itemCodeUpper.startsWith('FA') && !itemCodeUpper.startsWith('FU')) {
      if (bypassValidation) {
        console.warn(`[SAP BYPASS] Item Code ${activePoInfo.itemCode} does not start with FA or FU. Bypassing in Local/Mock mode.`);
      } else {
        throw new BadRequestException(
          `รหัสสินค้า (Item Code) ของใบสั่งผลิตนี้คือ ${activePoInfo.itemCode} ซึ่งต้องขึ้นต้นด้วย FA หรือ FU เท่านั้น`
        );
      }
    }

    // Check if total requested QR quantity exceeds SAP Planned Quantity
    if (requestedEndSeq > activePoInfo.plannedQty) {
      if (bypassValidation) {
        console.warn(`[SAP BYPASS] Requested QR quantity end seq ${requestedEndSeq} exceeds planned quantity ${activePoInfo.plannedQty}. Bypassing in Local/Mock mode.`);
      } else {
        throw new BadRequestException(
          `จำนวน QR ที่ต้องการสร้าง เกินกว่าจำนวนที่ระบุในแผนการผลิตของ SAP B1 (แผนระบุสูงสุดได้คือ ${activePoInfo.plannedQty} ชิ้น, แต่ครั้งนี้ขอรันถึงลำดับที่ ${requestedEndSeq})`
        );
      }
    }

    // Cache production order details including new SAP columns
    let po = await this.productionOrderRepository.findOne({ where: { docNum } });
    if (!po) {
      po = this.productionOrderRepository.create({
        docNum,
        itemCode: activePoInfo.itemCode,
        itemName: activePoInfo.itemName,
        plannedQty: activePoInfo.plannedQty,
        orderDate: activePoInfo.orderDate || null,
        startDate: activePoInfo.startDate || null,
        status: activePoInfo.status || null,
        completedQty: activePoInfo.completedQty || 0,
      });
      await this.productionOrderRepository.save(po);
    } else {
      po.itemCode = activePoInfo.itemCode;
      po.itemName = activePoInfo.itemName;
      po.plannedQty = activePoInfo.plannedQty;
      po.orderDate = activePoInfo.orderDate || null;
      po.startDate = activePoInfo.startDate || null;
      po.status = activePoInfo.status || null;
      po.completedQty = activePoInfo.completedQty || 0;
      await this.productionOrderRepository.save(po);
    }

    // Cache product metadata and download image as Base64 eagerly
    try {
      await this.productsService.cacheProductMetadata(po.itemCode, po.itemName || 'สินค้าทั่วไป');
    } catch (err) {
      console.error('[CACHE ERROR] Failed to cache product metadata during QR generation:', err);
    }

    const rows: GeneratedRow[] = [];
    for (let i = 0; i < quantity; i++) {
      const seq = startSeq + i;
      const seqStr = String(seq).padStart(3, '0'); // Running 3 หลัก: 001, 002, ...
      const code = this.encryptToToken(docNum, seqStr);
      const pd = `${docNum}${seqStr}`; // เช่น 260600007001
      rows.push({ code, pd });
    }

    if (previewOnly) {
      return rows;
    }

    // บันทึก Audit Log
    const log = this.logRepository.create({
      username: actor,
      docNum,
      startSeq,
      quantity,
      ipAddress: ipAddress || null,
    });
    await this.logRepository.save(log);

    console.log(
      `[BACKOFFICE] ${actor} generated ${quantity} QR codes for DocNum ${docNum} (seq ${startSeq}–${startSeq + quantity - 1})`,
    );

    // ส่งแจ้งเตือนการสร้างคิวอาร์โค้ดกลุ่มใหม่ไปที่ Telegram Group
    const timeStr = formatThaiDateTime(new Date());
    const alertMsg = [
      `🔳 <b>[ProRegis]</b> · ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📦 <b>มีการสร้างรหัส QR Code Batch ใหม่! (New QR Batch)</b>\n`,
      `👤 <b>ผู้ดำเนินการ:</b> <code>${actor}</code>`,
      `📦 <b>Production Order (PD):</b> <code>${docNum}</code>`,
      `🔢 <b>จำนวน QR ที่สร้าง:</b> <code>${quantity}</code> ชิ้น`,
      `🔢 <b>ช่วงลำดับ (Sequence):</b> <code>${startSeq}</code> ถึง <code>${requestedEndSeq}</code>`,
      `🏷️ <b>รหัสสินค้า (SAP B1):</b> <code>${activePoInfo.itemCode}</code>`,
      `📋 <b>ชื่อสินค้า:</b> ${activePoInfo.itemName}`,
      `💻 <b>IP Address:</b> <code>${ipAddress}</code>`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔍 <i>ระบบบันทึกคิวอาร์โค้ดใหม่ลงฐานข้อมูลและสร้างไฟล์ดาวน์โหลดสำเร็จแล้ว</i>`
    ].join('\n');

    this.telegramService.sendMessage(alertMsg).catch((err) => {
      console.error('[TELEGRAM ALERT ERROR] Failed to send QR batch generation alert:', err);
    });

    return rows;
  }

  // -------------------------------------------------------------------------
  // Build CSV Content (UTF-8 + BOM)
  // -------------------------------------------------------------------------
  buildCsv(rows: GeneratedRow[]): string {
    const BOM = '\uFEFF'; // UTF-8 BOM — ให้ Excel เปิดภาษาไทยได้ถูกต้อง
    const header = 'Code,PD';
    const lines = rows.map((r) => `${r.code},${r.pd}`);
    return BOM + [header, ...lines].join('\r\n');
  }

  // -------------------------------------------------------------------------
  // Get Audit Logs (ล่าสุดก่อน)
  // -------------------------------------------------------------------------
  async getLogs(limit = 100): Promise<GenerationLog[]> {
    return this.logRepository.find({
      order: { generatedAt: 'DESC' },
      take: limit,
    });
  }

  async getAuthLogs(limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { resource: 'Auth' },
      order: { loggedAt: 'DESC' },
      take: limit,
    });
  }

  // -------------------------------------------------------------------------
  // Get Dashboard Summary
  // -------------------------------------------------------------------------
  async getDashboardSummary(startDate?: string, endDate?: string) {
    // 1. Total QR generated
    const genLogs = await this.logRepository.find();
    let totalGenerated = 0;
    for (const log of genLogs) {
      totalGenerated += log.quantity;
    }

    // 2. Registered query builder with date filter
    const regQuery = this.registrationRepository.createQueryBuilder('reg');
    if (startDate) {
      regQuery.andWhere('reg.registeredAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      regQuery.andWhere('reg.registeredAt <= :endDate', { endDate: new Date(endDate) });
    }

    const registrations = await regQuery.getMany();
    const totalRegistered = registrations.length;
    const registrationRate = totalGenerated > 0 ? (totalRegistered / totalGenerated) * 100 : 0;

    // 3. Geographic distribution (province stats)
    const provinceQuery = this.registrationRepository.createQueryBuilder('reg')
      .select('reg.province', 'province')
      .addSelect('COUNT(reg.id)', 'count')
      .groupBy('reg.province');
    if (startDate) {
      provinceQuery.andWhere('reg.registeredAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      provinceQuery.andWhere('reg.registeredAt <= :endDate', { endDate: new Date(endDate) });
    }
    const provincesRaw = await provinceQuery.getRawMany();
    const provinceMap = new Map<string, number>();
    for (const p of provincesRaw) {
      let name = (p.province || '').trim();
      const lowerName = name.toLowerCase();
      if (provinceMapping[lowerName]) {
        name = provinceMapping[lowerName];
      } else if (/^bangkok$/i.test(name)) {
        name = 'กรุงเทพมหานคร';
      }
      if (!name) {
        name = 'ไม่ระบุ';
      }
      const count = parseInt(p.count, 10) || 0;
      provinceMap.set(name, (provinceMap.get(name) || 0) + count);
    }
    const provinceStats = Array.from(provinceMap.entries()).map(([province, count]) => ({
      province,
      count,
    })).sort((a, b) => b.count - a.count);

    // 4. Map markers (all registrations that have coordinates)
    const markerQuery = this.registrationRepository.createQueryBuilder('reg')
      .select(['reg.id', 'reg.province', 'reg.latitude', 'reg.longitude', 'reg.registeredAt'])
      .where('reg.latitude IS NOT NULL AND reg.longitude IS NOT NULL');
    if (startDate) {
      markerQuery.andWhere('reg.registeredAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      markerQuery.andWhere('reg.registeredAt <= :endDate', { endDate: new Date(endDate) });
    }
    const markers = await markerQuery.getMany();
    for (const m of markers) {
      if (m.province) {
        const cleanName = m.province.trim().toLowerCase();
        if (provinceMapping[cleanName]) {
          m.province = provinceMapping[cleanName];
        } else if (/^bangkok$/i.test(cleanName)) {
          m.province = 'กรุงเทพมหานคร';
        }
      }
    }

    // 5. Product registrations grouped by ItemCode (joining with ProductionOrder)
    const productQuery = this.registrationRepository.createQueryBuilder('reg')
      .innerJoin(ProductionOrder, 'po', 'reg.docNum = po.docNum')
      .select('po.itemCode', 'itemCode')
      .addSelect('po.itemName', 'itemName')
      .addSelect('COUNT(reg.id)', 'count')
      .groupBy('po.itemCode')
      .addGroupBy('po.itemName');
    if (startDate) {
      productQuery.andWhere('reg.registeredAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      productQuery.andWhere('reg.registeredAt <= :endDate', { endDate: new Date(endDate) });
    }
    const productsRaw = await productQuery.getRawMany();
    const productStats = productsRaw.map(p => ({
      itemCode: p.itemCode,
      itemName: p.itemName || 'สินค้าทั่วไป',
      count: parseInt(p.count, 10),
    }));

    // 6. Registration timeline (last 30 days or filtered)
    // Note: To make date grouping simple and database-agnostic (using standard Postgres TO_CHAR)
    const timelineQuery = this.registrationRepository.createQueryBuilder('reg')
      .select("TO_CHAR(reg.registeredAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(reg.id)', 'count')
      .groupBy("TO_CHAR(reg.registeredAt, 'YYYY-MM-DD')")
      .orderBy("date", "ASC");
    if (startDate) {
      timelineQuery.andWhere('reg.registeredAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      timelineQuery.andWhere('reg.registeredAt <= :endDate', { endDate: new Date(endDate) });
    }
    const timelineRaw = await timelineQuery.getRawMany();
    const timelineStats = timelineRaw.map(t => ({
      date: t.date,
      count: parseInt(t.count, 10),
    }));

    // =========================================================================
    // Category A: CRM & Technician New Statistics
    // =========================================================================
    
    // A1. Installation Position Distribution
    const installRaw = await this.registrationRepository.createQueryBuilder('reg')
      .select('reg.installationPosition', 'position')
      .addSelect('COUNT(reg.id)', 'count')
      .groupBy('reg.installationPosition')
      .getRawMany();
    const installationPositionStats = installRaw.map(r => ({
      label: r.position || 'ไม่ระบุ',
      count: parseInt(r.count, 10) || 0,
    }));

    // A2. Marketing Consent Analysis (optionalConsent)
    const consentRaw = await this.registrationRepository.createQueryBuilder('reg')
      .select('reg.optionalConsent', 'optionalConsent')
      .addSelect('COUNT(reg.id)', 'count')
      .groupBy('reg.optionalConsent')
      .getRawMany();
    let optIn = 0;
    let optOut = 0;
    for (const c of consentRaw) {
      const count = parseInt(c.count, 10) || 0;
      if (c.optionalConsent === true || c.optionalConsent === 'true' || c.optionalConsent === 1 || c.optionalConsent === '1') {
        optIn += count;
      } else {
        optOut += count;
      }
    }
    const consentStats = { optIn, optOut };

    // A3. Purchase / Registration Size per Phone
    const purchaseRaw = await this.registrationRepository.createQueryBuilder('reg')
      .select('reg.phone', 'phone')
      .addSelect('COUNT(reg.id)', 'count')
      .groupBy('reg.phone')
      .getRawMany();
    let size1 = 0;
    let size2_3 = 0;
    let size4_6 = 0;
    let size7plus = 0;
    for (const p of purchaseRaw) {
      const count = parseInt(p.count, 10) || 0;
      if (count === 1) size1++;
      else if (count <= 3) size2_3++;
      else if (count <= 6) size4_6++;
      else size7plus++;
    }
    const purchaseSizeStats = { size1, size2_3, size4_6, size7plus };

    // A4. Inventory Lag / Days to Register & A5. Month of Production of Registered items
    const regWithPoQuery = this.registrationRepository.createQueryBuilder('reg')
      .innerJoin(ProductionOrder, 'po', 'reg.docNum = po.docNum')
      .select('reg.registeredAt', 'registeredAt')
      .addSelect('po.orderDate', 'orderDate')
      .addSelect('po.startDate', 'startDate');
    if (startDate) {
      regWithPoQuery.andWhere('reg.registeredAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      regWithPoQuery.andWhere('reg.registeredAt <= :endDate', { endDate: new Date(endDate) });
    }
    const regWithPo = await regWithPoQuery.getRawMany();

    let lagUnder30 = 0;
    let lag30to90 = 0;
    let lag90to180 = 0;
    let lagOver180 = 0;
    const prodMonthCounts: Record<string, number> = {};

    for (const row of regWithPo) {
      const regDate = new Date(row.registeredAt);
      const prodDateStr = row.orderDate || row.startDate;
      if (prodDateStr) {
        const prodDate = new Date(prodDateStr);
        if (!isNaN(prodDate.getTime())) {
          const diffTime = Math.abs(regDate.getTime() - prodDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 30) lagUnder30++;
          else if (diffDays <= 90) lag30to90++;
          else if (diffDays <= 180) lag90to180++;
          else lagOver180++;

          const monthKey = prodDate.toISOString().substring(0, 7); // "YYYY-MM"
          prodMonthCounts[monthKey] = (prodMonthCounts[monthKey] || 0) + 1;
        }
      }
    }
    const lagTimeStats = {
      under30: lagUnder30,
      thirtyToNinety: lag30to90,
      ninetyToOneEighty: lag90to180,
      overOneEighty: lagOver180,
    };
    const productionMonthStats = Object.entries(prodMonthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // =========================================================================
    // Category B: Technical & System Admin New Statistics
    // =========================================================================

    // B1. API usage - grouped audit log counts
    const auditLogsQuery = this.auditLogRepository.createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(log.id)', 'count')
      .groupBy('log.action');
    if (startDate) {
      auditLogsQuery.andWhere('log.loggedAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      auditLogsQuery.andWhere('log.loggedAt <= :endDate', { endDate: new Date(endDate) });
    }
    const auditRaw = await auditLogsQuery.getRawMany();
    const apiUsageStats = auditRaw.map(a => ({
      action: a.action,
      count: parseInt(a.count, 10) || 0,
    }));

    // B2. DB Cache Hits vs SAP Fallbacks
    const dbHitsQuery = this.auditLogRepository.createQueryBuilder('log')
      .where('log.action = :action', { action: 'DB_CACHE_HIT' });
    const sapSuccessQuery = this.auditLogRepository.createQueryBuilder('log')
      .where('log.action = :action', { action: 'SAP_FETCH_SUCCESS' });
    const sapErrorQuery = this.auditLogRepository.createQueryBuilder('log')
      .where('log.action = :action', { action: 'SAP_FETCH_ERROR' });
    if (startDate) {
      dbHitsQuery.andWhere('log.loggedAt >= :startDate', { startDate: new Date(startDate) });
      sapSuccessQuery.andWhere('log.loggedAt >= :startDate', { startDate: new Date(startDate) });
      sapErrorQuery.andWhere('log.loggedAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      dbHitsQuery.andWhere('log.loggedAt <= :endDate', { endDate: new Date(endDate) });
      sapSuccessQuery.andWhere('log.loggedAt <= :endDate', { endDate: new Date(endDate) });
      sapErrorQuery.andWhere('log.loggedAt <= :endDate', { endDate: new Date(endDate) });
    }
    const dbCacheHits = await dbHitsQuery.getCount();
    const sapSuccesses = await sapSuccessQuery.getCount();
    const sapErrors = await sapErrorQuery.getCount();
    const sapFallbackStats = { dbCacheHits, sapSuccesses, sapErrors };

    // B3. Transactions & Errors list
    const errorsQuery = this.auditLogRepository.createQueryBuilder('log')
      .select(['log.id', 'log.action', 'log.details', 'log.loggedAt'])
      .where("log.action = 'ERROR' OR log.action = 'SAP_FETCH_ERROR' OR log.action = 'SAP_FETCH_SUCCESS'")
      .orderBy('log.loggedAt', 'DESC')
      .limit(10);
    const errorsRaw = await errorsQuery.getMany();
    const errorStats = errorsRaw.map(e => ({
      message: e.details || (e.action === 'SAP_FETCH_SUCCESS' ? 'ดึงข้อมูลใบสั่งผลิตจาก SAP สำเร็จ' : 'ข้อผิดพลาดเครือข่าย/บริการหลังบ้าน'),
      action: e.action,
      time: e.loggedAt.toISOString(),
    }));

    // B4. SMS OTP Requests vs Verifications
    const otpReqQuery = this.auditLogRepository.createQueryBuilder('log')
      .where('log.action = :action', { action: 'OTP_REQUEST' });
    const otpVerifyQuery = this.auditLogRepository.createQueryBuilder('log')
      .where('log.action = :action', { action: 'OTP_VERIFY_SUCCESS' });
    if (startDate) {
      otpReqQuery.andWhere('log.loggedAt >= :startDate', { startDate: new Date(startDate) });
      otpVerifyQuery.andWhere('log.loggedAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      otpReqQuery.andWhere('log.loggedAt <= :endDate', { endDate: new Date(endDate) });
      otpVerifyQuery.andWhere('log.loggedAt <= :endDate', { endDate: new Date(endDate) });
    }
    const otpRequests = await otpReqQuery.getCount();
    const otpVerifications = await otpVerifyQuery.getCount();
    const smsOtpStats = { otpRequests, otpVerifications };

    // B5. Database volumes
    const totalRegCount = await this.registrationRepository.count();
    const totalLogCount = await this.auditLogRepository.count();
    const totalPoCount = await this.productionOrderRepository.count();
    const dbVolumeStats = {
      registrations: totalRegCount,
      auditLogs: totalLogCount,
      productionOrders: totalPoCount,
    };

    return {
      totalGenerated,
      totalRegistered,
      registrationRate,
      provinceStats,
      markers,
      productStats,
      timelineStats,
      // Category A New Stats
      installationPositionStats,
      consentStats,
      purchaseSizeStats,
      lagTimeStats,
      productionMonthStats,
      // Category B New Stats
      apiUsageStats,
      sapFallbackStats,
      errorStats,
      smsOtpStats,
      dbVolumeStats,
    };
  }

  // -------------------------------------------------------------------------
  // Get Production Tracker List
  // -------------------------------------------------------------------------
  async getProductionTrackerList(mode?: 'STATIC' | 'DYNAMIC') {
    const productionOrders = await this.productionOrderRepository.find({
      order: { createdAt: 'DESC' },
    });
    
    const trackerList: any[] = [];
    
    for (const po of productionOrders) {
      const docNum = po.docNum;
      
      const genLogs = await this.logRepository.find({
        where: { docNum },
        order: { generatedAt: 'ASC' },
      });
      
      const hasLogs = genLogs.length > 0;
      
      // Filter based on mode parameter
      if (mode === 'DYNAMIC' && !hasLogs) {
        continue;
      }
      if (mode === 'STATIC' && hasLogs) {
        continue;
      }
      
      const registeredCount = await this.registrationRepository.count({ where: { docNum } });
      
      if (hasLogs) {
        const requestCount = genLogs.length;
        const latestLog = genLogs[genLogs.length - 1];
        
        const historyLogs = genLogs.slice(0, genLogs.length - 1).map((log, index) => ({
          attemptNumber: index + 1,
          generatedAt: log.generatedAt,
          username: log.username,
          quantity: log.quantity,
        }));
        
        trackerList.push({
          type: 'DYNAMIC',
          docNum,
          itemCode: po.itemCode,
          itemName: po.itemName,
          requestCount,
          latestRequestDate: latestLog.generatedAt,
          latestRequestUser: latestLog.username,
          latestRequestQty: latestLog.quantity,
          history: historyLogs,
          registeredCount,
          plannedQty: po.plannedQty,
          completedQty: po.completedQty,
          orderDate: po.orderDate,
          startDate: po.startDate,
          status: po.status,
          createdAt: po.createdAt,
        });
      } else {
        // Static PO (no logs)
        trackerList.push({
          type: 'STATIC',
          docNum,
          itemCode: po.itemCode,
          itemName: po.itemName,
          requestCount: 0,
          latestRequestDate: po.createdAt ? po.createdAt.toISOString() : new Date().toISOString(),
          latestRequestUser: 'System (Scan)',
          latestRequestQty: 0,
          history: [],
          registeredCount,
          plannedQty: po.plannedQty,
          completedQty: po.completedQty,
          orderDate: po.orderDate,
          startDate: po.startDate,
          status: po.status,
          createdAt: po.createdAt,
        });
      }
    }
    
    // Sort tracker list by latest request date descending
    trackerList.sort(
      (a, b) => new Date(b.latestRequestDate).getTime() - new Date(a.latestRequestDate).getTime(),
    );
    
    return trackerList;
  }

  // -------------------------------------------------------------------------
  // Check Product (for Scan QR and Label input)
  // -------------------------------------------------------------------------
  async checkProduct(token?: string, label?: string, registrationId?: string) {
    let docNum: string | null = null;
    let seqNum: string | null = null;
    let registration: Registration | null = null;

    if (registrationId) {
      registration = await this.registrationRepository.findOne({
        where: { id: registrationId }
      });
      if (registration) {
        docNum = registration.docNum;
        seqNum = registration.seqNum;
      }
    } else {
      if (token) {
        const decoded = this.decryptToken(token);
        if (decoded) {
          docNum = decoded.docNum;
          seqNum = decoded.seqNum;
        } else {
          const cleanToken = token.trim();
          if (cleanToken.length === 12 && /^\d+$/.test(cleanToken)) {
            docNum = cleanToken.substring(0, 9);
            seqNum = cleanToken.substring(9, 12);
          } else if (cleanToken.length === 9 && /^\d+$/.test(cleanToken)) {
            docNum = cleanToken;
            seqNum = null;
          } else {
            throw new BadRequestException('รหัส Token ไม่ถูกต้องหรือไม่สามารถถอดรหัสได้');
          }
        }
      } else if (label) {
        const cleanLabel = label.trim().replace(/[-]/g, '');
        if (cleanLabel.length === 12 && /^\d+$/.test(cleanLabel)) {
          docNum = cleanLabel.substring(0, 9);
          seqNum = cleanLabel.substring(9, 12);
        } else if (cleanLabel.length === 9 && /^\d+$/.test(cleanLabel)) {
          docNum = cleanLabel;
          seqNum = null;
        } else {
          throw new BadRequestException('รหัสสินค้าต้องเป็นตัวเลข 9 หลัก หรือ 12 หลัก');
        }
      } else {
        throw new BadRequestException('กรุณาระบุ Token หรือรหัส Label ของสินค้า');
      }

      // Get registration if exists
      registration = await this.registrationRepository.findOne({
        where: { 
          docNum: docNum || '', 
          seqNum: seqNum ? seqNum : IsNull()
        },
        order: { registeredAt: 'DESC' }
      });
    }

    // Get production order (cache-aside)
    let itemCode = 'ไม่พบรหัสสินค้า';
    let itemName = 'ไม่พบชื่อสินค้า';
    let plannedQty = 0;

    if (docNum) {
      try {
        let po = await this.productionOrderRepository.findOne({ where: { docNum } });
        if (po) {
          // Log DB Cache Hit
          await this.auditLogRepository.save(this.auditLogRepository.create({
            actorUsername: 'SUPPORT',
            action: 'DB_CACHE_HIT',
            resource: 'ProductionOrder',
            resourceId: docNum,
          })).catch(() => {});
        } else {
          const sapInfo = await this.sapService.getProductionOrder(docNum);
          if (sapInfo) {
            po = this.productionOrderRepository.create({
              docNum,
              itemCode: sapInfo.itemCode,
              itemName: sapInfo.itemName,
              plannedQty: sapInfo.plannedQty,
              orderDate: sapInfo.orderDate || null,
              startDate: sapInfo.startDate || null,
              status: sapInfo.status || null,
              completedQty: sapInfo.completedQty || 0,
            });
            await this.productionOrderRepository.save(po);
            
            // Log SAP Fetch Success
            await this.auditLogRepository.save(this.auditLogRepository.create({
              actorUsername: 'SUPPORT',
              action: 'SAP_FETCH_SUCCESS',
              resource: 'ProductionOrder',
              resourceId: docNum,
              details: JSON.stringify({ reason: 'support_lookup' }),
            })).catch(() => {});
          } else {
            if (this.sapService.getIsMockMode()) {
              const defaultSuffix = docNum.substring(5, 9) || '205';
              po = this.productionOrderRepository.create({
                docNum,
                itemCode: `FA00-D0112-200${defaultSuffix}`,
                itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9) || '007'} (Mock SAP B1)`,
                plannedQty: 100,
                completedQty: 0,
              });
              await this.productionOrderRepository.save(po);

              // Log SAP Fetch Success (Mock)
              await this.auditLogRepository.save(this.auditLogRepository.create({
                actorUsername: 'SUPPORT',
                action: 'SAP_FETCH_SUCCESS',
                resource: 'ProductionOrder',
                resourceId: docNum,
                details: JSON.stringify({ reason: 'mock_support_lookup' }),
              })).catch(() => {});
            } else {
              throw new BadRequestException(`ไม่พบเลขที่สั่งผลิต (PD) ${docNum} นี้ในระบบ SAP B1`);
            }
          }
        }
        itemCode = po.itemCode;
        itemName = po.itemName || 'สินค้าทั่วไป';
        plannedQty = po.plannedQty;
      } catch (err) {
        console.error('[SAP ERROR] Failed to fetch product details in checkProduct:', err);
        const detailMsg = err.response?.data?.error?.message?.value || err.message;
        
        // Log SAP Fetch Error
        await this.auditLogRepository.save(this.auditLogRepository.create({
          actorUsername: 'SUPPORT',
          action: 'SAP_FETCH_ERROR',
          resource: 'ProductionOrder',
          resourceId: docNum,
          details: JSON.stringify({ error: detailMsg }),
        })).catch(() => {});

        throw new BadRequestException(`ข้อผิดพลาดจาก SAP B1: ${detailMsg}`);
      }
    }

    let imageBase64: string | null = null;
    if (itemCode && itemCode !== 'ไม่พบรหัสสินค้า') {
      try {
        const metadata = await this.productsService.cacheProductMetadata(itemCode, itemName);
        let resolvedImage = metadata ? metadata.imageBase64 : null;
        if (!resolvedImage || resolvedImage.startsWith('http')) {
          if (itemCode.includes('-')) {
            const parts = itemCode.split('-');
            const prefix = parts.slice(0, parts.length - 1).join('-');
            const prefixMeta = await this.productsService['productMetadataRepository'].findOne({ where: { itemCode: prefix } });
            if (prefixMeta && prefixMeta.imageBase64 && !prefixMeta.imageBase64.startsWith('http')) {
              resolvedImage = prefixMeta.imageBase64;
            }
          }
        }
        imageBase64 = resolvedImage;
      } catch (err) {
        console.error('Failed to get metadata image in checkProduct', err);
      }
    }

    return {
      registered: !!registration,
      docNum,
      seqNum,
      registration: registration || null,
      product: {
        itemCode,
        itemName,
        plannedQty,
        imageBase64,
      }
    };
  }

  // -------------------------------------------------------------------------
  // Get Lot Summary (Web only - list all seqNum items and registration details)
  // -------------------------------------------------------------------------
  async getLotSummary(docNum: string) {
    if (!docNum || !/^\d{9}$/.test(docNum)) {
      throw new BadRequestException('DocNum ต้องเป็นตัวเลข 9 หลัก');
    }

    // Fetch PO details (cache-aside)
    let po = await this.productionOrderRepository.findOne({ where: { docNum } });
    if (!po) {
      try {
        const sapInfo = await this.sapService.getProductionOrder(docNum);
        if (sapInfo) {
          po = this.productionOrderRepository.create({
            docNum,
            itemCode: sapInfo.itemCode,
            itemName: sapInfo.itemName,
            plannedQty: sapInfo.plannedQty,
            orderDate: sapInfo.orderDate || null,
            startDate: sapInfo.startDate || null,
            status: sapInfo.status || null,
            completedQty: sapInfo.completedQty || 0,
          });
          await this.productionOrderRepository.save(po);
          try {
            await this.productsService.cacheProductMetadata(po.itemCode, po.itemName || 'สินค้าทั่วไป');
          } catch (cacheErr) {
            this.logger.error(`[BACKOFFICE SERVICE] Failed to cache metadata in getLotSummary (SAP): ${cacheErr.message}`);
          }
        } else {
          if (this.sapService.getIsMockMode()) {
            po = this.productionOrderRepository.create({
              docNum,
              itemCode: `FA00-D0112-200${docNum.substring(5, 9)}`,
              itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9)}`,
              plannedQty: 100,
              completedQty: 0,
            });
            await this.productionOrderRepository.save(po);
            try {
              await this.productsService.cacheProductMetadata(po.itemCode, po.itemName || 'สินค้าทั่วไป');
            } catch (cacheErr) {
              this.logger.error(`[BACKOFFICE SERVICE] Failed to cache metadata in getLotSummary (Mock): ${cacheErr.message}`);
            }
          } else {
            throw new BadRequestException(`ไม่พบเลขที่สั่งผลิต (PD) ${docNum} นี้ในระบบ SAP B1`);
          }
        }
      } catch (err) {
        console.error('[SAP ERROR] Failed to fetch product details in getLotSummary:', err);
        if (this.sapService.getIsMockMode()) {
          // default PO details for mock mode fallback
          po = this.productionOrderRepository.create({
            docNum,
            itemCode: `FA00-D0112-200${docNum.substring(5, 9)}`,
            itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9)}`,
            plannedQty: 100,
          });
        } else {
          const detailMsg = err.response?.data?.error?.message?.value || err.message;
          throw new BadRequestException(`ข้อผิดพลาดจาก SAP B1: ${detailMsg}`);
        }
      }
    }

    const totalQty = po.plannedQty || 100;

    // Get all registrations in this lot
    const registrations = await this.registrationRepository.find({
      where: { docNum }
    });

    const qrModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'QR_CODE_MODE' } });
    const qrMode = qrModeSetting ? qrModeSetting.value : 'STATIC';

    const items: any[] = [];
    let registeredCount = registrations.length;

    if (qrMode === 'DYNAMIC') {
      const regMap = new Map<string, Registration>();
      for (const r of registrations) {
        if (r.seqNum) {
          regMap.set(String(parseInt(r.seqNum, 10)), r);
        }
      }
      registeredCount = 0;
      for (let i = 1; i <= totalQty; i++) {
        const seqStr = String(i).padStart(3, '0');
        const reg = regMap.get(String(i));

        if (reg) {
          registeredCount++;
          items.push({
            seqNum: seqStr,
            registered: true,
            registeredBy: `${reg.firstName} ${reg.lastName}`,
            registeredAt: reg.registeredAt,
            province: reg.province,
            phone: reg.phone,
            registrationId: reg.id,
          });
        } else {
          items.push({
            seqNum: seqStr,
            registered: false,
          });
        }
      }
    } else {
      // STATIC Mode: list all registrations sequentially, then pad with empty items up to totalQty
      registrations.sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime());
      
      const limit = Math.max(totalQty, registrations.length);
      for (let i = 1; i <= limit; i++) {
        const seqStr = String(i).padStart(3, '0');
        const reg = registrations[i - 1];

        if (reg) {
          items.push({
            seqNum: seqStr,
            registered: true,
            registeredBy: `${reg.firstName} ${reg.lastName}`,
            registeredAt: reg.registeredAt,
            province: reg.province,
            phone: reg.phone,
            registrationId: reg.id,
          });
        } else {
          items.push({
            seqNum: seqStr,
            registered: false,
          });
        }
      }
    }

    return {
      docNum,
      itemCode: po.itemCode,
      itemName: po.itemName,
      totalQty,
      registeredCount,
      unregisteredCount: Math.max(0, totalQty - registeredCount),
      items,
    };
  }

  async uploadProductImage(itemCode: string, imageBase64: string) {
    let targetCode = itemCode.trim();
    if (targetCode.includes('-')) {
      const parts = targetCode.split('-');
      if (parts.length >= 3) {
        targetCode = parts.slice(0, parts.length - 1).join('-');
      }
    }
    return this.productsService.uploadProductImage(targetCode, imageBase64);
  }

  async getCustomImages() {
    // Senior Developer Auto-Sync:
    // Ensure all model prefixes present in production orders have corresponding metadata placeholders
    try {
      const poList = await this.productionOrderRepository
        .createQueryBuilder('po')
        .select('DISTINCT po.itemCode', 'itemCode')
        .addSelect('MAX(po.itemName)', 'itemName')
        .groupBy('po.itemCode')
        .getRawMany();

      for (const poRow of poList) {
        const itemCode = poRow.itemCode;
        const itemName = poRow.itemName || 'สินค้าทั่วไป';
        if (itemCode && itemCode.includes('-')) {
          const parts = itemCode.split('-');
          if (parts.length >= 3) {
            const prefix = parts.slice(0, 2).join('-');
            let prefixMeta = await this.productsService['productMetadataRepository'].findOne({ where: { itemCode: prefix } });
            if (!prefixMeta) {
              prefixMeta = this.productsService['productMetadataRepository'].create({
                itemCode: prefix,
                itemName: `กลุ่มสินค้าโมเดล ${prefix}`,
                imageBase64: null,
              });
              await this.productsService['productMetadataRepository'].save(prefixMeta);
              this.logger.log(`[BACKOFFICE SERVICE] Auto-synced and created missing prefix group metadata in getCustomImages: ${prefix}`);
            }
          }
        }
      }
    } catch (syncErr) {
      this.logger.error(`[BACKOFFICE SERVICE] Failed to auto-sync metadata prefixes in getCustomImages: ${syncErr.message}`);
    }

    const metas = await this.productsService['productMetadataRepository']
      .createQueryBuilder('meta')
      .orderBy('meta.itemCode', 'ASC')
      .getMany();

    const results: any[] = [];
    for (const meta of metas) {
      const parts = meta.itemCode.split('-');
      if (parts.length >= 3) {
        continue;
      }

      const qb = this.registrationRepository
        .createQueryBuilder('reg')
        .innerJoin(ProductionOrder, 'po', 'po.docNum = reg.docNum')
        .where('po.itemCode = :itemCode OR po.itemCode LIKE :prefix', {
          itemCode: meta.itemCode,
          prefix: `${meta.itemCode}-%`
        });
      const count = await qb.getCount();

      const distinctItemCodes = await this.registrationRepository
        .createQueryBuilder('reg')
        .innerJoin(ProductionOrder, 'po', 'po.docNum = reg.docNum')
        .select('DISTINCT po.itemCode', 'itemCode')
        .where('po.itemCode = :itemCode OR po.itemCode LIKE :prefix', {
          itemCode: meta.itemCode,
          prefix: `${meta.itemCode}-%`
        })
        .getRawMany();
      const itemCodeCount = distinctItemCodes.length;

      results.push({
        itemCode: meta.itemCode,
        itemName: meta.itemName,
        imageBase64: meta.imageBase64,
        createdAt: meta.createdAt,
        registrationCount: count,
        itemCodeCount: itemCodeCount,
      });
    }
    return results;
  }

  async deleteProductImage(itemCode: string) {
    const metadata = await this.productsService['productMetadataRepository'].findOne({ where: { itemCode } });
    if (metadata) {
      await this.productsService['productMetadataRepository'].remove(metadata);
    }
    return { success: true };
  }

  async clearTestData(tables?: string[]) {
    const allowedTables = ['registrations', 'generation_logs', 'production_orders', 'audit_logs'];
    let tablesToClear = allowedTables;

    if (tables && tables.length > 0) {
      tablesToClear = tables.filter((t) => allowedTables.includes(t));
    }

    if (tablesToClear.length === 0) {
      return;
    }

    const tableList = tablesToClear.join(', ');
    await this.registrationRepository.manager.query(
      `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`,
    );
  }
}
