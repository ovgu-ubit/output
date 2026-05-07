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
exports.AliasAuthorLastName = void 0;
const typeorm_1 = require("typeorm");
const Author_entity_1 = require("./Author.entity");
let AliasAuthorLastName = class AliasAuthorLastName {
    element;
    elementId;
    alias;
};
exports.AliasAuthorLastName = AliasAuthorLastName;
__decorate([
    (0, typeorm_1.ManyToOne)(() => Author_entity_1.Author, i => i.aliases_last_name, {
        orphanedRowAction: "delete"
    }),
    (0, typeorm_1.JoinColumn)({
        name: 'elementId',
        referencedColumnName: 'id'
    }),
    __metadata("design:type", Author_entity_1.Author)
], AliasAuthorLastName.prototype, "element", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], AliasAuthorLastName.prototype, "elementId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], AliasAuthorLastName.prototype, "alias", void 0);
exports.AliasAuthorLastName = AliasAuthorLastName = __decorate([
    (0, typeorm_1.Entity)()
], AliasAuthorLastName);
