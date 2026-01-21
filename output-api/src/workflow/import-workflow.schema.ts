//TODO AI generated
import { z } from "zod";

const JsonataExpr = z.string().min(1, "JSONata expression must not be empty");

const DoiStrategyConfig = z
  .object({
    url_doi: z.string().min(1),
    get_doi_item_expr: JsonataExpr,
  })
  .passthrough(); // später ggf. .strict()

const QueryOffsetStrategyConfig = z
  .object({
    url_count: z.string().min(1),
    url_items: z.string().min(1),
    max_res: z.number().int().positive(),
    max_res_name: z.string().min(1),
    request_mode: z.enum(["offset", "page"]),
    offset_name: z.string().min(1),
    offset_start: z.number().int(),
    get_count_expr: JsonataExpr,
    get_items_expr: JsonataExpr,
    search_text_combiner: z.string().default(" "),
  })
  .passthrough();

const Strategy = z.discriminatedUnion("strategy_type", [
  z.object({
    strategy_type: z.literal("doi"),
    strategy_config: DoiStrategyConfig,
  }),
  z.object({
    strategy_type: z.literal("query_offset"),
    strategy_config: QueryOffsetStrategyConfig,
  }),
]);

export const ImportWorkflowSourceSchema = z
  .object({
    name: z.string().min(1),
    enabled: z.boolean().default(true),
    format: z.enum(["json", "xml"]),
    delay_in_ms: z.number().int().nonnegative().default(0),
    parallel_calls: z.number().int().positive().default(1),
    only_import_if_authors_inst: z.boolean().default(false),
    exclusion_criteria_expr: JsonataExpr.optional(),
  })
  .and(Strategy)
  .superRefine((val, ctx) => {
    if (val.strategy_type === "query_offset") {
      const c = val.strategy_config;
      if (c.request_mode === "page" && c.offset_start < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["strategy_config", "offset_start"],
          message: "For request_mode=page, offset_start should be >= 1",
        });
      }
    }
  });

export type ImportWorkflowSourceInput = z.infer<typeof ImportWorkflowSourceSchema>;