import { Injectable, NotFoundException } from '@nestjs/common';

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
  specs: {
    th: { label: string; value: string }[];
    en: { label: string; value: string }[];
  };
  features: {
    th: string[];
    en: string[];
  };
}

@Injectable()
export class ProductsService {
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
          { label: 'วัสดุเฟรม', value: 'อลูมิเนียมเกกพรีเมียมอบสีพิเศษ (Magnesium-Alloy)' },
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
          'เฟรมแมกนีเซียม-อลูมิเนียมเกรดอวกาศพร้อมการเคลือบเงาสุดหรู',
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

  findOne(token: string): Product {
    const product = this.products[token];
    if (product) {
      return product;
    }
    
    // Dynamic default for unregistered/new tokens
    return {
      token: token,
      code: token,
      modelTh: 'กระจกหน้าต่างอลูมิเนียมนำเข้าซีรีส์ย่อย',
      modelEn: 'Imported Aluminum Window Sub-Series',
      manufactureDate: 'ก.พ. 2026',
      lotNo: 'LOT-992-GEN',
      poNo: 'PO-88390',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop',
      warrantyPeriod: 'ตลอดอายุการใช้งาน (Lifetime Warranty)',
      specs: {
        th: [
          { label: 'รหัสสินค้าสากล', value: token },
          { label: 'วันที่ผลิต', value: 'ก.พ. 2026' },
          { label: 'มาตรฐานควบคุม', value: 'ISO 9001:2015' },
          { label: 'สีกรอบวงกบ', value: 'อบสีดำเมทัลลิก (Metallic Black)' }
        ],
        en: [
          { label: 'Global SKU', value: token },
          { label: 'Manufacture Date', value: 'Feb 2026' },
          { label: 'Compliance Standard', value: 'ISO 9001:2015' },
          { label: 'Frame Color', value: 'Metallic Black Powder Coated' }
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
}
