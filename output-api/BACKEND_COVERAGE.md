# Backend test coverage analysis

## Current snapshot (Jest)
- Command: `npm run test:cov`
- Jest encountered TypeScript errors while instrumenting `src/workflow/import/csv-import.service.ts` and `src/workflow/import/excel-import.service.ts` because `Express.Multer.File` was unresolved, indicating missing Express/Multer type declarations.

## Gaps observed
1. **Publication domain lacks tests**: `src/publication/core/publication.service.ts` (>700 lines) has ~20% statements/16% lines, and related lookup/relation services have 0% coverage.
2. **Workflow pipelines untested**: Import/export/check/filter services under `src/workflow/**/*` show no coverage. Type errors prevented coverage collection for CSV/Excel import services, hiding potential runtime issues.

## Recommended next steps
1. **Fix type errors blocking coverage**
   - Add explicit Express/Multer types (e.g., install `@types/express` and `@types/multer`, or import `Express` from `express`) in `src/workflow/import/csv-import.service.ts` and `src/workflow/import/excel-import.service.ts` so coverage can be collected.
2. **Add focused unit tests for critical domains**
   - Cover `publication.service.ts` query builders and save/error paths using mocked TypeORM repositories and `AppConfigService` to validate filtering, joins, and error handling without hitting a database.
3. **Exercise workflow import/export logic with fixtures**
   - Create unit tests for import/export services that parse CSV/Excel/JSON payloads using small fixture files, mocking external HTTP calls (Crossref, OpenAlex, DOAJ) with `@nestjs/axios` mocks.
   - Validate filtering/plausibility checks in `workflow/check` and `workflow/filter` to ensure conditions catch duplicates, missing institutes, and invoice gaps.
4. **Add regression-friendly integration slices**
   - Introduce lightweight integration tests for representative controllers/services (e.g., publication index queries, author CRUD) using an in-memory database (SQLite) to cover data relationships and ensure module wiring is intact.
5. **Automate coverage enforcement**
   - Enable a minimum coverage threshold in `jest.config.ts` (start low, e.g., 20%) and raise gradually as new suites land.
   - Add a CI step that runs `npm run test:cov` and fails on type errors or threshold regressions.

## Suggested prioritization
1. Resolve type definition errors (fast unblocker).
2. Write unit tests for `publication.service.ts` (highest impact on stability).
3. Add fixture-driven tests for import/export workflows and checks (covers largest untested surface).
4. Introduce coverage thresholds and CI guardrails once baseline coverage improves.
