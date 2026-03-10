import { ZodError } from "zod";
import { ContractModel } from "../../../output-interfaces/Publication";
import {
    ContractModelParamsSchemaByModel,
    FlatrateDistributionFormulaSchema,
    FlatrateLimitTypeSchema,
    parseContractModelParams,
} from "./contract-model-params.schema";

describe("contract-model-params.schema", () => {
    it("accepts DISCOUNT params", () => {
        const parsed = ContractModelParamsSchemaByModel[ContractModel.DISCOUNT].parse({
            percentage: 15,
            service_fee: 100,
        });

        expect(parsed).toEqual({
            percentage: 15,
            service_fee: 100,
        });
    });

    it("accepts PUBLISH_AND_READ params", () => {
        const parsed = ContractModelParamsSchemaByModel[ContractModel.PUBLISH_AND_READ].parse({
            par_fee: 2200,
            service_fee: 150,
        });

        expect(parsed).toEqual({
            par_fee: 2200,
            service_fee: 150,
        });
    });

    it("accepts FLATRATE params", () => {
        const parsed = ContractModelParamsSchemaByModel[ContractModel.FLATRATE].parse({
            limit_type: "budget",
            distribution_formula: "list-price-porportional",
            service_fee: 75,
        });

        expect(parsed).toEqual({
            limit_type: "budget",
            distribution_formula: "list-price-porportional",
            service_fee: 75,
        });
    });

    it("rejects invalid DISCOUNT params", () => {
        expect(() => ContractModelParamsSchemaByModel[ContractModel.DISCOUNT].parse({
            percentage: 120,
            service_fee: -1,
        })).toThrow(ZodError);
    });

    it("rejects invalid FLATRATE enum values", () => {
        expect(() => ContractModelParamsSchemaByModel[ContractModel.FLATRATE].parse({
            limit_type: "pages",
            distribution_formula: "service_fee",
            service_fee: 10,
        })).toThrow(ZodError);
    });

    it("rejects unknown params", () => {
        expect(() => ContractModelParamsSchemaByModel[ContractModel.PUBLISH_AND_READ].parse({
            par_fee: 500,
            service_fee: 20,
            extra: true,
        })).toThrow(ZodError);
    });

    it("exposes the allowed FLATRATE enum values", () => {
        expect(FlatrateLimitTypeSchema.options).toEqual(["count", "budget"]);
        expect(FlatrateDistributionFormulaSchema.options).toEqual([
            "average",
            "list-price-porportional",
            "first_come_first_serve",
        ]);
    });

    it("parses by selected contract model", () => {
        expect(parseContractModelParams(ContractModel.PUBLISH_AND_READ, {
            par_fee: 500,
            service_fee: 20,
        })).toEqual({
            par_fee: 500,
            service_fee: 20,
        });
    });

    it("returns params unchanged when no contract model is selected", () => {
        const params = { anything: true };

        expect(parseContractModelParams(undefined, params)).toBe(params);
    });
});
