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
exports.CostItem = void 0;
const typeorm_1 = require("typeorm");
const CostType_entity_1 = require("./CostType.entity");
const Invoice_entity_1 = require("./Invoice.entity");
let CostItem = class CostItem {
    id;
    label;
    invoice;
    cost_type;
    euro_value;
    orig_value;
    orig_currency;
    normal_price;
    vat;
};
exports.CostItem = CostItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CostItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CostItem.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Invoice_entity_1.Invoice, i => i.cost_items),
    __metadata("design:type", Invoice_entity_1.Invoice)
], CostItem.prototype, "invoice", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => CostType_entity_1.CostType, ct => ct.id),
    __metadata("design:type", CostType_entity_1.CostType)
], CostItem.prototype, "cost_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], CostItem.prototype, "euro_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], CostItem.prototype, "orig_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CostItem.prototype, "orig_currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], CostItem.prototype, "normal_price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], CostItem.prototype, "vat", void 0);
exports.CostItem = CostItem = __decorate([
    (0, typeorm_1.Entity)()
], CostItem);
