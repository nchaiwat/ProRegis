import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../registration/registration.entity';
import { ProductionOrder } from '../production-order/production-order.entity';

export class CrmFilterDto {
  page?: number;
  limit?: number;
  search?: string;
  province?: string;
  status?: string;
}

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) {}

  // PII masking helpers (PDPA / GDPR compliance)
  private maskPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return '***-***-***';
    return `${clean.substring(0, 3)}-***-${clean.substring(7)}`;
  }

  private maskEmail(email: string | null): string | null {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***';
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    return `${name[0]}**${name[name.length - 1]}@${domain}`;
  }

  private maskAddress(address: string): string {
    if (address.length <= 15) return '*** (ข้อมูลส่วนบุคคล)';
    return `${address.substring(0, 10)}... (ข้อมูลที่อยู่ถูกพรางสิทธิ์)`;
  }

  // Get paginated list of registrations with optional filters
  async getRegistrations(filters: CrmFilterDto) {
    const page = filters.page ? parseInt(filters.page as any, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit as any, 10) : 10;
    const skip = (page - 1) * limit;

    const phoneQb = this.registrationRepository
      .createQueryBuilder('reg')
      .select('reg.phone', 'phone')
      .groupBy('reg.phone');

    // Text search (search in first name, last name, phone, token, email, address, or docNum)
    if (filters.search && filters.search.trim()) {
      const searchNormalized = `%${filters.search.trim()}%`;
      phoneQb.andWhere(
        '(reg.firstName ILIKE :search OR reg.lastName ILIKE :search OR reg.phone ILIKE :search OR reg.token ILIKE :search OR reg.id ILIKE :search OR reg.email ILIKE :search OR reg.address ILIKE :search OR reg.docNum ILIKE :search)',
        { search: searchNormalized },
      );
    }

    // Province filter supporting dual language EN/TH variants
    if (filters.province && filters.province.trim()) {
      const p = filters.province.trim();
      const pLower = p.toLowerCase();
      
      const enThGroups: Record<string, string[]> = {
        'bangkok': ['Bangkok', 'กรุงเทพมหานคร'],
        'กรุงเทพมหานคร': ['Bangkok', 'กรุงเทพมหานคร'],
        'nonthaburi': ['Nonthaburi', 'นนทบุรี'],
        'นนทบุรี': ['Nonthaburi', 'นนทบุรี'],
        'samut prakan': ['Samut Prakan', 'สมุทรปราการ', 'SamutPrakan'],
        'samutprakan': ['Samut Prakan', 'สมุทรปราการ', 'SamutPrakan'],
        'สมุทรปราการ': ['Samut Prakan', 'สมุทรปราการ', 'SamutPrakan'],
        'chiang mai': ['Chiang Mai', 'เชียงใหม่', 'ChiangMai'],
        'chiangmai': ['Chiang Mai', 'เชียงใหม่', 'ChiangMai'],
        'เชียงใหม่': ['Chiang Mai', 'เชียงใหม่', 'ChiangMai'],
        'chonburi': ['Chonburi', 'ชลบุรี'],
        'ชลบุรี': ['Chonburi', 'ชลบุรี'],
        'phuket': ['Phuket', 'ภูเก็ต'],
        'ภูเก็ต': ['Phuket', 'ภูเก็ต'],
        'khon kaen': ['Khon Kaen', 'ขอนแก่น', 'KhonKaen'],
        'khonkaen': ['Khon Kaen', 'ขอนแก่น', 'KhonKaen'],
        'ขอนแก่น': ['Khon Kaen', 'ขอนแก่น', 'KhonKaen'],
        'nakhon ratchasima': ['Nakhon Ratchasima', 'นครราชสีมา', 'NakhonRatchasima', 'Korat'],
        'nakhonratchasima': ['Nakhon Ratchasima', 'นครราชสีมา', 'NakhonRatchasima', 'Korat'],
        'korat': ['Nakhon Ratchasima', 'นครราชสีมา', 'NakhonRatchasima', 'Korat'],
        'นครราชสีมา': ['Nakhon Ratchasima', 'นครราชสีมา', 'NakhonRatchasima', 'Korat'],
      };

      if (enThGroups[pLower]) {
        phoneQb.andWhere('reg.province IN (:...provinces)', { provinces: enThGroups[pLower] });
      } else {
        phoneQb.andWhere('reg.province = :province', { province: p });
      }
    }

    // Status filter
    if (filters.status && filters.status.trim()) {
      phoneQb.andWhere('reg.status = :status', { status: filters.status.trim() });
    }

    // Get total count of unique customers (phones) matching filters
    const totalResult = await phoneQb.getRawMany();
    const total = totalResult.length;

    // Sort by latest registration date
    phoneQb.addSelect('MAX(reg.registeredAt)', 'latestRegAt');
    phoneQb.orderBy('"latestRegAt"', 'DESC');

    const paginatedPhonesResult = await phoneQb
      .offset(skip)
      .limit(limit)
      .getRawMany();
    
    const paginatedPhones = paginatedPhonesResult.map(r => r.phone);

    const items: any[] = [];
    for (const phone of paginatedPhones) {
      const latest = await this.registrationRepository.findOne({
        where: { phone },
        order: { registeredAt: 'DESC' }
      });
      if (latest) {
        const count = await this.registrationRepository.count({ where: { phone } });
        items.push({
          ...latest,
          registrationCount: count
        });
      }
    }

    // Map list items to mask PII (PDPA principle)
    const itemsMasked = items.map((item) => ({
      ...item,
      phone: this.maskPhone(item.phone),
      email: this.maskEmail(item.email),
      address: this.maskAddress(item.address),
    }));

    return {
      items: itemsMasked,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Fetch full details of one registration (unmasked - triggers audit view logs)
  async getRegistrationDetails(id: string): Promise<any> {
    const registration = await this.registrationRepository.findOne({ where: { id } });
    if (!registration) {
      throw new NotFoundException('ไม่พบข้อมูลการลงทะเบียนที่ระบุ');
    }

    // Fetch all registrations for this phone
    const allUserRegistrations = await this.registrationRepository.find({
      where: { phone: registration.phone },
      order: { registeredAt: 'DESC' }
    });

    const detailedRegistrations: any[] = [];
    for (const reg of allUserRegistrations) {
      let itemName = 'สินค้าทั่วไป';
      let itemCode = 'ไม่ระบุ';
      let orderDate: string | null = null;
      if (reg.docNum) {
        const po = await this.registrationRepository.manager.findOne(ProductionOrder, {
          where: { docNum: reg.docNum }
        });
        if (po) {
          itemName = po.itemName || 'สินค้าทั่วไป';
          itemCode = po.itemCode;
          orderDate = po.orderDate || null;
        }
      }
      detailedRegistrations.push({
        ...reg,
        itemName,
        itemCode,
        orderDate,
      });
    }

    return {
      ...registration,
      allRegistrations: detailedRegistrations,
    };
  }

  // Export full customer data (strictly monitored, logged in audit logs)
  async getAllRegistrationsForExport(filters: Omit<CrmFilterDto, 'page' | 'limit'>): Promise<Registration[]> {
    const query = this.registrationRepository.createQueryBuilder('reg');

    if (filters.search && filters.search.trim()) {
      const searchNormalized = `%${filters.search.trim()}%`;
      query.andWhere(
        '(reg.firstName ILIKE :search OR reg.lastName ILIKE :search OR reg.phone ILIKE :search OR reg.token ILIKE :search OR reg.id ILIKE :search OR reg.email ILIKE :search OR reg.address ILIKE :search OR reg.docNum ILIKE :search)',
        { search: searchNormalized },
      );
    }

    // Province filter supporting dual language EN/TH variants
    if (filters.province && filters.province.trim()) {
      const p = filters.province.trim();
      const pLower = p.toLowerCase();
      
      const enThGroups: Record<string, string[]> = {
        'bangkok': ['Bangkok', 'กรุงเทพมหานคร'],
        'กรุงเทพมหานคร': ['Bangkok', 'กรุงเทพมหานคร'],
        'nonthaburi': ['Nonthaburi', 'นนทบุรี'],
        'นนทบุรี': ['Nonthaburi', 'นนทบุรี'],
        'samut prakan': ['Samut Prakan', 'สมุทรปราการ', 'SamutPrakan'],
        'samutprakan': ['Samut Prakan', 'สมุทรปราการ', 'SamutPrakan'],
        'สมุทรปราการ': ['Samut Prakan', 'สมุทรปราการ', 'SamutPrakan'],
        'chiang mai': ['Chiang Mai', 'เชียงใหม่', 'ChiangMai'],
        'chiangmai': ['Chiang Mai', 'เชียงใหม่', 'ChiangMai'],
        'เชียงใหม่': ['Chiang Mai', 'เชียงใหม่', 'ChiangMai'],
        'chonburi': ['Chonburi', 'ชลบุรี'],
        'ชลบุรี': ['Chonburi', 'ชลบุรี'],
        'phuket': ['Phuket', 'ภูเก็ต'],
        'ภูเก็ต': ['Phuket', 'ภูเก็ต'],
        'khon kaen': ['Khon Kaen', 'ขอนแก่น', 'KhonKaen'],
        'khonkaen': ['Khon Kaen', 'ขอนแก่น', 'KhonKaen'],
        'ขอนแก่น': ['Khon Kaen', 'ขอนแก่น', 'KhonKaen'],
        'nakhon ratchasima': ['Nakhon Ratchasima', 'นครราชสีมา', 'NakhonRatchasima', 'Korat'],
        'nakhonratchasima': ['Nakhon Ratchasima', 'นครราชสีมา', 'NakhonRatchasima', 'Korat'],
        'korat': ['Nakhon Ratchasima', 'นครราชสีมา', 'NakhonRatchasima', 'Korat'],
        'นครราชสีมา': ['Nakhon Ratchasima', 'นครราชสีมา', 'NakhonRatchasima', 'Korat'],
      };

      if (enThGroups[pLower]) {
        query.andWhere('reg.province IN (:...provinces)', { provinces: enThGroups[pLower] });
      } else {
        query.andWhere('reg.province = :province', { province: p });
      }
    }

    if (filters.status && filters.status.trim()) {
      query.andWhere('reg.status = :status', { status: filters.status.trim() });
    }

    query.orderBy('reg.registeredAt', 'DESC');

    return query.getMany();
  }

  async getActiveProvinces(): Promise<Array<{ value: string; label: string }>> {
    const rawProvinces = await this.registrationRepository
      .createQueryBuilder('reg')
      .select('reg.province', 'province')
      .distinct(true)
      .where('reg.province IS NOT NULL')
      .andWhere("reg.province != ''")
      .getRawMany();

    const normMap: Record<string, { value: string; label: string }> = {
      'bangkok': { value: 'Bangkok', label: 'กรุงเทพมหานคร' },
      'กรุงเทพมหานคร': { value: 'Bangkok', label: 'กรุงเทพมหานคร' },
      'nonthaburi': { value: 'Nonthaburi', label: 'นนทบุรี' },
      'นนทบุรี': { value: 'Nonthaburi', label: 'นนทบุรี' },
      'samut prakan': { value: 'Samut Prakan', label: 'สมุทรปราการ' },
      'samutprakan': { value: 'Samut Prakan', label: 'สมุทรปราการ' },
      'สมุทรปราการ': { value: 'Samut Prakan', label: 'สมุทรปราการ' },
      'chiang mai': { value: 'Chiang Mai', label: 'เชียงใหม่' },
      'chiangmai': { value: 'Chiang Mai', label: 'เชียงใหม่' },
      'เชียงใหม่': { value: 'Chiang Mai', label: 'เชียงใหม่' },
      'chonburi': { value: 'Chonburi', label: 'ชลบุรี' },
      'ชลบุรี': { value: 'Chonburi', label: 'ชลบุรี' },
      'phuket': { value: 'Phuket', label: 'ภูเก็ต' },
      'ภูเก็ต': { value: 'Phuket', label: 'ภูเก็ต' },
      'khon kaen': { value: 'Khon Kaen', label: 'ขอนแก่น' },
      'khonkaen': { value: 'Khon Kaen', label: 'ขอนแก่น' },
      'ขอนแก่น': { value: 'Khon Kaen', label: 'ขอนแก่น' },
      'nakhon ratchasima': { value: 'Nakhon Ratchasima', label: 'นครราชสีมา' },
      'nakhonratchasima': { value: 'Nakhon Ratchasima', label: 'นครราชสีมา' },
      'korat': { value: 'Nakhon Ratchasima', label: 'นครราชสีมา' },
      'นครราชสีมา': { value: 'Nakhon Ratchasima', label: 'นครราชสีมา' },
    };

    const uniqueMap = new Map<string, { value: string; label: string }>();

    for (const raw of rawProvinces) {
      const pStr = (raw.province || '').trim();
      if (!pStr) continue;
      const key = pStr.toLowerCase();
      if (normMap[key]) {
        const item = normMap[key];
        uniqueMap.set(item.value, item);
      } else {
        uniqueMap.set(pStr, { value: pStr, label: pStr });
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'th'));
  }
}
