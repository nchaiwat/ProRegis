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
exports.ProductionOrder = void 0;
const typeorm_1 = require("typeorm");
let ProductionOrder = class ProductionOrder {
    docNum;
    itemCode;
    itemName;
    plannedQty;
    orderDate;
    startDate;
    status;
    completedQty;
    createdAt;
};
exports.ProductionOrder = ProductionOrder;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', name: 'doc_num' }),
    __metadata("design:type", String)
], ProductionOrder.prototype, "docNum", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'item_code' }),
    __metadata("design:type", String)
], ProductionOrder.prototype, "itemCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'item_name', nullable: true }),
    __metadata("design:type", Object)
], ProductionOrder.prototype, "itemName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'planned_qty', default: 0 }),
    __metadata("design:type", Number)
], ProductionOrder.prototype, "plannedQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'order_date', nullable: true }),
    __metadata("design:type", Object)
], ProductionOrder.prototype, "orderDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'start_date', nullable: true }),
    __metadata("design:type", Object)
], ProductionOrder.prototype, "startDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'status', nullable: true }),
    __metadata("design:type", Object)
], ProductionOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'completed_qty', default: 0 }),
    __metadata("design:type", Number)
], ProductionOrder.prototype, "completedQty", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ProductionOrder.prototype, "createdAt", void 0);
exports.ProductionOrder = ProductionOrder = __decorate([
    (0, typeorm_1.Entity)('production_orders')
], ProductionOrder);
//# sourceMappingURL=production-order.entity.js.map