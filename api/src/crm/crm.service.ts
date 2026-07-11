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

    const query = this.registrationRepository.createQueryBuilder('reg');

    // Text search (search in first name, last name, phone, token, email, address, or docNum)
    if (filters.search && filters.search.trim()) {
      const searchNormalized = `%${filters.search.trim()}%`;
      query.andWhere(
        '(reg.firstName ILIKE :search OR reg.lastName ILIKE :search OR reg.phone ILIKE :search OR reg.token ILIKE :search OR reg.id ILIKE :search OR reg.email ILIKE :search OR reg.address ILIKE :search OR reg.docNum ILIKE :search)',
        { search: searchNormalized },
      );
    }

    // Province filter
    if (filters.province && filters.province.trim()) {
      query.andWhere('reg.province = :province', { province: filters.province.trim() });
    }

    // Status filter
    if (filters.status && filters.status.trim()) {
      query.andWhere('reg.status = :status', { status: filters.status.trim() });
    }

    // Order by date descending
    query.orderBy('reg.registeredAt', 'DESC');

    // Pagination
    query.skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();

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
      if (reg.docNum) {
        const po = await this.registrationRepository.manager.findOne(ProductionOrder, {
          where: { docNum: reg.docNum }
        });
        if (po) {
          itemName = po.itemName || 'สินค้าทั่วไป';
          itemCode = po.itemCode;
        }
      }
      detailedRegistrations.push({
        ...reg,
        itemName,
        itemCode,
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

    if (filters.province && filters.province.trim()) {
      query.andWhere('reg.province = :province', { province: filters.province.trim() });
    }

    if (filters.status && filters.status.trim()) {
      query.andWhere('reg.status = :status', { status: filters.status.trim() });
    }

    query.orderBy('reg.registeredAt', 'DESC');

    return query.getMany();
  }
}
