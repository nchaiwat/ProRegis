import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from './registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { TelegramService, formatThaiDateTime } from '../telegram/telegram.service';
import { SystemSetting } from '../backoffice/system-setting.entity';
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

import { GenerationLog } from '../backoffice/generation-log.entity';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(ProductionOrder)
    private readonly productionOrderRepository: Repository<ProductionOrder>,
    @InjectRepository(GenerationLog)
    private readonly generationLogRepository: Repository<GenerationLog>,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
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

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  async registerProduct(dto: RegistrationDto) {
    if (!dto.mandatoryConsent) {
      throw new BadRequestException('Mandatory data consent must be agreed.');
    }

    // 0. Load active settings from DB
    const qrModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'QR_CODE_MODE' } });
    const qrMode = qrModeSetting ? qrModeSetting.value : 'STATIC';

    // Normalize phone number (strip non-digits)
    const cleanPhone = dto.phone.replace(/\D/g, '');

    // Resolve docNum & seqNum
    let docNum = dto.docNum;
    let seqNum = dto.seqNum;

    if (qrMode === 'DYNAMIC') {
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
    } else {
      // STATIC Mode (no seqNum)
      if (!docNum) {
        const decoded = this.decryptToken(dto.token);
        if (decoded) {
          docNum = decoded.docNum;
        } else {
          // Fallback if token is plain 9-digit
          if (dto.token.length === 9 && /^\d+$/.test(dto.token)) {
            docNum = dto.token;
          }
        }
      }
      seqNum = undefined; // Always undefined in STATIC mode
      if (!docNum) {
        throw new BadRequestException('รหัส QR Code ไม่ถูกต้องหรือเสียหาย');
      }
    }

    // 1. Check if ProductionOrder is pre-generated in backend (by staff)
    const po = await this.productionOrderRepository.findOne({ where: { docNum } });
    if (!po) {
      throw new BadRequestException('ไม่พบข้อมูลใบสั่งผลิตนี้ในระบบ หรือยังไม่ได้มีการสร้างรหัส QR Code จากทางพนักงานของบริษัท โปรดติดต่อเจ้าหน้าที่ดูแลระบบ');
    }

    // 2. Check if already registered (Double Registration Check)
    if (qrMode === 'DYNAMIC') {
      const existingRegistration = await this.registrationRepository.findOne({
        where: { docNum, seqNum }
      });

      if (existingRegistration) {
        const timeStr = formatThaiDateTime(new Date());
        const oldRegTime = formatThaiDateTime(new Date(existingRegistration.registeredAt));
        const itemCode = await this.getOrFetchItemCode(docNum);
        
        // Construct Telegram Alert message
        const alertMessage = [
          `📱 <b>ProRegis</b> · ${timeStr}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `🚨 <b>แจ้งเตือน: ตรวจพบการลงทะเบียนซ้ำ! (Double Registration)</b>\n`,
          `• 📦 <b>Production Order (PD):</b> <code>${docNum}</code>`,
          `• 🔢 <b>Production Running No:</b> <code>${seqNum}</code>`,
          `• 🏷️ <b>รหัสสินค้า (SAP B1):</b> <code>${itemCode}</code>`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `📍 <b>ข้อมูลการลงทะเบียนครั้งก่อนหน้า:</b>`,
          `• 👤 <b>ชื่อ-นามสกุล:</b> ${existingRegistration.firstName} ${existingRegistration.lastName}`,
          `• 📞 <b>เบอร์โทรศัพท์:</b> ${existingRegistration.phone}`,
          `• 📍 <b>จังหวัดติดตั้ง:</b> จ.${existingRegistration.province}`,
          `• 📅 <b>วันเวลาลงทะเบียนสำเร็จ:</b> ${oldRegTime}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `⚠️ <b>ข้อมูลการพยายามลงทะเบียนซ้ำ:</b>`,
          `• 👤 <b>ชื่อ-นามสกุล:</b> ${dto.firstName} ${dto.lastName}`,
          `• 📞 <b>เบอร์โทรศัพท์:</b> ${dto.phone}`,
          `• 📍 <b>จังหวัดติดตั้ง:</b> จ.${dto.province}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `🔍 <i>โปรดติดต่อยืนยันความเป็นเจ้าของสินค้ากับลูกค้าในระบบ ProRegis</i>`
        ].join('\n');

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
    } else {
      // STATIC Mode duplicate check (By location and phone)
      const existingRegistrations = await this.registrationRepository.find({
        where: { docNum, phone: cleanPhone }
      });

      if (existingRegistrations.length > 0) {
        let isSameSite = true;
        if (dto.latitude && dto.longitude) {
          isSameSite = false;
          for (const reg of existingRegistrations) {
            if (reg.latitude && reg.longitude) {
              const distance = this.calculateDistance(
                dto.latitude,
                dto.longitude,
                Number(reg.latitude),
                Number(reg.longitude)
              );
              if (distance <= 0.5) { // 500 meters threshold
                isSameSite = true;
                break;
              }
            } else {
              isSameSite = true;
              break;
            }
          }
        }

        if (isSameSite) {
          throw new BadRequestException('สินค้ารุ่นนี้ได้รับการลงทะเบียนรับประกันแล้วที่บ้านของคุณ');
        }
      }
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
    
    const timeStr = formatThaiDateTime(new Date());
    const gpsLink = reg.latitude && reg.longitude 
      ? `https://www.google.com/maps?q=${reg.latitude},${reg.longitude}`
      : null;
    const gpsText = gpsLink 
      ? `<a href="${gpsLink}">คลิกเพื่อดู Google Maps (${reg.latitude}, ${reg.longitude})</a>`
      : 'ลูกค้าปฏิเสธการแชร์พิกัด';

    const message = [
      `📱 <b>ProRegis</b> · ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔔 <b>แจ้งเตือน: ลงทะเบียนรับประกันสินค้าสำเร็จ (Warranty Registration)</b>\n`,
      `• 📦 <b>Production Order (PD):</b> <code>${docNum}</code>`,
      `• 🔢 <b>Production Running No:</b> <code>${seqNum}</code>`,
      `• 🏷️ <b>รหัสสินค้า (SAP B1):</b> <code>${itemCode}</code>`,
      `• 📍 <b>ที่อยู่ติดตั้ง:</b> ${reg.address || ''} จ.${reg.province || ''} ${reg.postalCode || ''}`,
      `• 📞 <b>เบอร์โทรศัพท์:</b> ${reg.phone || 'ไม่ระบุ'}`,
      `• 🌐 <b>GPS Location:</b> ${gpsText}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔍 <i>สามารถตรวจสอบรายละเอียดประกันภัยได้เพิ่มเติมในระบบ ProRegis</i>`
    ].join('\n');

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

  async getRegistrationsByContact(contact: string) {
    const cleanContact = contact.trim();
    const isEmail = cleanContact.includes('@');
    
    let registrations;
    if (isEmail) {
      registrations = await this.registrationRepository.find({
        where: { email: cleanContact },
        order: { registeredAt: 'DESC' },
      });
    } else {
      const cleanPhone = cleanContact.replace(/\D/g, '');
      registrations = await this.registrationRepository.find({
        where: { phone: cleanPhone },
        order: { registeredAt: 'DESC' },
      });
    }

    const formatMfgDate = (date: Date, lang: 'th' | 'en'): string => {
      if (!date) return 'N/A';
      const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = date.getMonth();
      const y = date.getFullYear();
      return lang === 'th' ? `${monthsTh[m]} ${y}` : `${monthsEn[m]} ${y}`;
    };

    const results: Array<{
      id: string;
      docNum: string | null;
      seqNum: string | null;
      itemCode: string;
      itemName: string;
      registeredAt: Date;
      status: string;
      mfgDateTh: string;
      mfgDateEn: string;
      lotNo: string;
      totalQty: string;
    }> = [];

    for (const reg of registrations) {
      let itemCode = 'ไม่ระบุ';
      let itemName = 'ไม่ระบุ';
      let mfgDateTh = 'N/A';
      let mfgDateEn = 'N/A';
      let lotNo = 'LOT-01';
      let totalQty = 'N/A';

      if (reg.docNum) {
        const po = await this.productionOrderRepository.findOne({ where: { docNum: reg.docNum } });
        if (po) {
          itemCode = po.itemCode;
          itemName = po.itemName || 'ไม่ระบุ';
          mfgDateTh = po.createdAt ? formatMfgDate(po.createdAt, 'th') : 'N/A';
          mfgDateEn = po.createdAt ? formatMfgDate(po.createdAt, 'en') : 'N/A';
        }

        const logs = await this.generationLogRepository.find({
          where: { docNum: reg.docNum },
          order: { generatedAt: 'ASC' }
        });

        let lotIndex = 1;
        if (reg.seqNum && logs.length > 0) {
          const seqNumNum = parseInt(reg.seqNum, 10);
          for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            if (seqNumNum >= log.startSeq && seqNumNum < log.startSeq + log.quantity) {
              lotIndex = i + 1;
              break;
            }
          }
        }
        lotNo = `LOT-${String(lotIndex).padStart(2, '0')}`;

        const sumQty = logs.reduce((sum, log) => sum + log.quantity, 0);
        totalQty = sumQty > 0 ? `${sumQty}` : 'N/A';
      }

      results.push({
        id: reg.id,
        docNum: reg.docNum,
        seqNum: reg.seqNum,
        itemCode,
        itemName,
        registeredAt: reg.registeredAt,
        status: reg.status,
        mfgDateTh,
        mfgDateEn,
        lotNo,
        totalQty,
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

  async checkContactExists(contact: string): Promise<{
    exists: boolean;
    phone?: string | null;
    email?: string | null;
    maskedPhone?: string | null;
    maskedEmail?: string | null;
  }> {
    const cleanContact = contact.trim();
    const isEmail = cleanContact.includes('@');
    
    let reg;
    if (isEmail) {
      reg = await this.registrationRepository.findOne({
        where: { email: cleanContact },
        order: { registeredAt: 'DESC' }
      });
    } else {
      const cleanPhone = cleanContact.replace(/\D/g, '');
      reg = await this.registrationRepository.findOne({
        where: { phone: cleanPhone },
        order: { registeredAt: 'DESC' }
      });
    }
    
    if (!reg) {
      return { exists: false };
    }
    
    const maskEmail = (email: string | null): string | null => {
      if (!email) return null;
      const parts = email.split('@');
      if (parts.length !== 2) return email;
      const [local, domain] = parts;
      if (local.length <= 2) return `*@${domain}`;
      return `${local[0]}***${local[local.length - 1]}@${domain}`;
    };
    
    const maskPhone = (phone: string | null): string | null => {
      if (!phone) return null;
      const clean = phone.replace(/\D/g, '');
      if (clean.length < 9) return phone;
      return `${clean.slice(0, 3)}-xxx-${clean.slice(-4)}`;
    };

    return {
      exists: true,
      phone: reg.phone,
      email: reg.email,
      maskedPhone: maskPhone(reg.phone),
      maskedEmail: maskEmail(reg.email)
    };
  }

  async checkStatus(docNum: string, phone: string, lat?: number, lng?: number) {
    const cleanPhone = phone.replace(/\D/g, '');
    const registrations = await this.registrationRepository.find({
      where: { docNum, phone: cleanPhone },
      order: { registeredAt: 'ASC' }
    });

    if (registrations.length === 0) {
      return { registered: false };
    }

    let isSameSite = true;
    if (lat && lng) {
      isSameSite = false;
      for (const reg of registrations) {
        if (reg.latitude && reg.longitude) {
          const distance = this.calculateDistance(lat, lng, Number(reg.latitude), Number(reg.longitude));
          if (distance <= 0.5) { // 500 meters
            isSameSite = true;
            break;
          }
        } else {
          isSameSite = true;
          break;
        }
      }
    }

    if (!isSameSite) {
      return { registered: false, existingAtOtherSite: true };
    }

    // Load SAP info to show item details
    const po = await this.productionOrderRepository.findOne({ where: { docNum } });
    const modelName = po ? (po.itemName || 'กระจกนิรภัยนำเข้า') : 'กระจกนิรภัยนำเข้า';

    return {
      registered: true,
      count: registrations.length,
      modelName,
      list: registrations.map((r, idx) => ({
        index: idx + 1,
        id: r.id,
        registeredAt: r.registeredAt,
      }))
    };
  }

  async addUnit(dto: { token: string; phone: string }) {
    // 0. Load active settings from DB
    const qrModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'QR_CODE_MODE' } });
    const qrMode = qrModeSetting ? qrModeSetting.value : 'STATIC';

    if (qrMode !== 'STATIC') {
      throw new BadRequestException('การลงทะเบียนบานเพิ่มเติมแบบด่วนรองรับเฉพาะโหมด Static QR เท่านั้น');
    }

    // Resolve docNum
    let docNum: string | null = null;
    const decoded = this.decryptToken(dto.token);
    if (decoded) {
      docNum = decoded.docNum;
    } else {
      if (dto.token.length === 9 && /^\d+$/.test(dto.token)) {
        docNum = dto.token;
      }
    }

    if (!docNum) {
      throw new BadRequestException('รหัส QR Code ไม่ถูกต้องหรือเสียหาย');
    }

    const cleanPhone = dto.phone.replace(/\D/g, '');
    const baseReg = await this.registrationRepository.findOne({
      where: { docNum, phone: cleanPhone },
      order: { registeredAt: 'DESC' }
    });

    if (!baseReg) {
      throw new BadRequestException('ไม่พบข้อมูลการลงทะเบียนต้นแบบสำหรับบานนี้');
    }

    // Generate new registration ID
    const cleanToken = dto.token.substring(0, 3).toUpperCase();
    const registrationId = `REG-${Math.floor(Math.random() * 90000) + 10000}-${cleanToken}`;

    const newRegistration = this.registrationRepository.create({
      id: registrationId,
      token: dto.token,
      docNum: baseReg.docNum,
      seqNum: null,
      firstName: baseReg.firstName,
      lastName: baseReg.lastName,
      address: baseReg.address,
      province: baseReg.province,
      postalCode: baseReg.postalCode,
      phone: baseReg.phone,
      email: baseReg.email,
      mandatoryConsent: baseReg.mandatoryConsent,
      optionalConsent: baseReg.optionalConsent,
      latitude: baseReg.latitude,
      longitude: baseReg.longitude,
      lineUserId: baseReg.lineUserId,
      status: 'WARRANTY_ACTIVE',
    });

    await this.registrationRepository.save(newRegistration);
    this.logger.log(`[REGISTRATION] Added duplicate static unit successfully: ${registrationId}`);

    // Trigger Telegram Notification
    this.triggerTelegramNotification(newRegistration).catch((err) => {
      this.logger.error('[TELEGRAM ALERT ERROR] Failed to send Telegram duplicate registration message:', err);
    });

    return {
      success: true,
      refCode: registrationId,
      registeredAt: newRegistration.registeredAt || new Date().toISOString(),
    };
  }
}
