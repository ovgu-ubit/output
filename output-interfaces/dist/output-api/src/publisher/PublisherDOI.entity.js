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
exports.PublisherDOI = void 0;
const typeorm_1 = require("typeorm");
const Publisher_entity_1 = require("./Publisher.entity");
let PublisherDOI = class PublisherDOI {
    publisher;
    publisherId;
    doi_prefix;
};
exports.PublisherDOI = PublisherDOI;
__decorate([
    (0, typeorm_1.ManyToOne)(() => Publisher_entity_1.Publisher, i => i.doi_prefixes, {
        orphanedRowAction: "delete"
    }),
    (0, typeorm_1.JoinColumn)({
        name: 'publisherId',
        referencedColumnName: 'id'
    }),
    __metadata("design:type", Publisher_entity_1.Publisher)
], PublisherDOI.prototype, "publisher", void 0);
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], PublisherDOI.prototype, "publisherId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", String)
], PublisherDOI.prototype, "doi_prefix", void 0);
exports.PublisherDOI = PublisherDOI = __decorate([
    (0, typeorm_1.Entity)()
], PublisherDOI);
