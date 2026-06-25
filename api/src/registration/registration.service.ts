import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from './registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { TelegramService } from '../telegram/telegram.service';
import * as crypto from 'crypto';

export class RegistrationDto {
  token: string; // Encrypted QR token (Base64URL)
  docNum?: string; // Production Order (ถอดรหัสจาก token)
  seqNum?: string; // Running number (ถอดรหัสจาก token)
  firstName: string;
  lastName: string;
  address: string; // Installation site
  province: string;
  postalCode: string;
  phone: string;
  email?: string;
  mandatoryConsent: boolean;
  optionalConsent: boolean;
  latitude?: number;
  longitude?: number;
  lineUserId?: string; // LINE User ID (optional, from LIFF)
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(ProductionOrder)
    private readonly productionOrderRepository: Repository<ProductionOrder>,
    private readonly telegramService: TelegramService,
  ) {}

  private decryptToken(token: string): { docNum: string; seqNum: string } | null {
    try {
      let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const secret = crypto.createHash('sha256').update(process.env.AES_SECRET_KEY || 'WindowAsiaSecretKey2026').digest().slice(0, 16);
      const iv = crypto.createHash('sha256').update(process.env.AES_IV_KEY || 'WindowAsiaIV2026').digest().slice(0, 16);
      const decipher = crypto.createDecipheriv('aes-128-cbc', secret, iv);
      let decrypted = decipher.update(base64, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      const parts = decrypted.split(':');
      if (parts.length === 2) {
        return { docNum: parts[0], seqNum: parts[1] };
      }
      return null;
    } catch {
      return null;
    }
  }

  async registerProduct(dto: RegistrationDto) {
    if (!dto.mandatoryConsent) {
      throw new BadRequestException('Mandatory data consent must be agreed.');
    }

    // Resolve docNum & seqNum
    let docNum = dto.docNum;
    let seqNum = dto.seqNum;
    if (!docNum || !seqNum) {
      const decoded = this.decryptToken(dto.token);
      if (decoded) {
        docNum = decoded.docNum;
        seqNum = decoded.seqNum;
      }
    }

    if (!docNum || !seqNum) {
      throw new BadRequestException('รหัส QR Code ไม่ถูกต้องหรือเสียหาย');
    }

    // 1. Check if ProductionOrder is pre-generated in backend (by staff)
    const po = await this.productionOrderRepository.findOne({ where: { docNum } });
    if (!po) {
      throw new BadRequestException('ไม่พบข้อมูลใบสั่งผลิตนี้ในระบบ หรือยังไม่ได้มีการสร้างรหัส QR Code จากทางพนักงานของบริษัท โปรดติดต่อเจ้าหน้าที่ดูแลระบบ');
    }

    // 2. Check if already registered (Double Registration Check)
    const existingRegistration = await this.registrationRepository.findOne({
      where: { docNum, seqNum }
    });

      if (existingRegistration) {
        const timeStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const oldRegTime = new Date(existingRegistration.registeredAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        const itemCode = await this.getOrFetchItemCode(docNum);
        
        // Construct Telegram Alert message
        const alertMessage = `
<b>🚨 [ALERT] ตรวจพบการลงทะเบียนซ้ำ! (Double Registration Attempt)</b>
━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>วันเวลาที่พยายามลงทะเบียนซ้ำ:</b> ${timeStr}
📦 <b>Production Order (PD):</b> <code>${docNum}</code>
🔢 <b>Production Running No:</b> <code>${seqNum}</code>
🏷️ <b>รหัสสินค้า (SAP B1):</b> <code>${itemCode}</code>
━━━━━━━━━━━━━━━━━━━━━━━━
📍 <b>ข้อมูลการลงทะเบียนเก่า:</b>
• 👤 <b>ชื่อ-นามสกุล:</b> ${existingRegistration.firstName} ${existingRegistration.lastName}
• 📞 <b>เบอร์โทรศัพท์:</b> ${existingRegistration.phone}
• 📍 <b>จังหวัดติดตั้ง:</b> จ.${existingRegistration.province}
• 📅 <b>วันเวลาลงทะเบียนสำเร็จ:</b> ${oldRegTime}
━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <b>ข้อมูลผู้ใช้ที่พยายามสมัครซ้ำ:</b>
• 👤 <b>ชื่อ-นามสกุล:</b> ${dto.firstName} ${dto.lastName}
• 📞 <b>เบอร์โทรศัพท์:</b> ${dto.phone}
• 📍 <b>จังหวัดติดตั้ง:</b> จ.${dto.province}
━━━━━━━━━━━━━━━━━━━━━━━━
<i>*ผู้ดูแลระบบโปรดติดต่อชี้แจงและยืนยันความเป็นเจ้าของสินค้ากับลูกค้า*</i>
`.trim();

        await this.telegramService.sendMessage(alertMessage).catch((err) => {
          this.logger.error('[TELEGRAM ALERT ERROR] Failed to send duplicate registration warning Telegram message:', err);
        });

        // Format dates for Thai locale exception response
        const formattedOldDate = new Date(existingRegistration.registeredAt).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        throw new BadRequestException(
          `สินค้านี้ถูกลงทะเบียนไปแล้วเมื่อวันที่ ${formattedOldDate} น. ที่จังหวัด ${existingRegistration.province} โปรดติดต่อเจ้าหน้าที่ดูแลระบบหากพบปัญหา`
        );
      }

    // Generate Registration Code
    const cleanToken = dto.token.substring(0, 3).toUpperCase();
    const registrationId = `REG-${Math.floor(Math.random() * 90000) + 10000}-${cleanToken}`;

    const newRegistration = this.registrationRepository.create({
      id: registrationId,
      token: dto.token,
      docNum: docNum || null,
      seqNum: seqNum || null,
      firstName: dto.firstName,
      lastName: dto.lastName,
      address: dto.address,
      province: dto.province,
      postalCode: dto.postalCode,
      phone: dto.phone,
      email: dto.email || null,
      mandatoryConsent: dto.mandatoryConsent,
      optionalConsent: dto.optionalConsent,
      latitude: dto.latitude || null,
      longitude: dto.longitude || null,
      lineUserId: dto.lineUserId || null,
      status: 'WARRANTY_ACTIVE',
    });

    // Save to PostgreSQL database!
    await this.registrationRepository.save(newRegistration);

    this.logger.log(`[REGISTRATION] Saved registration to PostgreSQL: ${registrationId}`);
    
    // SAP B1 Sync disabled in this version (as per user request: no write back to SAP)
    this.logger.log(`[REGISTRATION] Write-back sync to SAP B1 bypassed for registration ID: ${registrationId}`);

    // Async trigger Telegram alert for successful registration
    this.triggerTelegramNotification(newRegistration).catch((err) => {
      this.logger.error('[TELEGRAM ALERT ERROR] Failed to send Telegram registration message:', err);
    });

    return {
      success: true,
      refCode: registrationId,
      registeredAt: newRegistration.registeredAt || new Date().toISOString(),
    };
  }

  // Helper to fetch Item Code from database
  private async getOrFetchItemCode(docNum: string): Promise<string> {
    const existing = await this.productionOrderRepository.findOne({ where: { docNum } });
    if (existing) {
      return existing.itemCode;
    }
    return 'ไม่ระบุ';
  }

  // Trigger Telegram notification for successful registration
  private async triggerTelegramNotification(reg: Registration): Promise<void> {
    const docNum = reg.docNum || 'ไม่ระบุ';
    const seqNum = reg.seqNum || 'ไม่ระบุ';
    
    const itemCode = reg.docNum ? await this.getOrFetchItemCode(reg.docNum) : 'ไม่ระบุ';
    
    const timeStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const gpsLink = reg.latitude && reg.longitude 
      ? `https://www.google.com/maps?q=${reg.latitude},${reg.longitude}`
      : null;
    const gpsText = gpsLink 
      ? `<a href="${gpsLink}">คลิกเพื่อดู Google Maps (${reg.latitude}, ${reg.longitude})</a>`
      : 'ลูกค้าปฏิเสธการแชร์พิกัด';

    const message = `
<b>🔔 [SYSTEM] แจ้งเตือนการลงทะเบียนสำเร็จ</b>
━━━━━━━━━━━━━━━━━━━━━━━━
📅 <b>วันเวลาแจ้งเตือน:</b> ${timeStr}
📦 <b>Production Order (PD):</b> ${docNum}
🔢 <b>Production Running No:</b> ${seqNum}
🏷️ <b>รหัสสินค้า (SAP B1):</b> <code>${itemCode}</code>
📍 <b>ที่อยู่ติดตั้ง:</b> ${reg.address || ''} จ.${reg.province || ''} ${reg.postalCode || ''}
📞 <b>เบอร์โทรศัพท์:</b> ${reg.phone || 'ไม่ระบุ'}
🌐 <b>GPS Location:</b> ${gpsText}
━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    await this.telegramService.sendMessage(message);
  }

  async getRegistrationsByPhone(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const registrations = await this.registrationRepository.find({
      where: { phone: cleanPhone },
      order: { registeredAt: 'DESC' },
    });

    const results: Array<{
      id: string;
      docNum: string | null;
      seqNum: string | null;
      itemCode: string;
      itemName: string;
      registeredAt: Date;
      status: string;
    }> = [];
    for (const reg of registrations) {
      let itemCode = 'ไม่ระบุ';
      let itemName = 'ไม่ระบุ';
      if (reg.docNum) {
        const po = await this.productionOrderRepository.findOne({ where: { docNum: reg.docNum } });
        if (po) {
          itemCode = po.itemCode;
          itemName = po.itemName || 'ไม่ระบุ';
        }
      }
      results.push({
        id: reg.id,
        docNum: reg.docNum,
        seqNum: reg.seqNum,
        itemCode,
        itemName,
        registeredAt: reg.registeredAt,
        status: reg.status,
      });
    }
    return results;
  }

  async checkPhoneExists(phone: string): Promise<boolean> {
    const cleanPhone = phone.replace(/\D/g, '');
    const count = await this.registrationRepository.count({
      where: { phone: cleanPhone }
    });
    return count > 0;
  }
}
