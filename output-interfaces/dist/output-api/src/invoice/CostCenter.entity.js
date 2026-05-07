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
exports.CostCenter = void 0;
const typeorm_1 = require("typeorm");
const Invoice_entity_1 = require("./Invoice.entity");
let CostCenter = class CostCenter {
    id;
    number;
    label;
    invoices;
    locked_at;
};
exports.CostCenter = CostCenter;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CostCenter.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CostCenter.prototype, "number", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CostCenter.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Invoice_entity_1.Invoice, (inv) => inv.cost_center),
    __metadata("design:type", Invoice_entity_1.Invoice)
], CostCenter.prototype, "invoices", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], CostCenter.prototype, "locked_at", void 0);
exports.CostCenter = CostCenter = __decorate([
    (0, typeorm_1.Entity)()
], CostCenter);
