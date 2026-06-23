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
        const query = this.registrationRepository.createQueryBuilder('reg');
        if (filters.search && filters.search.trim()) {
            const searchNormalized = `%${filters.search.trim()}%`;
            query.andWhere('(reg.firstName ILIKE :search OR reg.lastName ILIKE :search OR reg.phone ILIKE :search OR reg.token ILIKE :search OR reg.id ILIKE :search)', { search: searchNormalized });
        }
        if (filters.province && filters.province.trim()) {
            query.andWhere('reg.province = :province', { province: filters.province.trim() });
        }
        if (filters.status && filters.status.trim()) {
            query.andWhere('reg.status = :status', { status: filters.status.trim() });
        }
        query.orderBy('reg.registeredAt', 'DESC');
        query.skip(skip).take(limit);
        const [items, total] = await query.getManyAndCount();
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
        return registration;
    }
    async getAllRegistrationsForExport(filters) {
        const query = this.registrationRepository.createQueryBuilder('reg');
        if (filters.search && filters.search.trim()) {
            const searchNormalized = `%${filters.search.trim()}%`;
            query.andWhere('(reg.firstName ILIKE :search OR reg.lastName ILIKE :search OR reg.phone ILIKE :search OR reg.token ILIKE :search OR reg.id ILIKE :search)', { search: searchNormalized });
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
};
exports.CrmService = CrmService;
exports.CrmService = CrmService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(registration_entity_1.Registration)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CrmService);
//# sourceMappingURL=crm.service.js.map