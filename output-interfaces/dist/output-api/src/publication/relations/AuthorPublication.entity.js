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
exports.AuthorPublication = void 0;
const typeorm_1 = require("typeorm");
const Author_entity_1 = require("../../author/Author.entity");
const Institute_entity_1 = require("../../institute/Institute.entity");
const Publication_entity_1 = require("../core/Publication.entity");
const Role_entity_1 = require("./Role.entity");
let AuthorPublication = class AuthorPublication {
    id;
    authorId;
    author;
    publicationId;
    publication;
    role;
    affiliation;
    institute;
    corresponding;
};
exports.AuthorPublication = AuthorPublication;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AuthorPublication.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], AuthorPublication.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Author_entity_1.Author, author => author.authorPublications),
    (0, typeorm_1.JoinColumn)({
        name: 'authorId',
        referencedColumnName: 'id'
    }),
    __metadata("design:type", Author_entity_1.Author)
], AuthorPublication.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], AuthorPublication.prototype, "publicationId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Publication_entity_1.Publication, pub => pub.authorPublications),
    (0, typeorm_1.JoinColumn)({
        name: 'publicationId',
        referencedColumnName: 'id'
    }),
    __metadata("design:type", Publication_entity_1.Publication)
], AuthorPublication.prototype, "publication", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Role_entity_1.Role),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Role_entity_1.Role)
], AuthorPublication.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AuthorPublication.prototype, "affiliation", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Institute_entity_1.Institute),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Institute_entity_1.Institute)
], AuthorPublication.prototype, "institute", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], AuthorPublication.prototype, "corresponding", void 0);
exports.AuthorPublication = AuthorPublication = __decorate([
    (0, typeorm_1.Entity)()
], AuthorPublication);
