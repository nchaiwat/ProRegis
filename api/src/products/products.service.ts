import { Injectable, Logger, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ProductMetadata } from './product-metadata.entity';
import { ProductionOrder } from '../production-order/production-order.entity';
import { SystemSetting } from '../backoffice/system-setting.entity';
import { SapService } from '../sap/sap.service';
import { BackofficeService } from '../backoffice/backoffice.service';

export interface Product {
  token: string;
  code: string;
  modelTh: string;
  modelEn: string;
  manufactureDate: string;
  lotNo: string;
  poNo: string;
  imageUrl: string;
  warrantyPeriod: string;
  qrMode?: string;
  verificationMode?: string;
  smsOtpMode?: string;
  seqNum?: string | null;
  specs: {
    th: { label: string; value: string }[];
    en: { label: string; value: string }[];
  };
  features: {
    th: string[];
    en: string[];
  };
}

import { GenerationLog } from '../backoffice/generation-log.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(ProductMetadata)
    private readonly productMetadataRepository: Repository<ProductMetadata>,
    @InjectRepository(ProductionOrder)
    private readonly productionOrderRepository: Repository<ProductionOrder>,
    @InjectRepository(GenerationLog)
    private readonly generationLogRepository: Repository<GenerationLog>,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
    private readonly sapService: SapService,
    @Inject(forwardRef(() => BackofficeService))
    private readonly backofficeService: BackofficeService,
    private readonly configService: ConfigService,
  ) {}

  private readonly products: Record<string, Product> = {
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

  private async downloadImageAsBase64(itemCode: string): Promise<string> {
    const url1Template = this.configService.get<string>('PRODUCT_IMAGE_URL_1', 'https://windowasia.com/wp-content/uploads/products/{itemCode}.png');
    const url2Template = this.configService.get<string>('PRODUCT_IMAGE_URL_2', 'https://windowasia.com/wp-content/uploads/products/{itemCode}.jpg');
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
      } catch (err) {
        this.logger.warn(`[PRODUCTS SERVICE] Failed to download image from ${url}: ${err.message}`);
      }
    }

    this.logger.log(`[PRODUCTS SERVICE] Returning placeholder image URL for ${itemCode}`);
    return placeholder;
  }

  async cacheProductMetadata(itemCode: string, itemName: string): Promise<ProductMetadata> {
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
    } else {
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

    // Auto-create empty gallery card placeholder for prefix model (Issue #6)
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
        }
      }
    }

    return metadata;
  }

  private formatManufactureDate(date: Date, lang: 'th' | 'en'): string {
    if (!date) return 'N/A';
    const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = date.getMonth();
    const y = date.getFullYear();
    return lang === 'th' ? `${monthsTh[m]} ${y}` : `${monthsEn[m]} ${y}`;
  }

  async findOne(token: string): Promise<Product> {
    if (this.products[token]) {
      return this.products[token];
    }

    let docNum: string | null = null;
    let seqNum: string | null = null;

    const decrypted = this.backofficeService.decryptToken(token);
    if (decrypted) {
      docNum = decrypted.docNum;
      seqNum = decrypted.seqNum;
    } else {
      if (token.length === 12 && /^\d+$/.test(token)) {
        docNum = token.substring(0, 9);
        seqNum = token.substring(9, 12);
      } else if (token.length === 9 && /^\d+$/.test(token)) {
        docNum = token;
      }
    }

    if (!docNum) {
      throw new BadRequestException('ไม่พบรหัสใบสั่งผลิตใน QR Code');
    }

    let po = await this.productionOrderRepository.findOne({ where: { docNum } });
    if (!po) {
      this.logger.log(`[PRODUCTS SERVICE] Production Order not found in local DB. Fetching from SAP: DocNum=${docNum}`);
      let sapPo;
      try {
        sapPo = await this.sapService.getProductionOrder(docNum);
      } catch (err) {
        throw new BadRequestException(`การเชื่อมต่อระบบ SAP B1 ขัดข้อง: ${err.message}`);
      }
      
      if (!sapPo) {
        throw new BadRequestException('ไม่พบข้อมูลใบสั่งผลิตนี้ในระบบ SAP B1');
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
      this.logger.log(`[PRODUCTS SERVICE] Cached Production Order from SAP to local DB: DocNum=${docNum}`);
    }

    const itemCode = po.itemCode;
    const itemName = po.itemName || `กระจกนิรภัยนำเข้า ซีรีส์ ${docNum.substring(6, 9)}`;
    
    let metadata = await this.productMetadataRepository.findOne({ where: { itemCode } });
    if (!metadata) {
      this.logger.log(`[PRODUCTS SERVICE] Product metadata not found in local DB for ItemCode=${itemCode}. Creating cached entry.`);
      metadata = await this.cacheProductMetadata(itemCode, itemName);
    }

    // Dynamic specs from DB & SAP
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

    // Parse description for specifications and characteristics
    let productType = { th: 'กระจกและหน้าต่างโครงสร้าง', en: 'Structural Glass/Window' };
    let productStyle = { th: 'N/A', en: 'N/A' };
    let productPane = { th: 'N/A', en: 'N/A' };
    let glassType = { th: 'กระจกเขียวใสตัดแสง', en: 'Green Tinted Glass' };
    let glassThickness = { th: '5 มม.', en: '5 mm' };
    let screenType = { th: 'N/A', en: 'N/A' };

    // Parse description for size (Width x Height) and Color
    const colorMap: Record<string, { th: string; en: string }> = {
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
      // 1. Match Color
      for (const [key, val] of Object.entries(colorMap)) {
        if (po.itemName.includes(key)) {
          matchedColor = val;
          break;
        }
      }

      // 2. Match Dimensions (e.g. 60x40 or 120 x 110)
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

      // 3. Product Type
      if (nameUpper.includes('WINDOW') || nameUpper.includes('หน้าต่าง') || nameUpper.includes('บานเลื่อน') || nameUpper.includes('บานกระทุ้ง')) {
        productType = { th: 'หน้าต่าง', en: 'Window' };
      } else if (nameUpper.includes('DOOR') || nameUpper.includes('ประตู')) {
        productType = { th: 'ประตู', en: 'Door' };
      }

      // 4. Style & Panes
      if (nameUpper.includes('SS')) {
        productStyle = { th: 'บานเลื่อน (SS)', en: 'Sliding Window (SS)' };
        productPane = { th: '2 บาน', en: '2 Panes' };
      } else if (nameUpper.includes('FSSF')) {
        productStyle = { th: 'บานเลื่อน (FSSF)', en: 'Sliding Window (FSSF)' };
        productPane = { th: '4 บาน', en: '4 Panes' };
      } else if (nameUpper.includes('กระทุ้ง') || nameUpper.includes('AWNING') || nameUpper.includes('AW')) {
        productStyle = { th: 'บานกระทุ้ง', en: 'Awning Window' };
        productPane = { th: '1 บาน', en: '1 Pane' };
      } else {
        // default Sliding
        productStyle = { th: 'บานเลื่อน', en: 'Sliding Window' };
      }

      // 5. Glass Type
      if (nameUpper.includes('เทมเปอร์') || nameUpper.includes('TEMPERED')) {
        glassType = { th: 'กระจกเทมเปอร์', en: 'Tempered Glass' };
      } else if (nameUpper.includes('ลามิเนต') || nameUpper.includes('LAMINATED')) {
        glassType = { th: 'กระจกลามิเนต', en: 'Laminated Glass' };
      } else if (nameUpper.includes('เขียว') || nameUpper.includes('GREEN')) {
        glassType = { th: 'กระจกเขียวใสตัดแสง', en: 'Green Tinted Glass' };
      }

      // 6. Glass Thickness
      const thickRegex = /(\d+)\s*(?:มิล|มม|mm)/i;
      const thickMatch = po.itemName.match(thickRegex);
      if (thickMatch) {
        glassThickness = { th: `${thickMatch[1]} มม.`, en: `${thickMatch[1]} mm` };
      }

      // 7. Screen Inclusion
      if (nameUpper.includes('ไม่มีมุ้ง')) {
        screenType = { th: 'ไม่มีมุ้งลวด', en: 'Without Screen' };
      } else if (nameUpper.includes('มุ้ง') || nameUpper.includes('SCREEN')) {
        screenType = { th: 'มีมุ้งลวด', en: 'With Screen' };
      }
    }

    const qrModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'QR_CODE_MODE' } });
    const qrMode = qrModeSetting ? qrModeSetting.value : 'STATIC';

    const verificationModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'VERIFICATION_MODE' } });
    const verificationMode = verificationModeSetting ? verificationModeSetting.value : 'OTP';

    const smsOtpModeSetting = await this.systemSettingRepository.findOne({ where: { key: 'SMS_OTP_MODE' } });
    const smsOtpMode = smsOtpModeSetting ? smsOtpModeSetting.value : 'TEST';

    let imageUrl: string | null = null;
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
      lotNo: '', // Hide Lot No by returning empty string
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

  async uploadProductImage(itemCode: string, imageBase64: string): Promise<ProductMetadata> {
    let metadata = await this.productMetadataRepository.findOne({ where: { itemCode } });
    if (!metadata) {
      metadata = this.productMetadataRepository.create({
        itemCode,
        itemName: itemCode.includes('-') ? `สินค้ากลุ่มรหัส ${itemCode}` : 'สินค้าทั่วไป',
        imageBase64,
      });
    } else {
      metadata.imageBase64 = imageBase64;
    }
    return this.productMetadataRepository.save(metadata);
  }
}
