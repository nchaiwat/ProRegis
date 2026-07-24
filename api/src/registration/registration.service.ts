import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Registration } from './registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { TelegramService, formatThaiDateTime } from '../telegram/telegram.service';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { SapService } from '../sap/sap.service';
import { ProductMetadata } from '../products/product-metadata.entity';
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
  installationPosition?: string; // ตำแหน่งติดตั้งตัวสินค้าภายในบ้าน เช่น ห้องนอนชั้น 2
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
    @InjectRepository(ProductMetadata)
    private readonly productMetadataRepository: Repository<ProductMetadata>,
    private readonly telegramService: TelegramService,
    private readonly sapService: SapService,
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

  private getLevenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  private areAddressesSimilar(addr1: string, addr2: string): boolean {
    if (!addr1 || !addr2) return false;

    const normalize = (s: string) => s
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/หมู่ที่|หมู่/g, 'ม')
      .replace(/ซอย|ซ\./g, 'ซ')
      .replace(/ถนน|ถ\./g, 'ถ');

    const clean1 = normalize(addr1);
    const clean2 = normalize(addr2);

    if (clean1 === clean2) return true;

    const maxLen = Math.max(clean1.length, clean2.length);
    if (maxLen === 0) return true;

    const distance = this.getLevenshteinDistance(clean1, clean2);
    const similarity = 1 - distance / maxLen;

    return similarity >= 0.85; // 85% similarity threshold
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

    // 1. Check if ProductionOrder exists in local DB or fetch from SAP B1
    let po = await this.productionOrderRepository.findOne({ where: { docNum } });
    if (!po) {
      this.logger.log(`[REGISTRATION SERVICE] Production Order not found in local DB. Fetching from SAP: DocNum=${docNum}`);
      const sapPo = await this.sapService.getProductionOrder(docNum);
      if (!sapPo) {
        throw new BadRequestException('ไม่พบข้อมูลใบสั่งผลิตนี้ในระบบ หรือการเชื่อมต่อขัดข้อง กรุณารอประมาณ 5 นาทีค่อยลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่');
      }

      // Save SAP PO to local DB
      po = this.productionOrderRepository.create({
        docNum,
        itemCode: sapPo.itemCode,
        itemName: sapPo.itemName,
        plannedQty: sapPo.plannedQty,
        orderDate: sapPo.orderDate,
        startDate: sapPo.startDate,
        status: sapPo.status,
        completedQty: sapPo.completedQty,
      });
      await this.productionOrderRepository.save(po);
      this.logger.log(`[REGISTRATION SERVICE] Cached Production Order from SAP to local DB during registration: DocNum=${docNum}`);
    }

    // Verify product metadata is saved locally
    const metadata = await this.productMetadataRepository.findOne({ where: { itemCode: po.itemCode } });
    if (!metadata) {
      this.logger.log(`[REGISTRATION SERVICE] Caching missing product metadata for ItemCode=${po.itemCode}`);
      const newMetadata = this.productMetadataRepository.create({
        itemCode: po.itemCode,
        itemName: po.itemName || 'สินค้าทั่วไป',
        imageBase64: null,
      });
      await this.productMetadataRepository.save(newMetadata);
    }

    // Also automatically create/cache group prefix metadata for backoffice image management
    if (po.itemCode && po.itemCode.includes('-')) {
      const parts = po.itemCode.split('-');
      if (parts.length >= 3) {
        const prefix = parts.slice(0, parts.length - 1).join('-');
        const prefixMeta = await this.productMetadataRepository.findOne({ where: { itemCode: prefix } });
        if (!prefixMeta) {
          this.logger.log(`[REGISTRATION SERVICE] Automatically creating missing prefix group metadata for ItemCode=${prefix}`);
          const newPrefixMetadata = this.productMetadataRepository.create({
            itemCode: prefix,
            itemName: `กลุ่มสินค้าโมเดล ${prefix}`,
            imageBase64: null,
          });
          await this.productMetadataRepository.save(newPrefixMetadata);
        }
      }
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
          `🔳 <b>[ProRegis]</b> · ${timeStr}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `🚨 <b>ตรวจพบการลงทะเบียนซ้ำ! (Double Registration)</b>\n`,
          `📦 <b>Production Order (PD):</b> <code>${docNum}</code>`,
          `🔢 <b>Running No:</b> <code>${seqNum}</code>`,
          `🏷️ <b>รหัสสินค้า (SAP B1):</b> <code>${itemCode}</code>`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `📍 <b>ข้อมูลการลงทะเบียนครั้งก่อนหน้า:</b>`,
          `👤 <b>ชื่อ-นามสกุล:</b> ${existingRegistration.firstName} ${existingRegistration.lastName}`,
          `📞 <b>เบอร์โทรศัพท์:</b> ${existingRegistration.phone}`,
          `📍 <b>จังหวัดติดตั้ง:</b> จ.${existingRegistration.province}`,
          `📅 <b>วันเวลาลงทะเบียนสำเร็จ:</b> ${oldRegTime}`,
          `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
          `⚠️ <b>ข้อมูลการพยายามลงทะเบียนซ้ำ:</b>`,
          `👤 <b>ชื่อ-นามสกุล:</b> ${dto.firstName} ${dto.lastName}`,
          `📞 <b>เบอร์โทรศัพท์:</b> ${dto.phone}`,
          `📍 <b>จังหวัดติดตั้ง:</b> จ.${dto.province}`,
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
              if (distance <= 0.5 && this.areAddressesSimilar(reg.address, dto.address)) {
                isSameSite = true;
                break;
              }
            } else {
              if (this.areAddressesSimilar(reg.address, dto.address)) {
                isSameSite = true;
                break;
              }
            }
          }
        } else {
          // If no GPS coordinates provided, fallback to address similarity checking
          isSameSite = false;
          for (const reg of existingRegistrations) {
            if (this.areAddressesSimilar(reg.address, dto.address)) {
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

    // Generate Registration Code (using first 4 digits of production order yymm)
    const codeSource = docNum || dto.token;
    const cleanToken = codeSource.substring(0, 4).toUpperCase();
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
      installationPosition: dto.installationPosition || null,
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
    try {
      const sapPo = await this.sapService.getProductionOrder(docNum);
      if (sapPo) {
        return sapPo.itemCode;
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch ItemCode from SAP for docNum ${docNum}:`, err);
    }
    return 'ไม่ระบุ';
  }

  // Trigger Telegram notification for successful registration
  private async triggerTelegramNotification(reg: Registration): Promise<void> {
    const docNum = reg.docNum || 'ไม่ระบุ';
    let seqNum = reg.seqNum || '';
    if (!seqNum || seqNum === 'ไม่ระบุ') {
      const count = await this.registrationRepository.count({
        where: { docNum: reg.docNum || '', phone: reg.phone }
      });
      seqNum = `${count}`;
    }
    
    const itemCode = reg.docNum ? await this.getOrFetchItemCode(reg.docNum) : 'ไม่ระบุ';
    
    // Resolve prefix group code image remark for Telegram
    let remarkImage = 'ยังไม่มีรูปจริงของสินค้า';
    if (itemCode && itemCode !== 'ไม่ระบุ' && itemCode.includes('-')) {
      const parts = itemCode.split('-');
      if (parts.length >= 3) {
        const prefixCode = parts.slice(0, parts.length - 1).join('-');
        const prefixMeta = await this.productMetadataRepository.findOne({ where: { itemCode: prefixCode } });
        if (prefixMeta && prefixMeta.imageBase64 && !prefixMeta.imageBase64.startsWith('http')) {
          remarkImage = `ใช้รูปกลุ่มสินค้า ${prefixCode}`;
        }
      }
    }

    const timeStr = formatThaiDateTime(new Date());
    const gpsLink = reg.latitude && reg.longitude 
      ? `https://www.google.com/maps?q=${reg.latitude},${reg.longitude}`
      : null;
    const gpsText = gpsLink 
      ? `<a href="${gpsLink}">คลิกเพื่อดู Google Maps (${reg.latitude}, ${reg.longitude})</a>`
      : 'ลูกค้าปฏิเสธการแชร์พิกัด';

    const message = [
      `🔳 <b>[ProRegis]</b> · ${timeStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔔 <b>ลงทะเบียนรับประกันสินค้าสำเร็จ (Warranty Registration)</b>\n`,
      `📦 <b>Production Order (PD):</b> <code>${docNum}</code>`,
      `🔢 <b>Running No:</b> <code>${seqNum}</code>`,
      `🏷️ <b>รหัสสินค้า (SAP B1):</b> <code>${itemCode}</code>`,
      `📍 <b>ที่อยู่ติดตั้ง:</b> ${reg.address || ''} จ.${reg.province || ''} ${reg.postalCode || ''}`,
      `🚪 <b>ตำแหน่งติดตั้ง:</b> ${reg.installationPosition || 'ไม่ระบุ'}`,
      `📞 <b>เบอร์โทรศัพท์:</b> ${reg.phone || 'ไม่ระบุ'}`,
      `📝 <b>หมายเหตุรูปภาพ:</b> ${remarkImage}`,
      `🌐 <b>GPS Location:</b> ${gpsText}`,
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
       firstName: string;
       lastName: string;
       address: string;
       province: string;
       postalCode: string;
       email: string | null;
       latitude: number | null;
       longitude: number | null;
       mfgDateTh: string;
       mfgDateEn: string;
       lotNo: string;
       totalQty: string;
       installationPosition: string | null;
       imageUrl?: string;
     }> = [];
     for (const reg of registrations) {
       let itemCode = 'ไม่ระบุ';
       let itemName = 'ไม่ระบุ';
       let mfgDateTh = 'N/A';
       let mfgDateEn = 'N/A';
       let lotNo = 'LOT-01';
       let totalQty = 'N/A';

       let po: any = null;
       if (reg.docNum) {
         po = await this.productionOrderRepository.findOne({ where: { docNum: reg.docNum } });
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
         totalQty = sumQty > 0 ? `${sumQty}` : (po && po.plannedQty > 0 ? `${po.plannedQty}` : 'N/A');
       }

        let calculatedSeqNum = reg.seqNum;
        if (!calculatedSeqNum && reg.docNum) {
          const count = await this.registrationRepository.count({
            where: { 
              docNum: reg.docNum, 
              phone: reg.phone,
              registeredAt: LessThanOrEqual(reg.registeredAt)
            }
          });
          calculatedSeqNum = `${count}`;
        }

         let imageUrl = '';
         if (itemCode && itemCode !== 'ไม่ระบุ') {
           let resolvedImage: string | null = null;
           if (itemCode.includes('-')) {
             const parts = itemCode.split('-');
             if (parts.length >= 3) {
               const prefix = parts.slice(0, parts.length - 1).join('-');
               const prefixMeta = await this.productMetadataRepository.findOne({ where: { itemCode: prefix } });
               if (prefixMeta && prefixMeta.imageBase64 && !prefixMeta.imageBase64.startsWith('http')) {
                 resolvedImage = prefixMeta.imageBase64;
               }
             }
           }
           if (!resolvedImage) {
             const metadata = await this.productMetadataRepository.findOne({ where: { itemCode } });
             if (metadata && metadata.imageBase64 && !metadata.imageBase64.startsWith('http')) {
               resolvedImage = metadata.imageBase64;
             }
           }
           if (resolvedImage) {
             imageUrl = resolvedImage;
           }
         }

       results.push({
         id: reg.id,
         docNum: reg.docNum,
         seqNum: calculatedSeqNum,
         imageUrl,
         itemCode,
         itemName,
         registeredAt: reg.registeredAt,
         status: reg.status,
         firstName: reg.firstName,
         lastName: reg.lastName,
         address: reg.address,
         province: reg.province,
         postalCode: reg.postalCode,
         email: reg.email,
         latitude: reg.latitude ? Number(reg.latitude) : null,
         longitude: reg.longitude ? Number(reg.longitude) : null,
         mfgDateTh,
         mfgDateEn,
         lotNo,
         totalQty,
         installationPosition: reg.installationPosition,
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
      installationPosition: string | null;
      imageUrl: string;
    }> = [];

    for (const reg of registrations) {
      let itemCode = 'ไม่ระบุ';
      let itemName = 'ไม่ระบุ';
      let mfgDateTh = 'N/A';
      let mfgDateEn = 'N/A';
      let lotNo = 'LOT-01';
      let totalQty = 'N/A';

      let po: any = null;
      if (reg.docNum) {
        po = await this.productionOrderRepository.findOne({ where: { docNum: reg.docNum } });
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
        totalQty = sumQty > 0 ? `${sumQty}` : (po && po.plannedQty > 0 ? `${po.plannedQty}` : 'N/A');
      }

      let calculatedSeqNum = reg.seqNum;
      if (!calculatedSeqNum && reg.docNum) {
        const count = await this.registrationRepository.count({
          where: { 
            docNum: reg.docNum, 
            phone: reg.phone,
            registeredAt: LessThanOrEqual(reg.registeredAt)
          }
        });
        calculatedSeqNum = `${count}`;
      }

      let imageUrl = '';
      if (itemCode && itemCode !== 'ไม่ระบุ') {
        let resolvedImage: string | null = null;
        if (itemCode.includes('-')) {
          const parts = itemCode.split('-');
          if (parts.length >= 3) {
            const prefix = parts.slice(0, parts.length - 1).join('-');
            const prefixMeta = await this.productMetadataRepository.findOne({ where: { itemCode: prefix } });
            if (prefixMeta && prefixMeta.imageBase64 && !prefixMeta.imageBase64.startsWith('http')) {
              resolvedImage = prefixMeta.imageBase64;
            }
          }
        }
        if (!resolvedImage) {
          const metadata = await this.productMetadataRepository.findOne({ where: { itemCode } });
          if (metadata && metadata.imageBase64 && !metadata.imageBase64.startsWith('http')) {
            resolvedImage = metadata.imageBase64;
          }
        }
        if (resolvedImage) {
          imageUrl = resolvedImage;
        }
      }

      results.push({
        id: reg.id,
        docNum: reg.docNum,
        seqNum: calculatedSeqNum,
        itemCode,
        itemName,
        registeredAt: reg.registeredAt,
        status: reg.status,
        mfgDateTh,
        mfgDateEn,
        lotNo,
        totalQty,
        installationPosition: reg.installationPosition,
        imageUrl,
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
    const isEmail = phone.includes('@');
    let allRegistrations;
    if (isEmail) {
      const cleanEmail = phone.trim().toLowerCase();
      allRegistrations = await this.registrationRepository.find({
        where: { email: cleanEmail },
        order: { registeredAt: 'ASC' }
      });
    } else {
      const cleanPhone = phone.replace(/\D/g, '');
      allRegistrations = await this.registrationRepository.find({
        where: { phone: cleanPhone },
        order: { registeredAt: 'ASC' }
      });
    }

    // Check if the current docNum has been registered under this phone
    const docRegistrations = allRegistrations.filter(r => r.docNum === docNum);

    if (docRegistrations.length === 0) {
      return { registered: false };
    }

    let isSameSite = true;
    if (lat && lng) {
      isSameSite = false;
      for (const reg of docRegistrations) {
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

    const latestReg = docRegistrations[docRegistrations.length - 1];

    return {
      registered: true,
      count: allRegistrations.length, // Total count across all product types/models
      modelName,
      profile: {
        firstName: latestReg.firstName,
        lastName: latestReg.lastName,
        address: latestReg.address,
        province: latestReg.province,
        postalCode: latestReg.postalCode,
        phone: latestReg.phone,
        email: latestReg.email,
      },
      list: allRegistrations.map((r, idx) => ({
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

    const isEmail = dto.phone.includes('@');
    let baseReg;
    if (isEmail) {
      const cleanEmail = dto.phone.trim().toLowerCase();
      baseReg = await this.registrationRepository.findOne({
        where: { docNum, email: cleanEmail },
        order: { registeredAt: 'DESC' }
      });
    } else {
      const cleanPhone = dto.phone.replace(/\D/g, '');
      baseReg = await this.registrationRepository.findOne({
        where: { docNum, phone: cleanPhone },
        order: { registeredAt: 'DESC' }
      });
    }

    if (!baseReg) {
      throw new BadRequestException('ไม่พบข้อมูลการลงทะเบียนต้นแบบสำหรับบานนี้');
    }

    // Generate new registration ID (using first 4 digits of production order yymm)
    const codeSource = baseReg.docNum || dto.token;
    const cleanToken = codeSource.substring(0, 4).toUpperCase();
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
      installationPosition: baseReg.installationPosition || null,
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
