import { z, ZodError } from "zod";
import { CompareOperation, JoinOperation } from "../../../output-interfaces/Config";
import { ValidationWorkflow } from "./ValidationWorkflow.entity";
import { createValidationHttpException } from "../common/api-error";

const NonEmptyStringSchema = z.string().trim().min(1);
const ValidationResultSchema = z.enum(["info", "warning", "error"]);
const ValidationTargetSchema = z.enum(["publication"]);
const SearchFilterValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
]);

const SearchFilterExpressionSchema = z.object({
  op: z.nativeEnum(JoinOperation),
  key: NonEmptyStringSchema,
  comp: z.nativeEnum(CompareOperation),
  value: SearchFilterValueSchema,
}).strict();

const SearchFilterSchema = z.object({
  expressions: z.array(SearchFilterExpressionSchema),
}).strict();

const ValidationRequiredConditionSchema = z.object({
  type: z.literal("required"),
  path: NonEmptyStringSchema,
}).strict();

const ValidationCompareConditionSchema = z.object({
  type: z.literal("compare"),
  path: NonEmptyStringSchema,
  comp: z.nativeEnum(CompareOperation),
  value: SearchFilterValueSchema,
  negate: z.boolean().optional(),
}).strict();

const ValidationConditionSchema = z.discriminatedUnion("type", [
  ValidationRequiredConditionSchema,
  ValidationCompareConditionSchema,
]);

const ValidationConditionGroupSchema = z.union([
  ValidationConditionSchema,
  z.array(ValidationConditionSchema).min(1),
]);

const ValidationRequiredRuleSchema = ValidationRequiredConditionSchema.extend({
  result: ValidationResultSchema,
}).strict();

const ValidationCompareRuleSchema = ValidationCompareConditionSchema.extend({
  result: ValidationResultSchema,
}).strict();

const ValidationConditionalRuleSchema = z.object({
  type: z.literal("conditional"),
  result: ValidationResultSchema,
  if: ValidationConditionGroupSchema,
  then: ValidationConditionGroupSchema,
}).strict();

const ValidationWorkflowSourceSchema = z.object({
  workflow_id: z.string(),
  label: NonEmptyStringSchema,
  target: ValidationTargetSchema,
  target_filter: z.preprocess((value) => value === null ? undefined : value, SearchFilterSchema.optional()),
  rules: z.preprocess((value) => value === null ? undefined : value, z.array(z.discriminatedUnion("type", [
    ValidationRequiredRuleSchema,
    ValidationCompareRuleSchema,
    ValidationConditionalRuleSchema,
  ])).optional()),
}).passthrough();

export function validateValidationWorkflow(workflow: ValidationWorkflow): ValidationWorkflow {
  try {
    const parsed = ValidationWorkflowSourceSchema.parse(workflow);
    return {
      ...workflow,
      ...parsed,
      target_filter: parsed.target_filter as ValidationWorkflow["target_filter"],
      rules: parsed.rules as ValidationWorkflow["rules"],
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));
      throw createValidationHttpException(details);
    }

    throw error;
  }
}
