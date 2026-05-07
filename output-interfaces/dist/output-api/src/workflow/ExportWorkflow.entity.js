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
exports.ExportWorkflow = void 0;
const typeorm_1 = require("typeorm");
const interfaces_1 = require("@output/interfaces");
const WorkflowReport_entity_1 = require("./WorkflowReport.entity");
const typeorm_2 = require("typeorm");
let ExportWorkflow = class ExportWorkflow {
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
    locked_at;
    reports;
};
exports.ExportWorkflow = ExportWorkflow;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ExportWorkflow.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ExportWorkflow.prototype, "workflow_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ExportWorkflow.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], ExportWorkflow.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ExportWorkflow.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ExportWorkflow.prototype, "modified_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], ExportWorkflow.prototype, "published_at", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ExportWorkflow.prototype, "deleted_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ExportWorkflow.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'enum', enum: interfaces_1.ExportStrategy }),
    __metadata("design:type", Number)
], ExportWorkflow.prototype, "strategy_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", Object)
], ExportWorkflow.prototype, "strategy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ExportWorkflow.prototype, "mapping", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], ExportWorkflow.prototype, "locked_at", void 0);
__decorate([
    (0, typeorm_2.OneToMany)(() => WorkflowReport_entity_1.WorkflowReport, (report) => report.exportWorkflow),
    __metadata("design:type", Array)
], ExportWorkflow.prototype, "reports", void 0);
exports.ExportWorkflow = ExportWorkflow = __decorate([
    (0, typeorm_1.Entity)("workflow_export"),
    (0, typeorm_1.Unique)(["workflow_id", "version"])
], ExportWorkflow);
