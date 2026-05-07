"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinOperation = exports.CompareOperation = exports.SearchFilterExpression = exports.SearchFilter = exports.CSVMapping = exports.UpdateOptions = exports.UpdateMapping = exports.AppError = void 0;
class AppError {
    origin;
    text;
}
exports.AppError = AppError;
class UpdateMapping {
    author_inst = UpdateOptions.APPEND;
    authors = UpdateOptions.REPLACE_IF_EMPTY;
    title = UpdateOptions.IGNORE;
    pub_type = UpdateOptions.REPLACE_IF_EMPTY;
    oa_category = UpdateOptions.REPLACE_IF_EMPTY;
    greater_entity = UpdateOptions.REPLACE_IF_EMPTY;
    publisher = UpdateOptions.REPLACE_IF_EMPTY;
    contract = UpdateOptions.REPLACE_IF_EMPTY;
    funder = UpdateOptions.APPEND;
    doi = UpdateOptions.REPLACE_IF_EMPTY;
    pub_date = UpdateOptions.REPLACE_IF_EMPTY;
    link = UpdateOptions.REPLACE_IF_EMPTY;
    language = UpdateOptions.REPLACE_IF_EMPTY;
    license = UpdateOptions.REPLACE_IF_EMPTY;
    invoice = UpdateOptions.REPLACE_IF_EMPTY;
    status = UpdateOptions.REPLACE_IF_EMPTY;
    abstract = UpdateOptions.REPLACE_IF_EMPTY;
    citation = UpdateOptions.REPLACE_IF_EMPTY;
    page_count = UpdateOptions.REPLACE_IF_EMPTY;
    peer_reviewed = UpdateOptions.REPLACE_IF_EMPTY;
    cost_approach = UpdateOptions.REPLACE_IF_EMPTY;
}
exports.UpdateMapping = UpdateMapping;
var UpdateOptions;
(function (UpdateOptions) {
    UpdateOptions[UpdateOptions["IGNORE"] = 0] = "IGNORE";
    UpdateOptions[UpdateOptions["REPLACE"] = 1] = "REPLACE";
    UpdateOptions[UpdateOptions["REPLACE_IF_EMPTY"] = 2] = "REPLACE_IF_EMPTY";
    UpdateOptions[UpdateOptions["APPEND"] = 3] = "APPEND";
})(UpdateOptions || (exports.UpdateOptions = UpdateOptions = {}));
class CSVMapping {
    name;
    encoding;
    header;
    quotes;
    delimiter;
    quoteChar;
    date_format;
    id_ge_type;
    last_name_first;
    split_authors;
    deal_flat_fee;
    mapping;
}
exports.CSVMapping = CSVMapping;
class SearchFilter {
    expressions;
}
exports.SearchFilter = SearchFilter;
class SearchFilterExpression {
    op;
    key;
    comp;
    value;
}
exports.SearchFilterExpression = SearchFilterExpression;
var CompareOperation;
(function (CompareOperation) {
    CompareOperation[CompareOperation["INCLUDES"] = 0] = "INCLUDES";
    CompareOperation[CompareOperation["EQUALS"] = 1] = "EQUALS";
    CompareOperation[CompareOperation["STARTS_WITH"] = 2] = "STARTS_WITH";
    CompareOperation[CompareOperation["GREATER_THAN"] = 3] = "GREATER_THAN";
    CompareOperation[CompareOperation["SMALLER_THAN"] = 4] = "SMALLER_THAN";
    CompareOperation[CompareOperation["IN"] = 5] = "IN";
})(CompareOperation || (exports.CompareOperation = CompareOperation = {}));
var JoinOperation;
(function (JoinOperation) {
    JoinOperation[JoinOperation["AND"] = 0] = "AND";
    JoinOperation[JoinOperation["OR"] = 1] = "OR";
    JoinOperation[JoinOperation["AND_NOT"] = 2] = "AND_NOT";
})(JoinOperation || (exports.JoinOperation = JoinOperation = {}));
