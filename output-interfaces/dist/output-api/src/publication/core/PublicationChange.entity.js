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
exports.PublicationChange = void 0;
const typeorm_1 = require("typeorm");
const WorkflowReport_entity_1 = require("../../workflow/WorkflowReport.entity");
const Publication_entity_1 = require("./Publication.entity");
let PublicationChange = class PublicationChange {
    id;
    publication;
    publicationId;
    workflowReport;
    workflowReportId;
    timestamp;
    by_user;
    patch_data;
    dry_change;
};
exports.PublicationChange = PublicationChange;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PublicationChange.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Publication_entity_1.Publication, (publication) => publication.changes),
    __metadata("design:type", Publication_entity_1.Publication)
], PublicationChange.prototype, "publication", void 0);
__decorate([
    (0, typeorm_1.RelationId)((change) => change.publication),
    __metadata("design:type", Number)
], PublicationChange.prototype, "publicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => WorkflowReport_entity_1.WorkflowReport, (workflowReport) => workflowReport.publication_changes, { nullable: true, onDelete: 'SET NULL' }),
    __metadata("design:type", WorkflowReport_entity_1.WorkflowReport)
], PublicationChange.prototype, "workflowReport", void 0);
__decorate([
    (0, typeorm_1.RelationId)((change) => change.workflowReport),
    __metadata("design:type", Number)
], PublicationChange.prototype, "workflowReportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], PublicationChange.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], PublicationChange.prototype, "by_user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], PublicationChange.prototype, "patch_data", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], PublicationChange.prototype, "dry_change", void 0);
exports.PublicationChange = PublicationChange = __decorate([
    (0, typeorm_1.Entity)("publication_change")
], PublicationChange);
