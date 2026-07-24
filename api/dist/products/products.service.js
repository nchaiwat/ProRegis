"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const product_metadata_entity_1 = require("./product-metadata.entity");
const production_order_entity_1 = require("../production-order/production-order.entity");
const system_setting_entity_1 = require("../backoffice/system-setting.entity");
const sap_service_1 = require("../sap/sap.service");
const backoffice_service_1 = require("../backoffice/backoffice.service");
const telegram_service_1 = require("../telegram/telegram.service");
const audit_log_entity_1 = require("../audit/audit-log.entity");
const users_service_1 = require("../users/users.service");
const user_entity_1 = require("../users/user.entity");
const generation_log_entity_1 = require("../backoffice/generation-log.entity");
let ProductsService = ProductsService_1 = class ProductsService {
    productMetadataRepository;
    productionOrderRepository;
    generationLogRepository;
    systemSettingRepository;
    auditLogRepository;
    sapService;
    backofficeService;
    configService;
    telegramService;
    usersService;
    logger = new common_1.Logger(ProductsService_1.name);
    constructor(productMetadataRepository, productionOrderRepository, generationLogRepository, systemSettingRepository, auditLogRepository, sapService, backofficeService, configService, telegramService, usersService) {
        this.productMetadataRepository = productMetadataRepository;
        this.productionOrderRepository = productionOrderRepository;
        this.generationLogRepository = generationLogRepository;
        this.systemSettingRepository = systemSettingRepository;
        this.auditLogRepository = auditLogRepository;
        this.sapService = sapService;
        this.backofficeService = backofficeService;
        this.configService = configService;
        this.telegramService = telegramService;
        this.usersService = usersService;
    }
    products = {
        'PR-2024-X1': {
            token: 'PR-2024-X1',
            code: 'PR-2024-X1',
            modelTh: 'สว่านอุตสาหกรรม Pro-X (สว่านไฟฟ้ากำลังสูง)',
            modelEn: 'Pro-X Industrial Drill (High-Torque)',
            manufactureDate: 'ต.ค. 2023',
            lotNo: 'B-992-DELTA',
            poNo: 'PO-884321',
            imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=800&auto=format&fit=crop',
            warrantyPeriod: 'ตลอดอายุการใช้งาน (Lifetime Warranty)',
            specs: {
                th: [
                    { label: 'แรงดันไฟฟ้า', value: '36V Li-Ion' },
                    { label: 'แรงบิดสูงสุด', value: '120 Nm' },
                    { label: 'น้ำหนักเครื่อง', value: '2.4 กก.' },
                    { label: 'ระดับความเร็ว', value: '2 ระดับ (0-500 / 0-2100 RPM)' }
                ],
                en: [
                    { label: 'Voltage', value: '36V Li-Ion' },
                    { label: 'Max Torque', value: '120 Nm' },
                    { label: 'Weight', value: '2.4 kg' },
                    { label: 'Speed Levels', value: '2 Speeds (0-500 / 0-2100 RPM)' }
                ]
            },
            features: {
                th: [
                    'มอเตอร์ไร้แปรงถ่าน EC ขั้นสูง พร้อมระบบป้องกันเซลล์แบตเตอรี่ (ECP)',
                    'หัวจับโลหะแบบไม่ต้องใช้กุญแจขนาด 1.5 - 13 มม. เพื่อความแม่นยำสูง',
                    'ตั้งค่าแรงบิดได้ 25+1 ระดับ เพื่อการขันสกรูที่แม่นยำ',
                    'มาตรฐาน IP54 - ป้องกันฝุ่นและละอองน้ำจากทุกทิศทาง'
                ],
                en: [
                    'Advanced EC brushless motor with Electronic Cell Protection (ECP)',
                    '1.5 - 13 mm keyless metal chuck for high precision work',
                    '25+1 torque settings for precise screwdriving control',
                    'IP54 rating - dust and splash resistant for harsh conditions'
                ]
            }
        },
        'WA-GLASS-7729': {
            token: 'WA-GLASS-7729',
            code: 'WA-WD-SL80',
            modelTh: 'หน้าต่างบานเลื่อนนิรภัย SL80 (กระจกเทมเปอร์ 8 มม.)',
            modelEn: 'SL80 Sliding Safety Window (8mm Tempered Glass)',
            manufactureDate: 'เม.ย. 2026',
            lotNo: 'LOT-882-WIN',
            poNo: 'PO-991043',
            imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
            warrantyPeriod: 'ตลอดอายุการใช้งาน (Lifetime Warranty)',
            specs: {
                th: [
                    { label: 'ประเภทกระจก', value: 'กระจกนิรภัยเทมเปอร์ (Tempered Glass 8mm)' },
                    { label: 'สีกระจก', value: 'สีเขียวตัดแสง (Green Tinted)' },
                    { label: 'วัสดุเฟรม', value: 'อลูมิเนียมเกรดพรีเมียมอบสีพิเศษ (Magnesium-Alloy)' },
                    { label: 'การป้องกันเสียง', value: 'ลดเสียงรบกวนสูงสุด 35 dB' }
                ],
                en: [
                    { label: 'Glass Type', value: '8mm Tempered Safety Glass' },
                    { label: 'Glass Color', value: 'Green Tinted (Heat Absorbing)' },
                    { label: 'Frame Material', value: 'Premium Magnesium-Alloy Aluminum' },
                    { label: 'Acoustic Rating', value: 'Reduces noise up to 35 dB' }
                ]
            },
            features: {
                th: [
                    'กระจกเทมเปอร์นิรภัย แข็งแกร่งกว่ากระจกธรรมดาถึง 5 เท่า แตกแล้วเป็นเม็ดข้าวโพด',
                    'เฟรมดีไซน์ลิขสิทธิ์เฉพาะ ป้องกันน้ำรั่วซึม 100% ด้วยระบบบ่ารางแบบขั้นบันได',
                    'ติดตั้งตัวล็อคสองชั้น (Double Lock) เพื่อความปลอดภัยสูงสุดของบ้าน',
                    'สารเคลือบพิเศษสะท้อนรังสี UV 99% ช่วยประหยัดค่าไฟฟ้าในระยะยาว'
                ],
                en: [
                    'Tempered safety glass, 5x stronger than regular glass, crumbles into small fragments if broken',
                    'Patented frame design with a multi-level sill track ensuring 100% water tightness',
                    'Equipped with a secure double lock mechanism for maximum residential security',
                    'Special UV coating blocking 99% of UV rays, improving thermal efficiency'
                ]
            }
        },
        'WA-LIFETIME-GLASS': {
            token: 'WA-LIFETIME-GLASS',
            code: 'WA-DR-SD90',
            modelTh: 'ประตูนิรภัยกระจกสองชั้น SD90 (รับประกันตลอดอายุการใช้งาน)',
            modelEn: 'SD90 Double-Glazed Safety Door (Lifetime Warranty)',
            manufactureDate: 'พ.ค. 2026',
            lotNo: 'LOT-910-LIFE',
            poNo: 'PO-991500',
            imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop',
            warrantyPeriod: 'ตลอดอายุการใช้งาน (Lifetime Warranty)',
            specs: {
                th: [
                    { label: 'ประเภทกระจก', value: 'กระจกนิรภัยลามิเนตสองชั้น (Double Glazed)' },
                    { label: 'การประหยัดพลังงาน', value: 'สะท้อนความร้อนและป้องกัน UV 99%' },
                    { label: 'ระบบล็อค', value: 'ระบบล็อคหลายจุดความปลอดภัยสูง (Multi-point Lock)' },
                    { label: 'การลดเสียง', value: 'ลดเสียงรบกวนสูงสุด 42 dB' }
                ],
                en: [
                    { label: 'Glass Type', value: 'Double Glazed Laminated Safety Glass' },
                    { label: 'Energy Efficiency', value: 'UV Protection 99% & Heat Reflective' },
                    { label: 'Locking System', value: 'High-Security Multi-point System' },
                    { label: 'Acoustic Rating', value: 'Reduces noise up to 42 dB' }
                ]
            },
            features: {
                th: [
                    'รับประกันตลอดอายุการใช้งานสำหรับกระจกและโครงสร้างหลักของประตู',
                    'ป้องกันรังสีความร้อนและความชื้น 100% ไม่บิดงอหรือเกิดตะไคร่น้ำ',
                    'เฟรมแมกนีเซียม-อลูมิเนียมเกรดอากาศยานพร้อมการเคลือบเงาสุดหรู',
                    'ซีลยาง EPDM 3 ชั้นรอบบานประตู ป้องกันลมฝุ่นและน้ำรั่วซึมสมบูรณ์แบบ'
                ],
                en: [
                    'Lifetime warranty on the glass panels and structural door frame',
                    '100% weather, moisture, and UV resistant - will not warp or degrade',
                    'Aerospace-grade magnesium-aluminum frame with luxury finish',
                    'Triple EPDM rubber seals providing ultimate draft, dust, and water isolation'
                ]
            }
        }
    };
    async downloadImageAsBase64(itemCode) {
        const url1Template = this.configService.get('PRODUCT_IMAGE_URL_1', 'https://windowasia.com/wp-content/uploads/products/{itemCode}.png');
        const url2Template = this.configService.get('PRODUCT_IMAGE_URL_2', 'https://windowasia.com/wp-content/uploads/products/{itemCode}.jpg');
        const placeholder = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop';
        const url1 = url1Template.replace('{itemCode}', itemCode);
        const url2 = url2Template.replace('{itemCode}', itemCode);
        for (const url of [url1, url2]) {
            try {
                this.logger.log(`[PRODUCTS SERVICE] Attempting to download image from: ${url}`);
                const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const contentType = response.headers.get('content-type') || 'image/png';
                    const base64Str = Buffer.from(buffer).toString('base64');
                    this.logger.log(`[PRODUCTS SERVICE] Downloaded image successfully from ${url}`);
                    return `data:${contentType};base64,${base64Str}`;
                }
            }
            catch (err) {
                this.logger.warn(`[PRODUCTS SERVICE] Failed to download image from ${url}: ${err.message}`);
            }
        }
        this.logger.log(`[PRODUCTS SERVICE] Returning placeholder image URL for ${itemCode}`);
        return placeholder;
    }
    async cacheProductMetadata(itemCode, itemName) {
        this.logger.log(`[PRODUCTS SERVICE] Eagerly caching product metadata for ItemCode=${itemCode}, ItemName=${itemName}`);
        let metadata = await this.productMetadataRepository.findOne({ where: { itemCode } });
        if (!metadata) {
            const imageBase64 = await this.downloadImageAsBase64(itemCode);
            metadata = this.productMetadataRepository.create({
                itemCode,
                itemName,
                imageBase64,
            });
            await this.productMetadataRepository.save(metadata);
            this.logger.log(`[PRODUCTS SERVICE] Cached product metadata and image successfully for ItemCode=${itemCode}`);
        }
        else {
            let updated = false;
            if (!metadata.imageBase64 || metadata.imageBase64.startsWith('http')) {
                metadata.imageBase64 = await this.downloadImageAsBase64(itemCode);
                updated = true;
            }
            if (metadata.itemName !== itemName) {
                metadata.itemName = itemName;
                updated = true;
            }
            if (updated) {
                await this.productMetadataRepository.save(metadata);
                this.logger.log(`[PRODUCTS SERVICE] Updated cached product metadata for ItemCode=${itemCode}`);
            }
        }
        if (itemCode.includes('-')) {
            const parts = itemCode.split('-');
            if (parts.length >= 3) {
                const prefix = parts.slice(0, 2).join('-');
                let prefixMeta = await this.productMetadataRepository.findOne({ where: { itemCode: prefix } });
                if (!prefixMeta) {
                    prefixMeta = this.productMetadataRepository.create({
                        itemCode: prefix,
                        itemName: `กลุ่มสินค้าโมเดล ${prefix}`,
                        imageBase64: null,
                    });
                    await this.productMetadataRepository.save(prefixMeta);
                    this.logger.log(`[PRODUCTS SERVICE] Auto-created empty prefix metadata box for: ${prefix}`);
                    try {
                        const editors = await this.usersService.findUsersByRole(user_entity_1.UserRole.IMAGE_EDITOR);
                        const activeEditors = editors.filter(e => e.telegramId && e.status === user_entity_1.UserStatus.ACTIVE);
                        if (activeEditors.length > 0) {
                            const message = [
                                `⚠️ <b>[ProRegis] ตรวจพบกลุ่มสินค้าใหม่ที่ยังไม่มีรูปภาพ</b>`,
                                `• <b>กลุ่มสินค้า (Product Group):</b> <code>${prefix}</code>`,
                                `• <b>รหัสสินค้าเริ่มต้น:</b> <code>${itemCode}</code>`,
                                `• <b>ชื่อกลุ่มสินค้า:</b> กลุ่มสินค้าโมเดล ${prefix}`,
                                ``,
                                `<i>กรุณาเข้าสู่ระบบ Backoffice เพื่ออัปโหลดรูปภาพสำหรับกลุ่มสินค้านี้</i>`
                            ].join('\n');
                            for (const editor of activeEditors) {
                                await this.telegramService.sendDirectMessage(editor.telegramId, message);
                            }
                        }
                    }
                    catch (telErr) {
                        this.logger.error(`[PRODUCTS SERVICE] Failed to send Telegram alert for new group ${prefix}: ${telErr.message}`);
                    }
                }
            }
        }
        return metadata;
    }
    formatManufactureDate(date, lang) {
        if (!date)
            return 'N/A';
        const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = date.getMonth();
        const y = date.getFullYear();
        return lang === 'th' ? `${monthsTh[m]} ${y}` : `${monthsEn[m]} ${y}`;
    }
    async findOne(token) {
        if (this.products[token]) {
            return this.products[token];
        }
        let docNum = null;
        let seqNum = null;
        const decrypted = this.backofficeService.decryptToken(token);
        if (decrypted) {
            docNum = decrypted.docNum;
            seqNum = decrypted.seqNum;
        }
        else {
            if (token.length === 12 && /^\d+$/.test(token)) {
                docNum = token.substring(0, 9);
                seqNum = token.substring(9, 12);
            }
            else if (token.length === 9 && /^\d+$/.test(token)) {
                docNum = token;
            }
        }
        if (!docNum) {
            throw new common_1.BadRequestException('ไม่พบรหัสใบสั่งผลิตใน QR Code');
        }
        let po = await this.productionOrderRepository.findOne({ where: { docNum } });
        if (po) {
            await this.auditLogRepository.save(this.auditLogRepository.create({
                actorUsername: 'CUSTOMER',
                action: 'DB_CACHE_HIT',
                resource: 'ProductionOrder',
                resourceId: docNum,
            })).catch(() => { });
        }
        else {
            this.logger.log(`[PRODUCTS SERVICE] Production Order not found in local DB. Fetching from SAP: DocNum=${docNum}`);
            let sapPo;
            try {
                sapPo = await this.sapService.getProductionOrder(docNum);
                await this.auditLogRepository.save(this.auditLogRepository.create({
                    actorUsername: 'CUSTOMER',
                    action: 'SAP_FETCH_SUCCESS',
                    resource: 'ProductionOrder',
                    resourceId: docNum,
                    details: JSON.stringify({ reason: 'customer_lookup' }),
                })).catch(() => { });
            }
            catch (err) {
                const errorSummary = err.message && err.message.length > 300
                    ? err.message.substring(0, 300) + '... (truncated)'
                    : err.message;
                await this.auditLogRepository.save(this.auditLogRepository.create({
                    actorUsername: 'CUSTOMER',
                    action: 'SAP_FETCH_ERROR',
                    resource: 'ProductionOrder',
                    resourceId: docNum,
                    details: JSON.stringify({ error: errorSummary }),
                })).catch(() => { });
                const telegramMessage = [
                    `🔳 <b>[ProRegis Alert] SAP B1 Connection Failed</b>`,
                    `📍 <b>DocNum:</b> <code>${docNum}</code>`,
                    `🕒 <b>Time:</b> ${new Date().toLocaleString('th-TH')}`,
                    `⚠️ <b>Error:</b> <code>${errorSummary}</code>`,
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━`
                ].join('\n');
                try {
                    await this.telegramService.sendMessage(telegramMessage);
                }
                catch (tgErr) {
                    this.logger.error(`[PRODUCTS SERVICE] Failed to send Telegram alert: ${tgErr.message}`);
                }
                throw new common_1.BadRequestException('การเชื่อมต่อระบบบริการข้อมูลสินค้าขัดข้องชั่วคราว (ระบบได้รายงานให้ผู้ดูแลระบบทราบเรียบร้อยแล้ว) โปรดลองใหม่อีกครั้งภายหลัง');
            }
            if (!sapPo) {
                throw new common_1.BadRequestException('ไม่พบข้อมูลใบสั่งผลิตนี้ในระบบ SAP B1');
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
            this.logger.log(`[PRODUCTS SERVICE] Cached Production Order from SAP to local DB: DocNum=${docNum}`);
        }
        const itemCode = po.itemCode;
        const itemName = po.itemName || `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9)}`;
        let metadata = await this.productMetadataRepository.findOne({ where: { itemCode } });
        if (!metadata) {
            this.logger.log(`[PRODUCTS SERVICE] Product metadata not found in local DB for ItemCode=${itemCode}. Creating cached entry.`);
            metadata = await this.cacheProductMetadata(itemCode, itemName);
        }
        let mfgDateTh = 'N/A';
        let mfgDateEn = 'N/A';
        if (po.startDate) {
            const parsedDate = new Date(po.startDate);
            if (!isNaN(parsedDate.getTime())) {
                mfgDateTh = this.formatManufactureDate(parsedDate, 'th');
                mfgDateEn = this.formatManufactureDate(parsedDate, 'en');
            }
        }
        if (mfgDateTh === 'N/A' && po.createdAt) {
            mfgDateTh = this.formatManufactureDate(po.createdAt, 'th');
            mfgDateEn = this.formatManufactureDate(po.createdAt, 'en');
        }
        const plannedQtyValue = po.plannedQty > 0 ? `${po.plannedQty}` : 'N/A';
        let productType = { th: 'กระจกและหน้าต่างโครงสร้าง', en: 'Structural Glass/Window' };
        let productStyle = { th: 'N/A', en: 'N/A' };
        let productPane = { th: 'N/A', en: 'N/A' };
        let glassType = { th: 'กระจกเขียวใสตัดแสง', en: 'Green Tinted Glass' };
        let glassThickness = { th: '5 มม.', en: '5 mm' };
        let screenType = { th: 'N/A', en: 'N/A' };
        const colorMap = {
            'ขาว': { th: 'สีขาว', en: 'White' },
            'อบขาว': { th: 'สีอบขาว', en: 'Powder White' },
            'ดำ': { th: 'สีดำ', en: 'Black' },
            'เทา': { th: 'สีเทา', en: 'Grey' },
            'อลูมิเนียม': { th: 'สีอลูมิเนียม', en: 'Aluminum' },
            'น้ำตาล': { th: 'สีน้ำตาล', en: 'Brown' },
            'นต.': { th: 'สีน้ำตาล', en: 'Brown' },
            'นต': { th: 'สีน้ำตาล', en: 'Brown' },
            'ชา': { th: 'สีชา', en: 'Bronze' },
            'เงิน': { th: 'สีเงิน', en: 'Silver' },
        };
        let matchedColor = { th: 'N/A', en: 'N/A' };
        let matchedSize = { th: 'N/A', en: 'N/A' };
        if (po.itemName) {
            for (const [key, val] of Object.entries(colorMap)) {
                if (po.itemName.includes(key)) {
                    matchedColor = val;
                    break;
                }
            }
            const dimRegex = /(\d+)\s*[xX\*]\s*(\d+)/;
            const dimMatch = po.itemName.match(dimRegex);
            if (dimMatch) {
                const w = dimMatch[1];
                const h = dimMatch[2];
                matchedSize = {
                    th: `${w} x ${h} ซม.`,
                    en: `${w} x ${h} cm`
                };
            }
            const nameUpper = po.itemName.toUpperCase();
            if (nameUpper.includes('WINDOW') || nameUpper.includes('หน้าต่าง') || nameUpper.includes('บานเลื่อน') || nameUpper.includes('บานกระทุ้ง')) {
                productType = { th: 'หน้าต่าง', en: 'Window' };
            }
            else if (nameUpper.includes('DOOR') || nameUpper.includes('ประตู')) {
                productType = { th: 'ประตู', en: 'Door' };
            }
            if (nameUpper.includes('SS')) {
                productStyle = { th: 'บานเลื่อน (SS)', en: 'Sliding Window (SS)' };
                productPane = { th: '2 บาน', en: '2 Panes' };
            }
            else if (nameUpper.includes('FSSF')) {
                productStyle = { th: 'บานเลื่อน (FSSF)', en: 'Sliding Window (FSSF)' };
                productPane = { th: '4 บาน', en: '4 Panes' };
            }
            else if (nameUpper.includes('กระทุ้ง') || nameUpper.includes('AWNING') || nameUpper.includes('AW')) {
                productStyle = { th: 'บานกระทุ้ง', en: 'Awning Window' };
                productPane = { th: '1 บาน', en: '1 Pane' };
            }
            else {
                productStyle = { th: 'บานเลื่อน', en: 'Sliding Window' };
            }
            if (nameUpper.includes('เทมเปอร์') || nameUpper.includes('TEMPERED')) {
                glassType = { th: 'กระจกเทมเปอร์', en: 'Tempered Glass' };
            }
            else if (nameUpper.includes('ลามิเนต') || nameUpper.includes('LAMINATED')) {
                glassType = { th: 'กระจกลามิเนต', en: 'Laminated Glass' };
            }
            else if (nameUpper.includes('เขียว') || nameUpper.includes('GREEN')) {
                glassType = { th: 'กระจกเขียวใสตัดแสง', en: 'Green Tinted Glass' };
            }
            const thickRegex = /(\d+)\s*(?:มิล|มม|mm)/i;
            const thickMatch = po.itemName.match(thickRegex);
            if (thickMatch) {
                glassThickness = { th: `${thickMatch[1]} มม.`, en: `${thickMatch[1]} mm` };
            }
            if (nameUpper.includes('ไม่มีมุ้ง')) {
                screenType = { th: 'ไม่มีมุ้ง', en: 'Without Net' };
            }
            else if (nameUpper.includes('มุ้ง') || nameUpper.includes('SCREEN')) {
                screenType = { th: 'มีมุ้ง', en: 'With Net' };
            }
        }
        const qrModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'QR_CODE_MODE' } });
        const qrMode = qrModeSetting ? qrModeSetting.value : 'STATIC';
        const verificationModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'VERIFICATION_MODE' } });
        const verificationMode = verificationModeSetting ? verificationModeSetting.value : 'OTP';
        const smsOtpModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_OTP_MODE' } });
        const smsOtpMode = smsOtpModeSetting ? smsOtpModeSetting.value : 'TEST';
        let imageUrl = null;
        const placeholderUrl = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop';
        if (itemCode && itemCode.includes('-')) {
            const parts = itemCode.split('-');
            if (parts.length >= 3) {
                const prefix = parts.slice(0, parts.length - 1).join('-');
                const prefixMetadata = await this.productMetadataRepository.findOne({ where: { itemCode: prefix } });
                if (prefixMetadata && prefixMetadata.imageBase64 && !prefixMetadata.imageBase64.startsWith('http')) {
                    imageUrl = prefixMetadata.imageBase64;
                }
            }
        }
        if (!imageUrl) {
            imageUrl = metadata.imageBase64;
        }
        if (!imageUrl || imageUrl.startsWith('http') || imageUrl === placeholderUrl) {
            imageUrl = placeholderUrl;
        }
        return {
            token: token,
            code: itemCode,
            modelTh: metadata.itemName || 'กระจกหน้าต่างอลีมิเนียมนำเข้าซีรีส์ย่อย',
            modelEn: metadata.itemName || 'Imported Aluminum Window Sub-Series',
            manufactureDate: mfgDateTh,
            lotNo: '',
            poNo: plannedQtyValue,
            imageUrl,
            warrantyPeriod: 'ตลอดอายุการใช้งาน (Lifetime Warranty)',
            qrMode,
            verificationMode,
            smsOtpMode,
            seqNum: seqNum || null,
            specs: {
                th: [
                    { label: 'ประเภทสินค้า', value: productType.th },
                    { label: 'รูปแบบสินค้า', value: productStyle.th },
                    { label: 'ลักษณะบาน', value: productPane.th },
                    { label: 'ลักษณะกระจก', value: glassType.th },
                    { label: 'ความหนากระจก (มม.)', value: glassThickness.th },
                    { label: 'แบบมี/ไม่มีมุ้ง', value: screenType.th },
                    { label: 'ขนาด (กว้าง x สูง)', value: matchedSize.th },
                    { label: 'สี', value: matchedColor.th },
                    { label: 'มาตรฐานควบคุม', value: 'ISO 9001:2015' },
                ],
                en: [
                    { label: 'Product Type', value: productType.en },
                    { label: 'Product Style', value: productStyle.en },
                    { label: 'Pane Details', value: productPane.en },
                    { label: 'Glass Type', value: glassType.en },
                    { label: 'Glass Thickness', value: glassThickness.en },
                    { label: 'Screen Inclusion', value: screenType.en },
                    { label: 'Dimensions (W x H)', value: matchedSize.en },
                    { label: 'Color', value: matchedColor.en },
                    { label: 'Compliance Standard', value: 'ISO 9001:2015' },
                ]
            },
            features: {
                th: [
                    'ผลิตจากอลูมิเนียมหนาพิเศษ แข็งแรง ทนลมพายุได้ดีเยี่ยม',
                    'กระจกฉนวนประหยัดพลังงาน ช่วยสะท้อนรังสีความร้อนของดวงอาทิตย์',
                    'ไร้สารตะกั่วและสารที่เป็นอันตราย ได้รับการรับรองตามมาตรฐาน RoHS'
                ],
                en: [
                    'Heavy-duty aluminum profile designed for superior wind load resistance',
                    'Energy-efficient insulated glass pane helping reject solar heat',
                    'Lead-free and eco-friendly components, RoHS directive compliant'
                ]
            }
        };
    }
    async uploadProductImage(itemCode, imageBase64) {
        let metadata = await this.productMetadataRepository.findOne({ where: { itemCode } });
        if (!metadata) {
            metadata = this.productMetadataRepository.create({
                itemCode,
                itemName: itemCode.includes('-') ? `สินค้ากลุ่มรหัส ${itemCode}` : 'สินค้าทั่วไป',
                imageBase64,
            });
        }
        else {
            metadata.imageBase64 = imageBase64;
        }
        return this.productMetadataRepository.save(metadata);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_metadata_entity_1.ProductMetadata)),
    __param(1, (0, typeorm_1.InjectRepository)(production_order_entity_1.ProductionOrder)),
    __param(2, (0, typeorm_1.InjectRepository)(generation_log_entity_1.GenerationLog)),
    __param(3, (0, typeorm_1.InjectRepository)(system_setting_entity_1.SystemSetting)),
    __param(4, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(6, (0, common_1.Inject)((0, common_1.forwardRef)(() => backoffice_service_1.BackofficeService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        sap_service_1.SapService,
        backoffice_service_1.BackofficeService,
        config_1.ConfigService,
        telegram_service_1.TelegramService,
        users_service_1.UsersService])
], ProductsService);
//# sourceMappingURL=products.service.js.map