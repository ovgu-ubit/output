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
exports.GreaterEntity = void 0;
const typeorm_1 = require("typeorm");
const Publication_entity_1 = require("../publication/core/Publication.entity");
const GEIdentifier_entity_1 = require("./GEIdentifier.entity");
let GreaterEntity = class GreaterEntity {
    id;
    label;
    rating;
    doaj_since;
    doaj_until;
    identifiers;
    publications;
    locked_at;
};
exports.GreaterEntity = GreaterEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], GreaterEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], GreaterEntity.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], GreaterEntity.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], GreaterEntity.prototype, "doaj_since", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], GreaterEntity.prototype, "doaj_until", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => GEIdentifier_entity_1.GEIdentifier, (ide) => ide.entity, { cascade: true }),
    __metadata("design:type", Array)
], GreaterEntity.prototype, "identifiers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Publication_entity_1.Publication, (p) => p.greater_entity),
    __metadata("design:type", Array)
], GreaterEntity.prototype, "publications", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], GreaterEntity.prototype, "locked_at", void 0);
exports.GreaterEntity = GreaterEntity = __decorate([
    (0, typeorm_1.Entity)()
], GreaterEntity);
