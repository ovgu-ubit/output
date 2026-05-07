"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowType = exports.WorkflowReportItemLevel = exports.ExportStrategy = exports.ImportStrategy = void 0;
var ImportStrategy;
(function (ImportStrategy) {
    ImportStrategy[ImportStrategy["FILE_UPLOAD"] = 0] = "FILE_UPLOAD";
    ImportStrategy[ImportStrategy["URL_LOOKUP_AND_RETRIEVE"] = 1] = "URL_LOOKUP_AND_RETRIEVE";
    ImportStrategy[ImportStrategy["URL_QUERY_OFFSET"] = 2] = "URL_QUERY_OFFSET";
    ImportStrategy[ImportStrategy["URL_DOI"] = 3] = "URL_DOI";
})(ImportStrategy || (exports.ImportStrategy = ImportStrategy = {}));
var ExportStrategy;
(function (ExportStrategy) {
    ExportStrategy[ExportStrategy["HTTP_RESPONSE"] = 0] = "HTTP_RESPONSE";
})(ExportStrategy || (exports.ExportStrategy = ExportStrategy = {}));
var WorkflowReportItemLevel;
(function (WorkflowReportItemLevel) {
    WorkflowReportItemLevel["ERROR"] = "error";
    WorkflowReportItemLevel["WARNING"] = "warning";
    WorkflowReportItemLevel["INFO"] = "info";
    WorkflowReportItemLevel["DEBUG"] = "debug";
})(WorkflowReportItemLevel || (exports.WorkflowReportItemLevel = WorkflowReportItemLevel = {}));
var WorkflowType;
(function (WorkflowType) {
    WorkflowType["IMPORT"] = "import";
    WorkflowType["EXPORT"] = "export";
    WorkflowType["VALIDATION"] = "validation";
})(WorkflowType || (exports.WorkflowType = WorkflowType = {}));
