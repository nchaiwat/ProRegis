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
exports.TransactionLog = void 0;
const typeorm_1 = require("typeorm");
let TransactionLog = class TransactionLog {
    id;
    category;
    action;
    status;
    message;
    details;
    recordsCount;
    durationMs;
    triggeredBy;
    createdAt;
};
exports.TransactionLog = TransactionLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TransactionLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_trans_logs_category'),
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], TransactionLog.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], TransactionLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'success' }),
    __metadata("design:type", String)
], TransactionLog.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    __metadata("design:type", String)
], TransactionLog.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'records_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "recordsCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'duration_ms', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "durationMs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'triggered_by', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], TransactionLog.prototype, "triggeredBy", void 0);
__decorate([
    (0, typeorm_1.Index)('idx_trans_logs_created_at'),
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "createdAt", void 0);
exports.TransactionLog = TransactionLog = __decorate([
    (0, typeorm_1.Entity)('transaction_logs')
], TransactionLog);
//# sourceMappingURL=transaction-log.entity.js.map