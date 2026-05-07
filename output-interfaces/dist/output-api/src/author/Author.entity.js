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
exports.Author = void 0;
const typeorm_1 = require("typeorm");
const Institute_entity_1 = require("../institute/Institute.entity");
const AuthorPublication_entity_1 = require("../publication/relations/AuthorPublication.entity");
const AliasAuthorFirstName_entity_1 = require("./AliasAuthorFirstName.entity");
const AliasAuthorLastName_entity_1 = require("./AliasAuthorLastName.entity");
let Author = class Author {
    id;
    first_name;
    last_name;
    title;
    institutes;
    orcid;
    gnd_id;
    authorPublications;
    locked_at;
    aliases_first_name;
    aliases_last_name;
};
exports.Author = Author;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Author.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Author.prototype, "first_name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Author.prototype, "last_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Author.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Institute_entity_1.Institute, (inst) => inst.authors, { cascade: true }),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], Author.prototype, "institutes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Author.prototype, "orcid", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Author.prototype, "gnd_id", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AuthorPublication_entity_1.AuthorPublication, authorPublication => authorPublication.author, { cascade: true }),
    __metadata("design:type", Array)
], Author.prototype, "authorPublications", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Author.prototype, "locked_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AliasAuthorFirstName_entity_1.AliasAuthorFirstName, ai => ai.element, { cascade: true }),
    __metadata("design:type", Array)
], Author.prototype, "aliases_first_name", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AliasAuthorLastName_entity_1.AliasAuthorLastName, ai => ai.element, { cascade: true }),
    __metadata("design:type", Array)
], Author.prototype, "aliases_last_name", void 0);
exports.Author = Author = __decorate([
    (0, typeorm_1.Entity)()
], Author);
