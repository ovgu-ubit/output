export const EXPORT_ENDPOINT_NAME_INDEX = 'UQ_workflow_export_endpoint_name';

// Keep the predicate independent of enum literals so adding a strategy works in
// the same migration transaction as creating the index.
export const CREATE_EXPORT_ENDPOINT_NAME_INDEX = `CREATE UNIQUE INDEX IF NOT EXISTS "${EXPORT_ENDPOINT_NAME_INDEX}"
    ON "workflow_export" (("strategy"->>'endpoint_name'))
    WHERE "published_at" IS NOT NULL AND "deleted_at" IS NULL`;
