import { BadRequestException } from "@nestjs/common";
import { z, ZodError } from "zod";
import { ExportStrategy } from "../../../output-interfaces/Workflow";
import { ExportWorkflow } from "./ExportWorkflow.entity";

const StrategyTypeSchema = z.enum(["HTTP_RESPONSE"]);

const StrategyTypeFromNumber = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value)) return value;

  switch (value) {
    case ExportStrategy.HTTP_RESPONSE:
      return "HTTP_RESPONSE";
    default:
      return value;
  }
};

const JsonataExpr = z.string().min(1, "JSONata expression must not be empty");
const DispositionSchema = z.enum(["inline", "attachment"]);
const XmlNameSchema = z.string().trim().min(1);
const SheetNameSchema = z.string().trim().min(1);

const HttpResponseStrategyBaseSchema = z.object({
  disposition: DispositionSchema.optional(),
});

const JsonStrategySchema = HttpResponseStrategyBaseSchema.extend({
  format: z.literal("json"),
}).strict();

const XmlStrategySchema = HttpResponseStrategyBaseSchema.extend({
  format: z.literal("xml"),
  root_name: XmlNameSchema,
  item_name: XmlNameSchema,
}).strict();

const CsvStrategySchema = HttpResponseStrategyBaseSchema.extend({
  format: z.literal("csv"),
  delimiter: z.string().min(1),
  quote_char: z.string().min(1),
}).strict();

const XlsxStrategySchema = HttpResponseStrategyBaseSchema.extend({
  format: z.literal("xlsx"),
  sheet_name: SheetNameSchema,
}).superRefine((strategy, ctx) => {
  if (strategy.disposition === "inline") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["disposition"],
      message: "disposition must be attachment when format is xlsx",
    });
  }
}).strict();

const HttpResponseStrategySchema = z.discriminatedUnion("format", [
  JsonStrategySchema,
  XmlStrategySchema,
  CsvStrategySchema,
  XlsxStrategySchema,
]);

const ExportMeta = z.object({
  workflow_id: z.string(),
  label: z.string().min(1),
  strategy_type: z.preprocess(StrategyTypeFromNumber, StrategyTypeSchema),
  mapping: JsonataExpr,
});

const Base = ExportMeta.extend({
  strategy: z.unknown(),
});

export const ExportWorkflowSourceSchema = z.preprocess((obj) => {
  if (obj && typeof obj === "object") {
    const workflow = obj as Record<string, unknown>;
    return {
      ...workflow,
      strategy_type: StrategyTypeFromNumber(workflow.strategy_type),
    };
  }
  return obj;
}, z.discriminatedUnion("strategy_type", [
  Base.extend({
    strategy_type: z.literal("HTTP_RESPONSE"),
    strategy: HttpResponseStrategySchema,
  }),
]));

export type ExportWorkflowSourceInput = z.infer<typeof ExportWorkflowSourceSchema>;

export function validateExportWorkflow(workflow: ExportWorkflow) {
  if (workflow.strategy_type === null || workflow.strategy_type === undefined) return true;

  try {
    return ExportWorkflowSourceSchema.parse(workflow);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));
      throw new BadRequestException({
        message: "Validation failed",
        details,
      });
    }

    throw error;
  }
}
