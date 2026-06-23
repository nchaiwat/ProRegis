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
exports.GenerationLog = void 0;
const typeorm_1 = require("typeorm");
let GenerationLog = class GenerationLog {
    id;
    username;
    docNum;
    startSeq;
    quantity;
    ipAddress;
    generatedAt;
};
exports.GenerationLog = GenerationLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GenerationLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'username' }),
    __metadata("design:type", String)
], GenerationLog.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'doc_num' }),
    __metadata("design:type", String)
], GenerationLog.prototype, "docNum", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_seq' }),
    __metadata("design:type", Number)
], GenerationLog.prototype, "startSeq", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity' }),
    __metadata("design:type", Number)
], GenerationLog.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'ip_address', nullable: true }),
    __metadata("design:type", Object)
], GenerationLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'generated_at' }),
    __metadata("design:type", Date)
], GenerationLog.prototype, "generatedAt", void 0);
exports.GenerationLog = GenerationLog = __decorate([
    (0, typeorm_1.Entity)('generation_logs')
], GenerationLog);
//# sourceMappingURL=generation-log.entity.js.map