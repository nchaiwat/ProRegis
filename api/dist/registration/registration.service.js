"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RegistrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationService = exports.RegistrationDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const registration_entity_1 = require("./registration.entity");
const production_order_entity_1 = require("../production-order/production-order.entity");
const telegram_service_1 = require("../telegram/telegram.service");
const system_setting_entity_1 = require("../backoffice/system-setting.entity");
const sap_service_1 = require("../sap/sap.service");
const product_metadata_entity_1 = require("../products/product-metadata.entity");
const crypto = __importStar(require("crypto"));
class RegistrationDto {
    token;
    docNum;
    seqNum;
    firstName;
    lastName;
    address;
    province;
    postalCode;
    phone;
    email;
    mandatoryConsent;
    optionalConsent;
    latitude;
    longitude;
    lineUserId;
    installationPosition;
}
exports.RegistrationDto = RegistrationDto;
const generation_log_entity_1 = require("../backoffice/generation-log.entity");
let RegistrationService = RegistrationService_1 = class RegistrationService {
    registrationRepository;
    productionOrderRepository;
    generationLogRepository;
    systemSettingRepository;
    productMetadataRepository;
    telegramService;
    sapService;
    logger = new common_1.Logger(RegistrationService_1.name);
    constructor(registrationRepository, productionOrderRepository, generationLogRepository, systemSettingRepository, productMetadataRepository, telegramService, sapService) {
        this.registrationRepository = registrationRepository;
        this.productionOrderRepository = productionOrderRepository;
        this.generationLogRepository = generationLogRepository;
        this.systemSettingRepository = systemSettingRepository;
        this.productMetadataRepository = productMetadataRepository;
        this.telegramService = telegramService;
        this.sapService = sapService;
    }
    decryptToken(token) {
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
        }
        catch {
            return null;
        }
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
                Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    getLevenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++)
            matrix[i] = [i];
        for (let j = 0; j <= a.length; j++)
            matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[b.length][a.length];
    }
    areAddressesSimilar(addr1, addr2) {
        if (!addr1 || !addr2)
            return false;
        const normalize = (s) => s
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .replace(/หมู่ที่|หมู่/g, 'ม')
            .replace(/ซอย|ซ\./g, 'ซ')
            .replace(/ถนน|ถ\./g, 'ถ');
        const clean1 = normalize(addr1);
        const clean2 = normalize(addr2);
        if (clean1 === clean2)
            return true;
        const maxLen = Math.max(clean1.length, clean2.length);
        if (maxLen === 0)
            return true;
        const distance = this.getLevenshteinDistance(clean1, clean2);
        const similarity = 1 - distance / maxLen;
        return similarity >= 0.85;
    }
    async registerProduct(dto) {
        if (!dto.mandatoryConsent) {
            throw new common_1.BadRequestException('Mandatory data consent must be agreed.');
        }
        const qrModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'QR_CODE_MODE' } });
        const qrMode = qrModeSetting ? qrModeSetting.value : 'STATIC';
        const cleanPhone = dto.phone.replace(/\D/g, '');
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
                throw new common_1.BadRequestException('รหัส QR Code ไม่ถูกต้องหรือเสียหาย');
            }
        }
        else {
            if (!docNum) {
                const decoded = this.decryptToken(dto.token);
                if (decoded) {
                    docNum = decoded.docNum;
                }
                else {
                    if (dto.token.length === 9 && /^\d+$/.test(dto.token)) {
                        docNum = dto.token;
                    }
                }
            }
            seqNum = undefined;
            if (!docNum) {
                throw new common_1.BadRequestException('รหัส QR Code ไม่ถูกต้องหรือเสียหาย');
            }
        }
        let po = await this.productionOrderRepository.findOne({ where: { docNum } });
        if (!po) {
            this.logger.log(`[REGISTRATION SERVICE] Production Order not found in local DB. Fetching from SAP: DocNum=${docNum}`);
            const sapPo = await this.sapService.getProductionOrder(docNum);
            if (!sapPo) {
                throw new common_1.BadRequestException('ไม่พบข้อมูลใบสั่งผลิตนี้ในระบบ หรือการเชื่อมต่อขัดข้อง กรุณารอประมาณ 5 นาทีค่อยลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่');
            }
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
        if (qrMode === 'DYNAMIC') {
            const existingRegistration = await this.registrationRepository.findOne({
                where: { docNum, seqNum }
            });
            if (existingRegistration) {
                const timeStr = (0, telegram_service_1.formatThaiDateTime)(new Date());
                const oldRegTime = (0, telegram_service_1.formatThaiDateTime)(new Date(existingRegistration.registeredAt));
                const itemCode = await this.getOrFetchItemCode(docNum);
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
                const formattedOldDate = new Date(existingRegistration.registeredAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                throw new common_1.BadRequestException(`สินค้านี้ถูกลงทะเบียนไปแล้วเมื่อวันที่ ${formattedOldDate} น. ที่จังหวัด ${existingRegistration.province} โปรดติดต่อเจ้าหน้าที่ดูแลระบบหากพบปัญหา`);
            }
        }
        else {
            const existingRegistrations = await this.registrationRepository.find({
                where: { docNum, phone: cleanPhone }
            });
            if (existingRegistrations.length > 0) {
                let isSameSite = true;
                if (dto.latitude && dto.longitude) {
                    isSameSite = false;
                    for (const reg of existingRegistrations) {
                        if (reg.latitude && reg.longitude) {
                            const distance = this.calculateDistance(dto.latitude, dto.longitude, Number(reg.latitude), Number(reg.longitude));
                            if (distance <= 0.5 && this.areAddressesSimilar(reg.address, dto.address)) {
                                isSameSite = true;
                                break;
                            }
                        }
                        else {
                            if (this.areAddressesSimilar(reg.address, dto.address)) {
                                isSameSite = true;
                                break;
                            }
                        }
                    }
                }
                else {
                    isSameSite = false;
                    for (const reg of existingRegistrations) {
                        if (this.areAddressesSimilar(reg.address, dto.address)) {
                            isSameSite = true;
                            break;
                        }
                    }
                }
                if (isSameSite) {
                    throw new common_1.BadRequestException('สินค้ารุ่นนี้ได้รับการลงทะเบียนรับประกันแล้วที่บ้านของคุณ');
                }
            }
        }
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
        await this.registrationRepository.save(newRegistration);
        this.logger.log(`[REGISTRATION] Saved registration to PostgreSQL: ${registrationId}`);
        this.logger.log(`[REGISTRATION] Write-back sync to SAP B1 bypassed for registration ID: ${registrationId}`);
        this.triggerTelegramNotification(newRegistration).catch((err) => {
            this.logger.error('[TELEGRAM ALERT ERROR] Failed to send Telegram registration message:', err);
        });
        return {
            success: true,
            refCode: registrationId,
            registeredAt: newRegistration.registeredAt || new Date().toISOString(),
        };
    }
    async getOrFetchItemCode(docNum) {
        const existing = await this.productionOrderRepository.findOne({ where: { docNum } });
        if (existing) {
            return existing.itemCode;
        }
        try {
            const sapPo = await this.sapService.getProductionOrder(docNum);
            if (sapPo) {
                return sapPo.itemCode;
            }
        }
        catch (err) {
            this.logger.warn(`Failed to fetch ItemCode from SAP for docNum ${docNum}:`, err);
        }
        return 'ไม่ระบุ';
    }
    async triggerTelegramNotification(reg) {
        const docNum = reg.docNum || 'ไม่ระบุ';
        let seqNum = reg.seqNum || '';
        if (!seqNum || seqNum === 'ไม่ระบุ') {
            const count = await this.registrationRepository.count({
                where: { docNum: reg.docNum || '', phone: reg.phone }
            });
            seqNum = `${count}`;
        }
        const itemCode = reg.docNum ? await this.getOrFetchItemCode(reg.docNum) : 'ไม่ระบุ';
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
        const timeStr = (0, telegram_service_1.formatThaiDateTime)(new Date());
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
    async getRegistrationsByPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const registrations = await this.registrationRepository.find({
            where: { phone: cleanPhone },
            order: { registeredAt: 'DESC' },
        });
        const formatMfgDate = (date, lang) => {
            if (!date)
                return 'N/A';
            const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const m = date.getMonth();
            const y = date.getFullYear();
            return lang === 'th' ? `${monthsTh[m]} ${y}` : `${monthsEn[m]} ${y}`;
        };
        const results = [];
        for (const reg of registrations) {
            let itemCode = 'ไม่ระบุ';
            let itemName = 'ไม่ระบุ';
            let mfgDateTh = 'N/A';
            let mfgDateEn = 'N/A';
            let lotNo = 'LOT-01';
            let totalQty = 'N/A';
            let po = null;
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
                        registeredAt: (0, typeorm_2.LessThanOrEqual)(reg.registeredAt)
                    }
                });
                calculatedSeqNum = `${count}`;
            }
            let imageUrl = '';
            if (itemCode && itemCode !== 'ไม่ระบุ') {
                let resolvedImage = null;
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
    async getRegistrationsByContact(contact) {
        const cleanContact = contact.trim();
        const isEmail = cleanContact.includes('@');
        let registrations;
        if (isEmail) {
            registrations = await this.registrationRepository.find({
                where: { email: cleanContact },
                order: { registeredAt: 'DESC' },
            });
        }
        else {
            const cleanPhone = cleanContact.replace(/\D/g, '');
            registrations = await this.registrationRepository.find({
                where: { phone: cleanPhone },
                order: { registeredAt: 'DESC' },
            });
        }
        const formatMfgDate = (date, lang) => {
            if (!date)
                return 'N/A';
            const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const m = date.getMonth();
            const y = date.getFullYear();
            return lang === 'th' ? `${monthsTh[m]} ${y}` : `${monthsEn[m]} ${y}`;
        };
        const results = [];
        for (const reg of registrations) {
            let itemCode = 'ไม่ระบุ';
            let itemName = 'ไม่ระบุ';
            let mfgDateTh = 'N/A';
            let mfgDateEn = 'N/A';
            let lotNo = 'LOT-01';
            let totalQty = 'N/A';
            let po = null;
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
                        registeredAt: (0, typeorm_2.LessThanOrEqual)(reg.registeredAt)
                    }
                });
                calculatedSeqNum = `${count}`;
            }
            let imageUrl = '';
            if (itemCode && itemCode !== 'ไม่ระบุ') {
                let resolvedImage = null;
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
    async checkPhoneExists(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const count = await this.registrationRepository.count({
            where: { phone: cleanPhone }
        });
        return count > 0;
    }
    async checkContactExists(contact) {
        const cleanContact = contact.trim();
        const isEmail = cleanContact.includes('@');
        let reg;
        if (isEmail) {
            reg = await this.registrationRepository.findOne({
                where: { email: cleanContact },
                order: { registeredAt: 'DESC' }
            });
        }
        else {
            const cleanPhone = cleanContact.replace(/\D/g, '');
            reg = await this.registrationRepository.findOne({
                where: { phone: cleanPhone },
                order: { registeredAt: 'DESC' }
            });
        }
        if (!reg) {
            return { exists: false };
        }
        const maskEmail = (email) => {
            if (!email)
                return null;
            const parts = email.split('@');
            if (parts.length !== 2)
                return email;
            const [local, domain] = parts;
            if (local.length <= 2)
                return `*@${domain}`;
            return `${local[0]}***${local[local.length - 1]}@${domain}`;
        };
        const maskPhone = (phone) => {
            if (!phone)
                return null;
            const clean = phone.replace(/\D/g, '');
            if (clean.length < 9)
                return phone;
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
    async checkStatus(docNum, phone, lat, lng) {
        const isEmail = phone.includes('@');
        let allRegistrations;
        if (isEmail) {
            const cleanEmail = phone.trim().toLowerCase();
            allRegistrations = await this.registrationRepository.find({
                where: { email: cleanEmail },
                order: { registeredAt: 'ASC' }
            });
        }
        else {
            const cleanPhone = phone.replace(/\D/g, '');
            allRegistrations = await this.registrationRepository.find({
                where: { phone: cleanPhone },
                order: { registeredAt: 'ASC' }
            });
        }
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
                    if (distance <= 0.5) {
                        isSameSite = true;
                        break;
                    }
                }
                else {
                    isSameSite = true;
                    break;
                }
            }
        }
        if (!isSameSite) {
            return { registered: false, existingAtOtherSite: true };
        }
        const po = await this.productionOrderRepository.findOne({ where: { docNum } });
        const modelName = po ? (po.itemName || 'กระจกนิรภัยนำเข้า') : 'กระจกนิรภัยนำเข้า';
        const latestReg = docRegistrations[docRegistrations.length - 1];
        return {
            registered: true,
            count: allRegistrations.length,
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
    async addUnit(dto) {
        const qrModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'QR_CODE_MODE' } });
        const qrMode = qrModeSetting ? qrModeSetting.value : 'STATIC';
        if (qrMode !== 'STATIC') {
            throw new common_1.BadRequestException('การลงทะเบียนบานเพิ่มเติมแบบด่วนรองรับเฉพาะโหมด Static QR เท่านั้น');
        }
        let docNum = null;
        const decoded = this.decryptToken(dto.token);
        if (decoded) {
            docNum = decoded.docNum;
        }
        else {
            if (dto.token.length === 9 && /^\d+$/.test(dto.token)) {
                docNum = dto.token;
            }
        }
        if (!docNum) {
            throw new common_1.BadRequestException('รหัส QR Code ไม่ถูกต้องหรือเสียหาย');
        }
        const isEmail = dto.phone.includes('@');
        let baseReg;
        if (isEmail) {
            const cleanEmail = dto.phone.trim().toLowerCase();
            baseReg = await this.registrationRepository.findOne({
                where: { docNum, email: cleanEmail },
                order: { registeredAt: 'DESC' }
            });
        }
        else {
            const cleanPhone = dto.phone.replace(/\D/g, '');
            baseReg = await this.registrationRepository.findOne({
                where: { docNum, phone: cleanPhone },
                order: { registeredAt: 'DESC' }
            });
        }
        if (!baseReg) {
            throw new common_1.BadRequestException('ไม่พบข้อมูลการลงทะเบียนต้นแบบสำหรับบานนี้');
        }
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
        this.triggerTelegramNotification(newRegistration).catch((err) => {
            this.logger.error('[TELEGRAM ALERT ERROR] Failed to send Telegram duplicate registration message:', err);
        });
        return {
            success: true,
            refCode: registrationId,
            registeredAt: newRegistration.registeredAt || new Date().toISOString(),
        };
    }
};
exports.RegistrationService = RegistrationService;
exports.RegistrationService = RegistrationService = RegistrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(registration_entity_1.Registration)),
    __param(1, (0, typeorm_1.InjectRepository)(production_order_entity_1.ProductionOrder)),
    __param(2, (0, typeorm_1.InjectRepository)(generation_log_entity_1.GenerationLog)),
    __param(3, (0, typeorm_1.InjectRepository)(system_setting_entity_1.SystemSetting)),
    __param(4, (0, typeorm_1.InjectRepository)(product_metadata_entity_1.ProductMetadata)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        telegram_service_1.TelegramService,
        sap_service_1.SapService])
], RegistrationService);
//# sourceMappingURL=registration.service.js.map