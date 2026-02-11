import { z, ZodError } from "zod";
import { ImportWorkflow } from "./ImportWorkflow.entity";
import { BadRequestException } from "@nestjs/common";
import { Strategy } from "../../../output-interfaces/Workflow";

const StrategyTypeSchema = z.enum([
  "FILE_UPLOAD",
  "URL_LOOKUP_AND_RETRIEVE",
  "URL_QUERY_OFFSET",
  "URL_DOI",
]);

const StrategyFromApi: Record<
  z.infer<typeof StrategyTypeSchema>,
  Strategy
> = {
  FILE_UPLOAD: Strategy.FILE_UPLOAD,
  URL_LOOKUP_AND_RETRIEVE: Strategy.URL_LOOKUP_AND_RETRIEVE,
  URL_QUERY_OFFSET: Strategy.URL_QUERY_OFFSET,
  URL_DOI: Strategy.URL_DOI,
};

const StrategyTypeFromNumber = (v: unknown) => {
  if (typeof v !== "number" || !Number.isInteger(v)) return v;

  switch (v) {
    case 0: return "FILE_UPLOAD";
    case 1: return "URL_LOOKUP_AND_RETRIEVE";
    case 2: return "URL_QUERY_OFFSET";
    case 3: return "URL_DOI";
    default: return v; // damit Zod sauber "invalid_enum_value" o.ä. wirft
  }
};

const StrategyTypeCoerced = z.preprocess(StrategyTypeFromNumber, StrategyTypeSchema);

const JsonataExpr = z.string().min(1, "JSONata expression must not be empty");

const ImportMeta = z.object({
  workflow_id: z.string(),
  label: z.string().min(1),
  strategy_type: StrategyTypeCoerced,
  mapping: JsonataExpr,
});

const CommonStrategy = z.looseObject({
  exclusion_criteria: JsonataExpr,
  only_import_if_authors_inst: z.boolean(),
  format: z.enum(["json", "xml", "csv", "xlsx"]),
}).superRefine((strategy, ctx) => {
  if (strategy.format !== "csv") return;

  if (typeof strategy.delimiter !== "string" || strategy.delimiter.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["delimiter"],
      message: "delimiter is required when format is csv",
    });
  }

  if (typeof strategy.quote_char !== "string" || strategy.quote_char.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["quote_char"],
      message: "quote_char is required when format is csv",
    });
  }

  if (typeof strategy.skip_first_line !== "boolean") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["skip_first_line"],
      message: "skip_first_line is required when format is csv",
    });
  }

  if (typeof strategy.encoding !== "string" || strategy.encoding.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encoding"],
      message: "encoding is required when format is csv",
    });
  }
});

const URLStrategyConfig = z
  .looseObject({
    delayInMs: z.number().min(0),
    parallelCalls: z.number().int().min(1),
  });

const DoiStrategyConfig = z
  .intersection(
    CommonStrategy,
    z.intersection(
      URLStrategyConfig,
      z.looseObject({
        url_doi: z.string().min(1),
        get_doi_item: JsonataExpr,
      })));

const QueryOffsetStrategyConfig = z
  .intersection(
    CommonStrategy,
    z.intersection(
      URLStrategyConfig,
      z.looseObject({
        url_count: z.string().min(1),
        url_items: z.string().min(1),
        max_res: z.number().int().positive(),
        max_res_name: z.string().min(1),
        request_mode: z.enum(["offset", "page"]),
        offset_name: z.string().min(1),
        offset_start: z.number().int(),
        get_count: JsonataExpr,
        get_items: JsonataExpr,
        search_text_combiner: z.string().default(" "),
      })));

const Base = ImportMeta.extend({
  strategy: z.unknown(), // wird je Variante überschrieben
});

export const ImportWorkflowSourceSchema = z.preprocess((obj) => {
  if (obj && typeof obj === "object") {
    const o = obj as any;
    return {
      ...o,
      strategy_type: StrategyTypeFromNumber(o.strategy_type),
    };
  }
  return obj;
},
  z.discriminatedUnion("strategy_type", [
    Base.extend({
      strategy_type: z.literal("URL_QUERY_OFFSET"),
      strategy: QueryOffsetStrategyConfig,
    }),
    Base.extend({
      strategy_type: z.literal("URL_DOI"),
      strategy: DoiStrategyConfig,
    }),
    Base.extend({
      strategy_type: z.literal("FILE_UPLOAD"),
      strategy: z.looseObject({}), // ggf. hier file-spezifische Felder
    }),
    Base.extend({
      strategy_type: z.literal("URL_LOOKUP_AND_RETRIEVE"),
      strategy: z.looseObject({}), // ggf. hier file-spezifische Felder
    }),
  ]));

export type ImportWorkflowSourceInput = z.infer<typeof ImportWorkflowSourceSchema>;

export function validateImportWorkflow(workflow: ImportWorkflow) {
  if (!workflow.strategy_type) return true;
  const schema = ImportWorkflowSourceSchema;

  if (!schema) return; // unbekannter Key → dito
  try {
    return schema.parse(workflow);
  } catch (e) {
    if (e instanceof ZodError) {
      // UI-freundliches Fehlerformat
      const details = e.issues.map((iss) => ({
        path: iss.path.join("."),
        message: iss.message,
        code: iss.code,
      }));
      throw new BadRequestException({
        message: "Validation failed",
        details,
      });
    }
    throw e;
  }
}