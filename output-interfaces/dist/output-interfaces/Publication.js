"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceKind = exports.ContractModel = void 0;
var ContractModel;
(function (ContractModel) {
    ContractModel[ContractModel["DISCOUNT"] = 0] = "DISCOUNT";
    ContractModel[ContractModel["PUBLISH_AND_READ"] = 1] = "PUBLISH_AND_READ";
    ContractModel[ContractModel["FLATRATE"] = 2] = "FLATRATE";
})(ContractModel || (exports.ContractModel = ContractModel = {}));
var InvoiceKind;
(function (InvoiceKind) {
    InvoiceKind["INVOICE"] = "invoice";
    InvoiceKind["PRE_INVOICE"] = "pre_invoice";
})(InvoiceKind || (exports.InvoiceKind = InvoiceKind = {}));
