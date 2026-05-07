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
exports.Institute = void 0;
const typeorm_1 = require("typeorm");
const AuthorPublication_entity_1 = require("../publication/relations/AuthorPublication.entity");
const AliasInstitute_entity_1 = require("./AliasInstitute.entity");
const Author_entity_1 = require("../author/Author.entity");
let Institute = class Institute {
    id;
    super_institute;
    sub_institutes;
    label;
    short_label;
    opus_id;
    authors;
    authorPublications;
    aliases;
    locked_at;
};
exports.Institute = Institute;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Institute.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.TreeParent)(),
    __metadata("design:type", Institute)
], Institute.prototype, "super_institute", void 0);
__decorate([
    (0, typeorm_1.TreeChildren)(),
    __metadata("design:type", Array)
], Institute.prototype, "sub_institutes", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Institute.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Institute.prototype, "short_label", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Institute.prototype, "opus_id", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Author_entity_1.Author, (author) => author.institutes),
    __metadata("design:type", Array)
], Institute.prototype, "authors", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AuthorPublication_entity_1.AuthorPublication, authorPublication => authorPublication.institute, { cascade: true }),
    __metadata("design:type", Array)
], Institute.prototype, "authorPublications", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AliasInstitute_entity_1.AliasInstitute, ai => ai.element, { cascade: true }),
    __metadata("design:type", Array)
], Institute.prototype, "aliases", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Institute.prototype, "locked_at", void 0);
exports.Institute = Institute = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Tree)("closure-table")
], Institute);
