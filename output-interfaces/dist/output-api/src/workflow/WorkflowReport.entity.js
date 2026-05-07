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
exports.WorkflowReport = void 0;
const typeorm_1 = require("typeorm");
const interfaces_1 = require("@output/interfaces");
const PublicationChange_entity_1 = require("../publication/core/PublicationChange.entity");
const ExportWorkflow_entity_1 = require("./ExportWorkflow.entity");
const ImportWorkflow_entity_1 = require("./ImportWorkflow.entity");
const ValidationWorkflow_entity_1 = require("./ValidationWorkflow.entity");
const WorkflowReportItem_entity_1 = require("./WorkflowReportItem.entity");
let WorkflowReport = class WorkflowReport {
    id;
    workflow_type;
    importWorkflow;
    exportWorkflow;
    validationWorkflow;
    workflow;
    workflowId;
    params;
    by_user;
    status;
    progress;
    started_at;
    updated_at;
    finished_at;
    summary;
    dry_run;
    items;
    publication_changes;
};
exports.WorkflowReport = WorkflowReport;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WorkflowReport.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: interfaces_1.WorkflowType, default: interfaces_1.WorkflowType.IMPORT }),
    __metadata("design:type", String)
], WorkflowReport.prototype, "workflow_type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ImportWorkflow_entity_1.ImportWorkflow, (workflow) => workflow.reports, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'workflowId' }),
    __metadata("design:type", ImportWorkflow_entity_1.ImportWorkflow)
], WorkflowReport.prototype, "importWorkflow", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ExportWorkflow_entity_1.ExportWorkflow, (workflow) => workflow.reports, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'exportWorkflowId' }),
    __metadata("design:type", ExportWorkflow_entity_1.ExportWorkflow)
], WorkflowReport.prototype, "exportWorkflow", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ValidationWorkflow_entity_1.ValidationWorkflow, (workflow) => workflow.reports, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'validationWorkflowId' }),
    __metadata("design:type", ValidationWorkflow_entity_1.ValidationWorkflow)
], WorkflowReport.prototype, "validationWorkflow", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], WorkflowReport.prototype, "params", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WorkflowReport.prototype, "by_user", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WorkflowReport.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'double precision', default: 0 }),
    __metadata("design:type", Number)
], WorkflowReport.prototype, "progress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], WorkflowReport.prototype, "started_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], WorkflowReport.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], WorkflowReport.prototype, "finished_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'jsonb' }),
    __metadata("design:type", Object)
], WorkflowReport.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], WorkflowReport.prototype, "dry_run", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => WorkflowReportItem_entity_1.WorkflowReportItem, (item) => item.workflowReport, { cascade: true }),
    __metadata("design:type", Array)
], WorkflowReport.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PublicationChange_entity_1.PublicationChange, (change) => change.workflowReport),
    __metadata("design:type", Array)
], WorkflowReport.prototype, "publication_changes", void 0);
exports.WorkflowReport = WorkflowReport = __decorate([
    (0, typeorm_1.Entity)("workflow_report")
], WorkflowReport);
