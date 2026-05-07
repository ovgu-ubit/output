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
exports.Contract = void 0;
const typeorm_1 = require("typeorm");
const Publisher_entity_1 = require("../publisher/Publisher.entity");
const Publication_entity_1 = require("../publication/core/Publication.entity");
const ContractIdentifier_entity_1 = require("./ContractIdentifier.entity");
const ContractComponent_entity_1 = require("./ContractComponent.entity");
let Contract = class Contract {
    id;
    publisher;
    label;
    start_date;
    end_date;
    internal_number;
    invoice_amount;
    invoice_information;
    sec_pub;
    gold_option;
    verification_method;
    publications;
    identifiers;
    locked_at;
    components;
};
exports.Contract = Contract;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Contract.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Publisher_entity_1.Publisher, (p) => p.id),
    __metadata("design:type", Publisher_entity_1.Publisher)
], Contract.prototype, "publisher", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Contract.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Contract.prototype, "start_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Contract.prototype, "end_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "internal_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Contract.prototype, "invoice_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "invoice_information", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "sec_pub", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "gold_option", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "verification_method", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Publication_entity_1.Publication, (p) => p.contract),
    __metadata("design:type", Array)
], Contract.prototype, "publications", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ContractIdentifier_entity_1.ContractIdentifier, (ide) => ide.entity, { cascade: true }),
    __metadata("design:type", Array)
], Contract.prototype, "identifiers", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Contract.prototype, "locked_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ContractComponent_entity_1.ContractComponent, (ide) => ide.contract, { cascade: true }),
    __metadata("design:type", Array)
], Contract.prototype, "components", void 0);
exports.Contract = Contract = __decorate([
    (0, typeorm_1.Entity)()
], Contract);
