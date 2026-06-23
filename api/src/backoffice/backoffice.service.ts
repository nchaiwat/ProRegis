import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerationLog } from './generation-log.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { Registration } from '../registration/registration.entity';
import { TelegramService } from '../telegram/telegram.service';
import { SapService } from '../sap/sap.service';
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

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
export interface GeneratedRow {
  code: string;      // AES-128-CBC + Base64URL ของ "docNum:seqStr"
  pd: string;        // docNum + seqStr ต่อกัน เช่น 260600007001
}

@Injectable()
export class BackofficeService {
  constructor(
    @InjectRepository(GenerationLog)
    private readonly logRepository: Repository<GenerationLog>,
    @InjectRepository(ProductionOrder)
    private readonly productionOrderRepository: Repository<ProductionOrder>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    private readonly telegramService: TelegramService,
    private readonly sapService: SapService,
  ) {}

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
      const timeStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      const alertMsg = `
<b>⚠️ [WARNING] ตรวจพบการพยายามสร้าง QR Code ซ้ำซ้อน!</b>
━━━━━━━━━━━━━━━━━━━━━━━━
👤 <b>ผู้ใช้ที่ส่งคำขอ:</b> <code>${actor}</code>
📦 <b>Production Order (PD):</b> <code>${docNum}</code>
🔢 <b>Running ที่ขอ:</b> <code>${startSeq}</code> ถึง <code>${requestedEndSeq}</code> (จำนวน: ${quantity})
📅 <b>วันเวลาที่ส่งคำขอ:</b> ${timeStr}
🖥️ <b>IP Address:</b> <code>${ipAddress}</code>
❌ <b>ผลลัพธ์:</b> ถูกระงับการสร้างเนื่องจากช่วงตัวเลขทับซ้อนกับข้อมูลที่มีอยู่แล้ว
━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

      this.telegramService.sendMessage(alertMsg).catch((err) => {
        console.error('[TELEGRAM ALERT ERROR] Failed to send duplicate QR warning Telegram:', err);
      });

      const nextSeq = await this.getNextSequence(docNum);
      throw new BadRequestException(
        `ช่วง Running Number ${startSeq} ถึง ${requestedEndSeq} มีบางส่วนซ้ำซ้อนหรือเหลื่อมกับรหัส QR ที่สร้างไว้แล้วในระบบ (Running ล่าสุดคือ ${nextSeq - 1}, แนะนำให้สร้างต่อที่ลำดับที่ ${nextSeq})`
      );
    }

    const rows: GeneratedRow[] = [];
    for (let i = 0; i < quantity; i++) {
      const seq = startSeq + i;
      const seqStr = String(seq).padStart(3, '0'); // Running 3 หลัก: 001, 002, ...
      const code = this.encryptToToken(docNum, seqStr);
      const pd = `${docNum}${seqStr}`; // เช่น 260600007001
      rows.push({ code, pd });
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

    // Cache production order item code if not cached yet
    try {
      const existingPo = await this.productionOrderRepository.findOne({ where: { docNum } });
      if (!existingPo) {
        const mockItemCode = `FA00-D0112-200${docNum.substring(5, 9)}`;
        const mockItemName = `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9)}`;
        const cached = this.productionOrderRepository.create({
          docNum,
          itemCode: mockItemCode,
          itemName: mockItemName,
        });
        await this.productionOrderRepository.save(cached);
      }
    } catch (err) {
      console.error('[CACHE ERROR] Failed to cache production order during QR generation:', err);
    }

    console.log(
      `[BACKOFFICE] ${actor} generated ${quantity} QR codes for DocNum ${docNum} (seq ${startSeq}–${startSeq + quantity - 1})`,
    );

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
    const provinceStats = provincesRaw.map(p => ({
      province: p.province,
      count: parseInt(p.count, 10),
    }));

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

    return {
      totalGenerated,
      totalRegistered,
      registrationRate,
      provinceStats,
      markers,
      productStats,
      timelineStats,
    };
  }

  // -------------------------------------------------------------------------
  // Get Production Tracker List
  // -------------------------------------------------------------------------
  async getProductionTrackerList() {
    const productionOrders = await this.productionOrderRepository.find({
      order: { createdAt: 'DESC' },
    });
    
    const trackerList: any[] = [];
    
    for (const po of productionOrders) {
      const docNum = po.docNum;
      
      const genLogs = await this.logRepository.find({ where: { docNum } });
      const requestCount = genLogs.length;
      let totalQuantity = 0;
      const requestDates = genLogs.map(l => l.generatedAt);
      for (const log of genLogs) {
        totalQuantity += log.quantity;
      }
      
      const registeredCount = await this.registrationRepository.count({ where: { docNum } });
      
      trackerList.push({
        docNum,
        itemCode: po.itemCode,
        itemName: po.itemName,
        requestCount,
        requestDates,
        totalQuantity,
        registeredCount,
      });
    }
    
    return trackerList;
  }

  // -------------------------------------------------------------------------
  // Check Product (for Scan QR and Label input)
  // -------------------------------------------------------------------------
  async checkProduct(token?: string, label?: string) {
    let docNum: string | null = null;
    let seqNum: string | null = null;

    if (token) {
      const decoded = this.decryptToken(token);
      if (decoded) {
        docNum = decoded.docNum;
        seqNum = decoded.seqNum;
      } else {
        // Fallback if token is actually in "docNum:seqNum" or plain docNum+seqNum format
        if (token.length === 12 && /^\d+$/.test(token)) {
          docNum = token.substring(0, 9);
          seqNum = token.substring(9, 12);
        } else {
          throw new BadRequestException('รหัส Token ไม่ถูกต้องหรือไม่สามารถถอดรหัสได้');
        }
      }
    } else if (label) {
      const cleanLabel = label.trim().replace(/[-]/g, '');
      if (cleanLabel.length === 12 && /^\d+$/.test(cleanLabel)) {
        docNum = cleanLabel.substring(0, 9);
        seqNum = cleanLabel.substring(9, 12);
      } else {
        throw new BadRequestException('รหัสสินค้าต้องเป็นตัวเลข 12 หลัก (Lot 9 หลัก + running 3 หลัก)');
      }
    } else {
      throw new BadRequestException('กรุณาระบุ Token หรือรหัส Label ของสินค้า');
    }

    // Get registration if exists
    const registration = await this.registrationRepository.findOne({
      where: { docNum: docNum || '', seqNum: seqNum || '' }
    });

    // Get production order (cache-aside)
    let itemCode = 'ไม่พบรหัสสินค้า';
    let itemName = 'ไม่พบชื่อสินค้า';
    let plannedQty = 0;

    if (docNum) {
      try {
        let po = await this.productionOrderRepository.findOne({ where: { docNum } });
        if (!po) {
          const sapInfo = await this.sapService.getProductionOrder(docNum);
          po = this.productionOrderRepository.create({
            docNum,
            itemCode: sapInfo.itemCode,
            itemName: sapInfo.itemName,
            plannedQty: sapInfo.plannedQty,
          });
          await this.productionOrderRepository.save(po);
        }
        itemCode = po.itemCode;
        itemName = po.itemName || 'สินค้าทั่วไป';
        plannedQty = po.plannedQty;
      } catch (err) {
        console.error('[SAP ERROR] Failed to fetch product details in checkProduct:', err);
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
        po = this.productionOrderRepository.create({
          docNum,
          itemCode: sapInfo.itemCode,
          itemName: sapInfo.itemName,
          plannedQty: sapInfo.plannedQty,
        });
        await this.productionOrderRepository.save(po);
      } catch (err) {
        console.error('[SAP ERROR] Failed to fetch product details in getLotSummary:', err);
        // default PO details
        po = this.productionOrderRepository.create({
          docNum,
          itemCode: `FA00-D0112-200${docNum.substring(5, 9)}`,
          itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9)}`,
          plannedQty: 100,
        });
      }
    }

    const totalQty = po.plannedQty || 100;

    // Get all registrations in this lot
    const registrations = await this.registrationRepository.find({
      where: { docNum }
    });

    const regMap = new Map<string, Registration>();
    for (const r of registrations) {
      if (r.seqNum) {
        regMap.set(String(parseInt(r.seqNum, 10)), r);
      }
    }

    const items: any[] = [];
    let registeredCount = 0;

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
        });
      } else {
        items.push({
          seqNum: seqStr,
          registered: false,
        });
      }
    }

    return {
      docNum,
      itemCode: po.itemCode,
      itemName: po.itemName,
      totalQty,
      registeredCount,
      unregisteredCount: totalQty - registeredCount,
      items,
    };
  }
}
