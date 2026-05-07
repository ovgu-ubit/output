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
exports.PublicationDuplicate = void 0;
const typeorm_1 = require("typeorm");
const Publication_entity_1 = require("./Publication.entity");
let PublicationDuplicate = class PublicationDuplicate {
    id;
    id_first;
    first;
    id_second;
    description;
    delete_date;
};
exports.PublicationDuplicate = PublicationDuplicate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PublicationDuplicate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PublicationDuplicate.prototype, "id_first", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Publication_entity_1.Publication, p => p.duplicates),
    (0, typeorm_1.JoinColumn)({
        name: 'id_first',
        referencedColumnName: 'id'
    }),
    __metadata("design:type", Publication_entity_1.Publication)
], PublicationDuplicate.prototype, "first", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PublicationDuplicate.prototype, "id_second", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], PublicationDuplicate.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], PublicationDuplicate.prototype, "delete_date", void 0);
exports.PublicationDuplicate = PublicationDuplicate = __decorate([
    (0, typeorm_1.Entity)()
], PublicationDuplicate);
