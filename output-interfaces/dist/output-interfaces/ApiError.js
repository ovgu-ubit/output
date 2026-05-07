"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiErrorCode = void 0;
var ApiErrorCode;
(function (ApiErrorCode) {
    ApiErrorCode["VALIDATION_FAILED"] = "VALIDATION_FAILED";
    ApiErrorCode["INVALID_REQUEST"] = "INVALID_REQUEST";
    ApiErrorCode["ENTITY_LOCKED"] = "ENTITY_LOCKED";
    ApiErrorCode["UNIQUE_CONSTRAINT"] = "UNIQUE_CONSTRAINT";
    ApiErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ApiErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ApiErrorCode["UNAUTHENTICATED"] = "UNAUTHENTICATED";
    ApiErrorCode["WORKFLOW_RUNNING"] = "WORKFLOW_RUNNING";
    ApiErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ApiErrorCode || (exports.ApiErrorCode = ApiErrorCode = {}));
