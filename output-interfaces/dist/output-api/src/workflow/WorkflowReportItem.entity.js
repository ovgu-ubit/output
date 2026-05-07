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
exports.WorkflowReportItem = void 0;
const typeorm_1 = require("typeorm");
const interfaces_1 = require("@output/interfaces");
const WorkflowReport_entity_1 = require("./WorkflowReport.entity");
let WorkflowReportItem = class WorkflowReportItem {
    id;
    workflowReport;
    timestamp;
    level;
    code;
    message;
};
exports.WorkflowReportItem = WorkflowReportItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WorkflowReportItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkflowReport_entity_1.WorkflowReport, (workflowReport) => workflowReport.items, { onDelete: 'CASCADE' }),
    __metadata("design:type", WorkflowReport_entity_1.WorkflowReport)
], WorkflowReportItem.prototype, "workflowReport", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], WorkflowReportItem.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: interfaces_1.WorkflowReportItemLevel }),
    __metadata("design:type", String)
], WorkflowReportItem.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WorkflowReportItem.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WorkflowReportItem.prototype, "message", void 0);
exports.WorkflowReportItem = WorkflowReportItem = __decorate([
    (0, typeorm_1.Entity)("workflow_report_item")
], WorkflowReportItem);
