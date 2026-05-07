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
exports.OA_Category = void 0;
const typeorm_1 = require("typeorm");
const Publication_entity_1 = require("../publication/core/Publication.entity");
let OA_Category = class OA_Category {
    id;
    label;
    is_oa;
    publications;
    locked_at;
};
exports.OA_Category = OA_Category;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], OA_Category.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OA_Category.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], OA_Category.prototype, "is_oa", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Publication_entity_1.Publication, (p) => p.oa_category),
    __metadata("design:type", Array)
], OA_Category.prototype, "publications", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], OA_Category.prototype, "locked_at", void 0);
exports.OA_Category = OA_Category = __decorate([
    (0, typeorm_1.Entity)()
], OA_Category);
