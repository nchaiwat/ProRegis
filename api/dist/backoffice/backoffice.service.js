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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackofficeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const generation_log_entity_1 = require("./generation-log.entity");
const production_order_entity_1 = require("../production-order/production-order.entity");
const registration_entity_1 = require("../registration/registration.entity");
const telegram_service_1 = require("../telegram/telegram.service");
const sap_service_1 = require("../sap/sap.service");
const crypto = __importStar(require("crypto"));
const SECRET_KEY = crypto
    .createHash('sha256')
    .update(process.env.AES_SECRET_KEY || 'WindowAsiaSecretKey2026')
    .digest()
    .slice(0, 16);
const IV = crypto
    .createHash('sha256')
    .update(process.env.AES_IV_KEY || 'WindowAsiaIV2026')
    .digest()
    .slice(0, 16);
let BackofficeService = class BackofficeService {
    logRepository;
    productionOrderRepository;
    registrationRepository;
    telegramService;
    sapService;
    constructor(logRepository, productionOrderRepository, registrationRepository, telegramService, sapService) {
        this.logRepository = logRepository;
        this.productionOrderRepository = productionOrderRepository;
        this.registrationRepository = registrationRepository;
        this.telegramService = telegramService;
        this.sapService = sapService;
    }
    encryptToToken(docNum, seqStr) {
        const rawData = `${docNum}:${seqStr}`;
        const cipher = crypto.createCipheriv('aes-128-cbc', SECRET_KEY, IV);
        let encrypted = cipher.update(rawData, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
    decryptToken(token) {
        try {
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
        }
        catch {
            return null;
        }
    }
    async getNextSequence(docNum) {
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
    async generateBatch(actor, docNum, startSeq, quantity, ipAddress) {
        if (!docNum || !/^\d{9}$/.test(docNum)) {
            throw new common_1.BadRequestException('DocNum ต้องเป็นตัวเลข 9 หลัก เช่น 260600007');
        }
        if (quantity < 1 || quantity > 500) {
            throw new common_1.BadRequestException('จำนวน QR ต้องอยู่ระหว่าง 1 ถึง 500');
        }
        const requestedEndSeq = startSeq + quantity - 1;
        const overlaps = await this.logRepository
            .createQueryBuilder('log')
            .where('log.docNum = :docNum', { docNum })
            .andWhere('(log.startSeq <= :requestedEndSeq AND (log.startSeq + log.quantity - 1) >= :startSeq)', { requestedEndSeq, startSeq })
            .getMany();
        if (overlaps.length > 0) {
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
            throw new common_1.BadRequestException(`ช่วง Running Number ${startSeq} ถึง ${requestedEndSeq} มีบางส่วนซ้ำซ้อนหรือเหลื่อมกับรหัส QR ที่สร้างไว้แล้วในระบบ (Running ล่าสุดคือ ${nextSeq - 1}, แนะนำให้สร้างต่อที่ลำดับที่ ${nextSeq})`);
        }
        const rows = [];
        for (let i = 0; i < quantity; i++) {
            const seq = startSeq + i;
            const seqStr = String(seq).padStart(3, '0');
            const code = this.encryptToToken(docNum, seqStr);
            const pd = `${docNum}${seqStr}`;
            rows.push({ code, pd });
        }
        const log = this.logRepository.create({
            username: actor,
            docNum,
            startSeq,
            quantity,
            ipAddress: ipAddress || null,
        });
        await this.logRepository.save(log);
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
        }
        catch (err) {
            console.error('[CACHE ERROR] Failed to cache production order during QR generation:', err);
        }
        console.log(`[BACKOFFICE] ${actor} generated ${quantity} QR codes for DocNum ${docNum} (seq ${startSeq}–${startSeq + quantity - 1})`);
        return rows;
    }
    buildCsv(rows) {
        const BOM = '\uFEFF';
        const header = 'Code,PD';
        const lines = rows.map((r) => `${r.code},${r.pd}`);
        return BOM + [header, ...lines].join('\r\n');
    }
    async getLogs(limit = 100) {
        return this.logRepository.find({
            order: { generatedAt: 'DESC' },
            take: limit,
        });
    }
    async getDashboardSummary(startDate, endDate) {
        const genLogs = await this.logRepository.find();
        let totalGenerated = 0;
        for (const log of genLogs) {
            totalGenerated += log.quantity;
        }
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
        const productQuery = this.registrationRepository.createQueryBuilder('reg')
            .innerJoin(production_order_entity_1.ProductionOrder, 'po', 'reg.docNum = po.docNum')
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
    async getProductionTrackerList() {
        const productionOrders = await this.productionOrderRepository.find({
            order: { createdAt: 'DESC' },
        });
        const trackerList = [];
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
    async checkProduct(token, label) {
        let docNum = null;
        let seqNum = null;
        if (token) {
            const decoded = this.decryptToken(token);
            if (decoded) {
                docNum = decoded.docNum;
                seqNum = decoded.seqNum;
            }
            else {
                if (token.length === 12 && /^\d+$/.test(token)) {
                    docNum = token.substring(0, 9);
                    seqNum = token.substring(9, 12);
                }
                else {
                    throw new common_1.BadRequestException('รหัส Token ไม่ถูกต้องหรือไม่สามารถถอดรหัสได้');
                }
            }
        }
        else if (label) {
            const cleanLabel = label.trim().replace(/[-]/g, '');
            if (cleanLabel.length === 12 && /^\d+$/.test(cleanLabel)) {
                docNum = cleanLabel.substring(0, 9);
                seqNum = cleanLabel.substring(9, 12);
            }
            else {
                throw new common_1.BadRequestException('รหัสสินค้าต้องเป็นตัวเลข 12 หลัก (Lot 9 หลัก + running 3 หลัก)');
            }
        }
        else {
            throw new common_1.BadRequestException('กรุณาระบุ Token หรือรหัส Label ของสินค้า');
        }
        const registration = await this.registrationRepository.findOne({
            where: { docNum: docNum || '', seqNum: seqNum || '' }
        });
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
            }
            catch (err) {
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
    async getLotSummary(docNum) {
        if (!docNum || !/^\d{9}$/.test(docNum)) {
            throw new common_1.BadRequestException('DocNum ต้องเป็นตัวเลข 9 หลัก');
        }
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
            }
            catch (err) {
                console.error('[SAP ERROR] Failed to fetch product details in getLotSummary:', err);
                po = this.productionOrderRepository.create({
                    docNum,
                    itemCode: `FA00-D0112-200${docNum.substring(5, 9)}`,
                    itemName: `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9)}`,
                    plannedQty: 100,
                });
            }
        }
        const totalQty = po.plannedQty || 100;
        const registrations = await this.registrationRepository.find({
            where: { docNum }
        });
        const regMap = new Map();
        for (const r of registrations) {
            if (r.seqNum) {
                regMap.set(String(parseInt(r.seqNum, 10)), r);
            }
        }
        const items = [];
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
            }
            else {
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
};
exports.BackofficeService = BackofficeService;
exports.BackofficeService = BackofficeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(generation_log_entity_1.GenerationLog)),
    __param(1, (0, typeorm_1.InjectRepository)(production_order_entity_1.ProductionOrder)),
    __param(2, (0, typeorm_1.InjectRepository)(registration_entity_1.Registration)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        telegram_service_1.TelegramService,
        sap_service_1.SapService])
], BackofficeService);
//# sourceMappingURL=backoffice.service.js.map