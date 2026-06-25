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
const sap_service_1 = require("../sap/sap.service");
const backoffice_service_1 = require("../backoffice/backoffice.service");
let ProductsService = ProductsService_1 = class ProductsService {
    productMetadataRepository;
    productionOrderRepository;
    sapService;
    backofficeService;
    configService;
    logger = new common_1.Logger(ProductsService_1.name);
    constructor(productMetadataRepository, productionOrderRepository, sapService, backofficeService, configService) {
        this.productMetadataRepository = productMetadataRepository;
        this.productionOrderRepository = productionOrderRepository;
        this.sapService = sapService;
        this.backofficeService = backofficeService;
        this.configService = configService;
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
        this.logger.log(`[PRODUCTS SERVICE] Falling back to placeholder image for ${itemCode}`);
        return placeholder;
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
        let itemCode = `FA00-D0112-200${docNum ? docNum.substring(5, 9) : '000'}`;
        let itemName = `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum ? docNum.substring(6, 9) : '000'}`;
        let plannedQty = 100;
        if (docNum) {
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
                    this.logger.error(`[PRODUCTS SERVICE] Failed to fetch production order from SAP: ${err.message}`);
                }
            }
            if (po) {
                itemCode = po.itemCode;
                itemName = po.itemName || itemName;
                plannedQty = po.plannedQty || plannedQty;
            }
        }
        let metadata = await this.productMetadataRepository.findOne({ where: { itemCode } });
        if (!metadata) {
            const imageBase64 = await this.downloadImageAsBase64(itemCode);
            metadata = this.productMetadataRepository.create({
                itemCode,
                itemName,
                imageBase64,
            });
            await this.productMetadataRepository.save(metadata);
        }
        return {
            token: token,
            code: itemCode,
            modelTh: metadata.itemName || 'กระจกหน้าต่างอลูมิเนียมนำเข้าซีรีส์ย่อย',
            modelEn: metadata.itemName || 'Imported Aluminum Window Sub-Series',
            manufactureDate: 'ก.พ. 2026',
            lotNo: docNum ? `LOT-${docNum}` : 'LOT-992-GEN',
            poNo: docNum || 'PO-88390',
            imageUrl: metadata.imageBase64 || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop',
            warrantyPeriod: 'ตลอดอายุการใช้งาน (Lifetime Warranty)',
            specs: {
                th: [
                    { label: 'เลขที่ใบสั่งผลิต', value: docNum || '-' },
                    { label: 'ลำดับที่', value: seqNum ? `ชิ้นที่ ${parseInt(seqNum, 10)}` : '-' },
                    { label: 'วันที่ผลิต', value: 'ก.พ. 2026' },
                    { label: 'มาตรฐานควบคุม', value: 'ISO 9001:2015' },
                ],
                en: [
                    { label: 'Production Order', value: docNum || '-' },
                    { label: 'Unit No.', value: seqNum ? `Unit ${parseInt(seqNum, 10)}` : '-' },
                    { label: 'Manufacture Date', value: 'Feb 2026' },
                    { label: 'Compliance Standard', value: 'ISO 9001:2015' },
                ]
            },
            features: {
                th: [
                    'ผลิตจากอลูมิเนียมหนาพิเศษ แข็งแรง ทนลมพายุได้ดีเยี่ยม',
                    'กระจกฉนวนประหยัดพลังงาน ช่วยสะท้อนรังสีความร้อนของดวงอาทิตย์',
                    'ดีไซน์ขอบบางเพิ่มมุมมองภายนอกที่กว้างขวางขึ้น'
                ],
                en: [
                    'Heavy-duty aluminum profile designed for superior wind load resistance',
                    'Energy-efficient insulated glass pane helping reject solar heat',
                    'Slim profile frame maximizing natural daylight and viewing area'
                ]
            }
        };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_metadata_entity_1.ProductMetadata)),
    __param(1, (0, typeorm_1.InjectRepository)(production_order_entity_1.ProductionOrder)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        sap_service_1.SapService,
        backoffice_service_1.BackofficeService,
        config_1.ConfigService])
], ProductsService);
//# sourceMappingURL=products.service.js.map