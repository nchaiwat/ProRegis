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
}
exports.RegistrationDto = RegistrationDto;
let RegistrationService = RegistrationService_1 = class RegistrationService {
    registrationRepository;
    productionOrderRepository;
    telegramService;
    logger = new common_1.Logger(RegistrationService_1.name);
    constructor(registrationRepository, productionOrderRepository, telegramService) {
        this.registrationRepository = registrationRepository;
        this.productionOrderRepository = productionOrderRepository;
        this.telegramService = telegramService;
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
    async registerProduct(dto) {
        if (!dto.mandatoryConsent) {
            throw new common_1.BadRequestException('Mandatory data consent must be agreed.');
        }
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
            throw new common_1.BadRequestException('รหัส QR Code ไม่ถูกต้องหรือเสียหาย');
        }
        const po = await this.productionOrderRepository.findOne({ where: { docNum } });
        if (!po) {
            throw new common_1.BadRequestException('ไม่พบข้อมูลใบสั่งผลิตนี้ในระบบ หรือยังไม่ได้มีการสร้างรหัส QR Code จากทางพนักงานของบริษัท โปรดติดต่อเจ้าหน้าที่ดูแลระบบ');
        }
        const existingRegistration = await this.registrationRepository.findOne({
            where: { docNum, seqNum }
        });
        if (existingRegistration) {
            const timeStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
            const oldRegTime = new Date(existingRegistration.registeredAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
            const itemCode = await this.getOrFetchItemCode(docNum);
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
            const formattedOldDate = new Date(existingRegistration.registeredAt).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            throw new common_1.BadRequestException(`สินค้านี้ถูกลงทะเบียนไปแล้วเมื่อวันที่ ${formattedOldDate} น. ที่จังหวัด ${existingRegistration.province} โปรดติดต่อเจ้าหน้าที่ดูแลระบบหากพบปัญหา`);
        }
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
        return 'ไม่ระบุ';
    }
    async triggerTelegramNotification(reg) {
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
    async getRegistrationsByPhone(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const registrations = await this.registrationRepository.find({
            where: { phone: cleanPhone },
            order: { registeredAt: 'DESC' },
        });
        const results = [];
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
    async checkPhoneExists(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const count = await this.registrationRepository.count({
            where: { phone: cleanPhone }
        });
        return count > 0;
    }
};
exports.RegistrationService = RegistrationService;
exports.RegistrationService = RegistrationService = RegistrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(registration_entity_1.Registration)),
    __param(1, (0, typeorm_1.InjectRepository)(production_order_entity_1.ProductionOrder)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        telegram_service_1.TelegramService])
], RegistrationService);
//# sourceMappingURL=registration.service.js.map