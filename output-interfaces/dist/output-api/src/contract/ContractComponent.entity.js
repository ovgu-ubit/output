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
exports.ContractComponent = void 0;
const typeorm_1 = require("typeorm");
const interfaces_1 = require("@output/interfaces");
const GreaterEntity_entity_1 = require("../greater_entity/GreaterEntity.entity");
const CostType_entity_1 = require("../invoice/CostType.entity");
const Invoice_entity_1 = require("../invoice/Invoice.entity");
const OA_Category_entity_1 = require("../oa_category/OA_Category.entity");
const PublicationType_entity_1 = require("../pub_type/PublicationType.entity");
const Contract_entity_1 = require("./Contract.entity");
let ContractComponent = class ContractComponent {
    id;
    contract;
    label;
    contract_model;
    contract_model_version;
    contract_model_params;
    linked_invoices;
    invoices;
    pre_invoices;
    oa_categories;
    pub_types;
    greater_entities;
    cost_types;
};
exports.ContractComponent = ContractComponent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ContractComponent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contract_entity_1.Contract, (p) => p.id, { onDelete: 'CASCADE' }),
    __metadata("design:type", Contract_entity_1.Contract)
], ContractComponent.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ContractComponent.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'enum', enum: interfaces_1.ContractModel }),
    __metadata("design:type", Number)
], ContractComponent.prototype, "contract_model", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'int' }),
    __metadata("design:type", Number)
], ContractComponent.prototype, "contract_model_version", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", Object)
], ContractComponent.prototype, "contract_model_params", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Invoice_entity_1.Invoice, (i) => i.contract_component, { cascade: true }),
    __metadata("design:type", Array)
], ContractComponent.prototype, "linked_invoices", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => OA_Category_entity_1.OA_Category),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], ContractComponent.prototype, "oa_categories", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => PublicationType_entity_1.PublicationType),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], ContractComponent.prototype, "pub_types", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => GreaterEntity_entity_1.GreaterEntity),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], ContractComponent.prototype, "greater_entities", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => CostType_entity_1.CostType),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], ContractComponent.prototype, "cost_types", void 0);
exports.ContractComponent = ContractComponent = __decorate([
    (0, typeorm_1.Entity)()
], ContractComponent);
