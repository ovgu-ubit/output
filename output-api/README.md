# Publication Server

Steps to run this project:

1. Run `npm run i` and `npm run audit fix` command to install all dependencies
2. Ensure that environment and app configuration are available (env.(dev|test|prod) and config.ts) using provided templates
3. Run `npm run start:(dev|test|prod)` command to test if server is working
4. We recommend using pm2 to run Node.JS servers in production settings
   1. Run `npm run build`
   2. Load the available configuration (output-server-test.config.js) into pm2 and save 

# Migrations from older versions below 1.2

cf. [TypeORM migrations documentation](https://typeorm.io/migrations#migrations)

1. run `npm run build`
2. run `npm run typeorm:dev migration:run -- -d ./src/config/app.data.source.ts` to apply all pending migrations

## Publication export endpoints

Create an export workflow with source **Publikationen** and strategy **Endpoint-Export**.
Choose an endpoint name, access mode, output format and JSONata mapping, then publish it.
For example, the name `publications` exposes `POST /workflow/export/api/publications` relative to the configured API base URL.
The editor displays the full URL and a copyable request example.

The JSON body uses the same filter structure as `POST /publications/filter`:

```json
{
  "filter": {
    "expressions": [
      { "op": 0, "key": "title", "comp": 0, "value": "test" }
    ]
  },
  "paths": []
}
```

Both fields are optional; an empty body exports all publications. Field filters and named filter paths run before the mapping.
The workflow fixes the mapping and output format (JSON, XML, CSV or XLSX).
JSONata runs once per publication with the existing `params.cfg` context.
Public endpoints use the full export data, including invoices and internal fields; their saved mapping controls the response.
Protected access is the default and uses the existing Output login with reader access.

Only active published endpoint workflows are callable. Names are unique among active endpoints;
archiving makes the endpoint unavailable and releases its name. A replacement workflow version can reuse the same name.
Each request creates its own export instance and workflow report, allowing concurrent calls.

Apply the endpoint migration before deploying this feature. It extends the export strategy enum and adds a unique index;
schema initialization also creates the index. Rollback is refused while any endpoint workflow still exists, including archived workflows.
