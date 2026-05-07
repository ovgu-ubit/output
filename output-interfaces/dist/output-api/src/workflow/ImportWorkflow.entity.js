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
exports.ImportWorkflow = void 0;
const typeorm_1 = require("typeorm");
const interfaces_1 = require("@output/interfaces");
const interfaces_2 = require("@output/interfaces");
const WorkflowReport_entity_1 = require("./WorkflowReport.entity");
let ImportWorkflow = class ImportWorkflow {
    id;
    workflow_id;
    label;
    version;
    created_at;
    modified_at;
    published_at;
    deleted_at;
    description;
    strategy_type;
    strategy;
    mapping;
    update_config;
    locked_at;
    reports;
};
exports.ImportWorkflow = ImportWorkflow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ImportWorkflow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ImportWorkflow.prototype, "workflow_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ImportWorkflow.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], ImportWorkflow.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ImportWorkflow.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ImportWorkflow.prototype, "modified_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], ImportWorkflow.prototype, "published_at", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ImportWorkflow.prototype, "deleted_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ImportWorkflow.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'enum', enum: interfaces_2.ImportStrategy }),
    __metadata("design:type", Number)
], ImportWorkflow.prototype, "strategy_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", Object)
], ImportWorkflow.prototype, "strategy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ImportWorkflow.prototype, "mapping", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", interfaces_1.UpdateMapping)
], ImportWorkflow.prototype, "update_config", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], ImportWorkflow.prototype, "locked_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WorkflowReport_entity_1.WorkflowReport, (report) => report.importWorkflow),
    __metadata("design:type", Array)
], ImportWorkflow.prototype, "reports", void 0);
exports.ImportWorkflow = ImportWorkflow = __decorate([
    (0, typeorm_1.Entity)("workflow_import"),
    (0, typeorm_1.Unique)(["workflow_id", "version"])
], ImportWorkflow);
