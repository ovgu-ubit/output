import { z } from "zod";

const JsonataExpr = z.string().min(1, "JSONata expression must not be empty");

const ImportStrategyConfig = z
  .looseObject({
    exclusion_criteria: JsonataExpr,
    only_import_if_authors_inst: z.boolean(),
    format: z.enum(["json", "xml", "csv", "xlsx"]),
    mapping: JsonataExpr
  }); // später ggf. .strict()

const URLStrategyConfig = z
  .looseObject({
    delayInMs: z.number().min(0),
    parallelCalls: z.number().int().min(1),
  });

const DoiStrategyConfig = z
  .intersection(
    URLStrategyConfig,
    z.looseObject({
      url_doi: z.string().min(1),
      get_doi_item: JsonataExpr,
    }));

const QueryOffsetStrategyConfig = z
  .intersection(
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
    }));

const UrlStrategies = z.discriminatedUnion("strategy_type", [
  z.object({
    strategy_type: z.literal("url_doi"),
    strategy_config: DoiStrategyConfig,
  }),
  z.object({
    strategy_type: z.literal("url_query_offset"),
    strategy_config: QueryOffsetStrategyConfig,
  })
]);

const FileStrategy = z.object({
  strategy_type: z.literal("file"),
  strategy_config: z.looseObject({}),
});

export const ImportWorkflowSourceSchema =
  ImportStrategyConfig
    .and(z.union([UrlStrategies, FileStrategy]))

export type ImportWorkflowSourceInput = z.infer<typeof ImportWorkflowSourceSchema>;