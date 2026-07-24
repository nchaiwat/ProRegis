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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Registration = void 0;
const typeorm_1 = require("typeorm");
let Registration = class Registration {
    id;
    token;
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
    registeredAt;
    status;
    docNum;
    seqNum;
    lineUserId;
    installationPosition;
};
exports.Registration = Registration;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], Registration.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Registration.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_name' }),
    __metadata("design:type", String)
], Registration.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_name' }),
    __metadata("design:type", String)
], Registration.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Registration.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Registration.prototype, "province", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'postal_code' }),
    __metadata("design:type", String)
], Registration.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Registration.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'email', nullable: true }),
    __metadata("design:type", Object)
], Registration.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mandatory_consent', default: false }),
    __metadata("design:type", Boolean)
], Registration.prototype, "mandatoryConsent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'optional_consent', default: false }),
    __metadata("design:type", Boolean)
], Registration.prototype, "optionalConsent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Object)
], Registration.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Object)
], Registration.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'registered_at' }),
    __metadata("design:type", Date)
], Registration.prototype, "registeredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'WARRANTY_ACTIVE' }),
    __metadata("design:type", String)
], Registration.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'doc_num', nullable: true }),
    __metadata("design:type", Object)
], Registration.prototype, "docNum", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'seq_num', nullable: true }),
    __metadata("design:type", Object)
], Registration.prototype, "seqNum", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'line_user_id', nullable: true }),
    __metadata("design:type", Object)
], Registration.prototype, "lineUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'installation_position', nullable: true }),
    __metadata("design:type", Object)
], Registration.prototype, "installationPosition", void 0);
exports.Registration = Registration = __decorate([
    (0, typeorm_1.Entity)('registrations')
], Registration);
//# sourceMappingURL=registration.entity.js.map