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
exports.Funder = void 0;
const typeorm_1 = require("typeorm");
const Publication_entity_1 = require("../publication/core/Publication.entity");
const AliasFunder_entity_1 = require("./AliasFunder.entity");
let Funder = class Funder {
    id;
    label;
    doi;
    ror_id;
    third_party;
    publications;
    aliases;
    locked_at;
};
exports.Funder = Funder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Funder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Funder.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Funder.prototype, "doi", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Funder.prototype, "ror_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], Funder.prototype, "third_party", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Publication_entity_1.Publication, (pub) => pub.funders),
    __metadata("design:type", Array)
], Funder.prototype, "publications", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AliasFunder_entity_1.AliasFunder, ai => ai.element, { cascade: true }),
    __metadata("design:type", Array)
], Funder.prototype, "aliases", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Funder.prototype, "locked_at", void 0);
exports.Funder = Funder = __decorate([
    (0, typeorm_1.Entity)()
], Funder);
