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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmService = exports.CrmFilterDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const registration_entity_1 = require("../registration/registration.entity");
const production_order_entity_1 = require("../production-order/production-order.entity");
class CrmFilterDto {
    page;
    limit;
    search;
    province;
    status;
}
exports.CrmFilterDto = CrmFilterDto;
let CrmService = class CrmService {
    registrationRepository;
    constructor(registrationRepository) {
        this.registrationRepository = registrationRepository;
    }
    maskPhone(phone) {
        const clean = phone.replace(/\D/g, '');
        if (clean.length < 10)
            return '***-***-***';
        return `${clean.substring(0, 3)}-***-${clean.substring(7)}`;
    }
    maskEmail(email) {
        if (!email)
            return null;
        const parts = email.split('@');
        if (parts.length !== 2)
            return '***@***';
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2)
            return `${name[0]}*@${domain}`;
        return `${name[0]}**${name[name.length - 1]}@${domain}`;
    }
    maskAddress(address) {
        if (address.length <= 15)
            return '*** (ข้อมูลส่วนบุคคล)';
        return `${address.substring(0, 10)}... (ข้อมูลที่อยู่ถูกพรางสิทธิ์)`;
    }
    async getRegistrations(filters) {
        const page = filters.page ? parseInt(filters.page, 10) : 1;
        const limit = filters.limit ? parseInt(filters.limit, 10) : 10;
        const skip = (page - 1) * limit;
        const phoneQb = this.registrationRepository
            .createQueryBuilder('reg')
            .select('reg.phone', 'phone')
            .groupBy('reg.phone');
        if (filters.search && filters.search.trim()) {
            const searchNormalized = `%${filters.search.trim()}%`;
            phoneQb.andWhere('(reg.firstName ILIKE :search OR reg.lastName ILIKE :search OR reg.phone ILIKE :search OR reg.token ILIKE :search OR reg.id ILIKE :search OR reg.email ILIKE :search OR reg.address ILIKE :search OR reg.docNum ILIKE :search)', { search: searchNormalized });
        }
        if (filters.province && filters.province.trim()) {
            const p = filters.province.trim();
            const pLower = p.toLowerCase();
            const enThGroups = {
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
            }
            else {
                phoneQb.andWhere('reg.province = :province', { province: p });
            }
        }
        if (filters.status && filters.status.trim()) {
            phoneQb.andWhere('reg.status = :status', { status: filters.status.trim() });
        }
        const totalResult = await phoneQb.getRawMany();
        const total = totalResult.length;
        phoneQb.addSelect('MAX(reg.registeredAt)', 'latestRegAt');
        phoneQb.orderBy('"latestRegAt"', 'DESC');
        const paginatedPhonesResult = await phoneQb
            .offset(skip)
            .limit(limit)
            .getRawMany();
        const paginatedPhones = paginatedPhonesResult.map(r => r.phone);
        const items = [];
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
    async getRegistrationDetails(id) {
        const registration = await this.registrationRepository.findOne({ where: { id } });
        if (!registration) {
            throw new common_1.NotFoundException('ไม่พบข้อมูลการลงทะเบียนที่ระบุ');
        }
        const allUserRegistrations = await this.registrationRepository.find({
            where: { phone: registration.phone },
            order: { registeredAt: 'DESC' }
        });
        const detailedRegistrations = [];
        for (const reg of allUserRegistrations) {
            let itemName = 'สินค้าทั่วไป';
            let itemCode = 'ไม่ระบุ';
            let orderDate = null;
            if (reg.docNum) {
                const po = await this.registrationRepository.manager.findOne(production_order_entity_1.ProductionOrder, {
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
    async getAllRegistrationsForExport(filters) {
        const query = this.registrationRepository.createQueryBuilder('reg');
        if (filters.search && filters.search.trim()) {
            const searchNormalized = `%${filters.search.trim()}%`;
            query.andWhere('(reg.firstName ILIKE :search OR reg.lastName ILIKE :search OR reg.phone ILIKE :search OR reg.token ILIKE :search OR reg.id ILIKE :search OR reg.email ILIKE :search OR reg.address ILIKE :search OR reg.docNum ILIKE :search)', { search: searchNormalized });
        }
        if (filters.province && filters.province.trim()) {
            const p = filters.province.trim();
            const pLower = p.toLowerCase();
            const enThGroups = {
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
            }
            else {
                query.andWhere('reg.province = :province', { province: p });
            }
        }
        if (filters.status && filters.status.trim()) {
            query.andWhere('reg.status = :status', { status: filters.status.trim() });
        }
        query.orderBy('reg.registeredAt', 'DESC');
        return query.getMany();
    }
    async getActiveProvinces() {
        const rawProvinces = await this.registrationRepository
            .createQueryBuilder('reg')
            .select('reg.province', 'province')
            .distinct(true)
            .where('reg.province IS NOT NULL')
            .andWhere("reg.province != ''")
            .getRawMany();
        const normMap = {
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
        const uniqueMap = new Map();
        for (const raw of rawProvinces) {
            const pStr = (raw.province || '').trim();
            if (!pStr)
                continue;
            const key = pStr.toLowerCase();
            if (normMap[key]) {
                const item = normMap[key];
                uniqueMap.set(item.value, item);
            }
            else {
                uniqueMap.set(pStr, { value: pStr, label: pStr });
            }
        }
        return Array.from(uniqueMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'th'));
    }
    async deleteCustomerAndRegistrations(phone) {
        const registrations = await this.registrationRepository.find({ where: { phone } });
        if (registrations.length > 0) {
            await this.registrationRepository.remove(registrations);
        }
        return registrations.length;
    }
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(registration_entity_1.Registration)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CrmService);
//# sourceMappingURL=crm.service.js.map