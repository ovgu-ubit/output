import { z } from "zod";
import { ContractModel } from "../../../output-interfaces/Publication";

const PercentageValueSchema = z.number().finite().min(0).max(100);
const CurrencyValueSchema = z.number().finite().min(0);

export const DiscountContractModelParamsSchema = z.object({
    percentage: PercentageValueSchema,
    service_fee: CurrencyValueSchema,
}).strict();

export const PublishAndReadContractModelParamsSchema = z.object({
    par_fee: CurrencyValueSchema,
    service_fee: CurrencyValueSchema,
}).strict();

export const FlatrateLimitTypeSchema = z.enum(["count", "budget"]);
export const FlatrateDistributionFormulaSchema = z.enum([
    "average",
    "list-price-porportional",
    "first_come_first_serve",
]);

export const FlatrateContractModelParamsSchema = z.object({
    limit_type: FlatrateLimitTypeSchema,
    distribution_formula: FlatrateDistributionFormulaSchema,
    service_fee: CurrencyValueSchema,
}).strict();

export const ContractModelParamsSchemaByModel = {
    [ContractModel.DISCOUNT]: DiscountContractModelParamsSchema,
    [ContractModel.PUBLISH_AND_READ]: PublishAndReadContractModelParamsSchema,
    [ContractModel.FLATRATE]: FlatrateContractModelParamsSchema,
} as const;

export function getContractModelParamsSchema(contractModel?: ContractModel | null) {
    if (contractModel === undefined || contractModel === null) return null;
    return ContractModelParamsSchemaByModel[contractModel] ?? null;
}

export function parseContractModelParams(contractModel: ContractModel | null | undefined, params: unknown) {
    const schema = getContractModelParamsSchema(contractModel);

    if (!schema) return params;

    return schema.parse(params);
}

export type DiscountContractModelParams = z.infer<typeof DiscountContractModelParamsSchema>;
export type PublishAndReadContractModelParams = z.infer<typeof PublishAndReadContractModelParamsSchema>;
export type FlatrateContractModelParams = z.infer<typeof FlatrateContractModelParamsSchema>;
export type ContractModelParams =
    | DiscountContractModelParams
    | PublishAndReadContractModelParams
    | FlatrateContractModelParams;
