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
exports.Invoice = void 0;
const typeorm_1 = require("typeorm");
const CostCenter_entity_1 = require("./CostCenter.entity");
const CostItem_entity_1 = require("./CostItem.entity");
const interfaces_1 = require("@output/interfaces");
const Publication_entity_1 = require("../publication/core/Publication.entity");
const ContractComponent_entity_1 = require("../contract/ContractComponent.entity");
let Invoice = class Invoice {
    id;
    cost_center;
    cost_items;
    publication;
    contract_component;
    invoice_kind;
    number;
    date;
    booking_date;
    booking_amount;
};
exports.Invoice = Invoice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Invoice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => CostCenter_entity_1.CostCenter, (cc) => cc.id),
    __metadata("design:type", CostCenter_entity_1.CostCenter)
], Invoice.prototype, "cost_center", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => CostItem_entity_1.CostItem, (ci) => ci.invoice, { cascade: true }),
    __metadata("design:type", Array)
], Invoice.prototype, "cost_items", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Publication_entity_1.Publication, (pub) => pub.invoices),
    __metadata("design:type", Publication_entity_1.Publication)
], Invoice.prototype, "publication", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ContractComponent_entity_1.ContractComponent, (component) => component.linked_invoices),
    __metadata("design:type", ContractComponent_entity_1.ContractComponent)
], Invoice.prototype, "contract_component", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: interfaces_1.InvoiceKind, default: interfaces_1.InvoiceKind.INVOICE }),
    __metadata("design:type", String)
], Invoice.prototype, "invoice_kind", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Invoice.prototype, "number", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Invoice.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], Invoice.prototype, "booking_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Invoice.prototype, "booking_amount", void 0);
exports.Invoice = Invoice = __decorate([
    (0, typeorm_1.Entity)()
], Invoice);
