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
exports.Publication = void 0;
const typeorm_1 = require("typeorm");
const AuthorPublication_entity_1 = require("../relations/AuthorPublication.entity");
const Contract_entity_1 = require("../../contract/Contract.entity");
const OA_Category_entity_1 = require("../../oa_category/OA_Category.entity");
const Publisher_entity_1 = require("../../publisher/Publisher.entity");
const PublicationIdentifier_entity_1 = require("./PublicationIdentifier.entity");
const PublicationSupplement_entity_1 = require("./PublicationSupplement.entity");
const PublicationDuplicate_entity_1 = require("./PublicationDuplicate.entity");
const Funder_entity_1 = require("../../funder/Funder.entity");
const GreaterEntity_entity_1 = require("../../greater_entity/GreaterEntity.entity");
const Invoice_entity_1 = require("../../invoice/Invoice.entity");
const PublicationType_entity_1 = require("../../pub_type/PublicationType.entity");
const Language_entity_1 = require("../lookups/Language.entity");
const PublicationChange_entity_1 = require("./PublicationChange.entity");
let Publication = class Publication {
    id;
    authorPublications;
    pub_type;
    oa_category;
    greater_entity;
    publisher;
    contract;
    funders;
    invoices;
    authors;
    title;
    doi;
    pub_date;
    pub_date_submitted;
    pub_date_accepted;
    pub_date_print;
    link;
    dataSource;
    language;
    second_pub;
    add_info;
    import_date;
    edit_date;
    delete_date;
    locked;
    locked_author;
    locked_biblio;
    locked_finance;
    locked_oa;
    status;
    //OA fields filled by unpaywall
    is_oa;
    oa_status;
    is_journal_oa;
    best_oa_host;
    best_oa_license;
    locked_at;
    abstract;
    //citation fields
    volume;
    issue;
    first_page;
    last_page;
    publisher_location;
    edition;
    article_number;
    page_count;
    peer_reviewed;
    identifiers;
    cost_approach;
    cost_approach_currency;
    not_budget_relevant;
    grant_number;
    contract_year;
    supplements;
    duplicates;
    changes;
};
exports.Publication = Publication;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Publication.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => AuthorPublication_entity_1.AuthorPublication, authorPublication => authorPublication.publication, { cascade: true }),
    __metadata("design:type", Array)
], Publication.prototype, "authorPublications", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => PublicationType_entity_1.PublicationType, pub => pub.id),
    __metadata("design:type", PublicationType_entity_1.PublicationType)
], Publication.prototype, "pub_type", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => OA_Category_entity_1.OA_Category, oa => oa.id),
    __metadata("design:type", OA_Category_entity_1.OA_Category)
], Publication.prototype, "oa_category", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => GreaterEntity_entity_1.GreaterEntity, ge => ge.id),
    __metadata("design:type", GreaterEntity_entity_1.GreaterEntity)
], Publication.prototype, "greater_entity", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Publisher_entity_1.Publisher, p => p.id),
    __metadata("design:type", Publisher_entity_1.Publisher)
], Publication.prototype, "publisher", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contract_entity_1.Contract, c => c.id),
    __metadata("design:type", Contract_entity_1.Contract)
], Publication.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => Funder_entity_1.Funder, (f) => f.publications),
    (0, typeorm_1.JoinTable)(),
    __metadata("design:type", Array)
], Publication.prototype, "funders", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Invoice_entity_1.Invoice, (i) => i.publication, { cascade: true }),
    __metadata("design:type", Array)
], Publication.prototype, "invoices", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "authors", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "doi", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Publication.prototype, "pub_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Publication.prototype, "pub_date_submitted", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Publication.prototype, "pub_date_accepted", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Publication.prototype, "pub_date_print", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "link", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Publication.prototype, "dataSource", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Language_entity_1.Language, c => c.id),
    __metadata("design:type", Language_entity_1.Language)
], Publication.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "second_pub", void 0);
__decorate([
    (0, typeorm_1.Column)({
        default: '',
        nullable: true
    }),
    __metadata("design:type", String)
], Publication.prototype, "add_info", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Publication.prototype, "import_date", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Publication.prototype, "edit_date", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Publication.prototype, "delete_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Publication.prototype, "locked", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Publication.prototype, "locked_author", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Publication.prototype, "locked_biblio", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Publication.prototype, "locked_finance", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Publication.prototype, "locked_oa", void 0);
__decorate([
    (0, typeorm_1.Column)({
        default: 0
    }),
    __metadata("design:type", Number)
], Publication.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], Publication.prototype, "is_oa", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "oa_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], Publication.prototype, "is_journal_oa", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "best_oa_host", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "best_oa_license", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'timestamptz' }),
    __metadata("design:type", Date)
], Publication.prototype, "locked_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "abstract", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "volume", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "issue", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "first_page", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "last_page", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "publisher_location", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "edition", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "article_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Publication.prototype, "page_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], Publication.prototype, "peer_reviewed", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PublicationIdentifier_entity_1.PublicationIdentifier, (ide) => ide.entity, { cascade: true }),
    __metadata("design:type", Array)
], Publication.prototype, "identifiers", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: "float" }),
    __metadata("design:type", Number)
], Publication.prototype, "cost_approach", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'EUR' }),
    __metadata("design:type", String)
], Publication.prototype, "cost_approach_currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Boolean)
], Publication.prototype, "not_budget_relevant", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Publication.prototype, "grant_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: "int" }),
    __metadata("design:type", Number)
], Publication.prototype, "contract_year", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PublicationSupplement_entity_1.PublicationSupplement, (ide) => ide.publication, { cascade: true }),
    __metadata("design:type", Array)
], Publication.prototype, "supplements", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PublicationDuplicate_entity_1.PublicationDuplicate, (ide) => ide.first, { cascade: true }),
    __metadata("design:type", Array)
], Publication.prototype, "duplicates", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => PublicationChange_entity_1.PublicationChange, (change) => change.publication),
    __metadata("design:type", Array)
], Publication.prototype, "changes", void 0);
exports.Publication = Publication = __decorate([
    (0, typeorm_1.Entity)()
], Publication);
