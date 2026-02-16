# Import Workflows in the Workflow Module

This guide explains how UI users can configure **import workflows** in the Workflow module, especially:

- choosing the right **strategy**
- filling strategy-specific fields
- creating a **JSONata mapping**

The workflow editor is split into tabs/cards for general settings, strategy, and mapping.

## 1) What an import workflow consists of

An import workflow has three main parts:

1. **Meta data** (ID, label, description, etc.)
2. **Strategy** (how source data is fetched/read)
3. **Mapping** (JSONata expression that maps source records to publication fields)

At save/publish time, the backend validates strategy and mapping fields.

## 2) Available strategies

In the UI, users can currently choose these strategy types:

- **Web-Abfrage per Suche und Offset** (`URL_QUERY_OFFSET`)
- **Web-Abfrage per DOI** (`URL_DOI`)
- **Datei-Upload** (`FILE_UPLOAD`)

> Note: `URL_LOOKUP_AND_RETRIEVE` exists in shared backend/frontend enums but is currently not exposed in the strategy selector UI.

---

## 3) Strategy reference

### URL placeholders in strategy definitions

URL strategy fields (`url_count`, `url_items`, `url_doi`) support placeholders in square brackets (`[name]`).
The backend resolves them before making HTTP calls.

Built-in placeholders:

- `[year]` → selected reporting year from the workflow run dialog
- `[search_tags]` → configured search tags joined with `search_text_combiner`
- `[affiliation_tags]` → configured affiliation tags joined with `search_text_combiner`
- `[doi]` → current DOI (for DOI-based enrich workflows)

Configuration placeholders:

- Any configuration key can be referenced as `[config_key]`.
- This is used in templates for values like `[openalex_id]`, `[SECRET_SCOPUS]`, `[SECRET_UNPAYWALL]`.
- If a placeholder has no value, validation fails with an error.

### A) Web-Abfrage per Suche und Offset (`URL_QUERY_OFFSET`)

Use this when an API supports search plus pagination (offset or page).

Important fields:

- `format`: `json` or `xml`
- `url_count`: URL template for total-result requests
- `url_items`: URL template for page item requests
- `max_res`: max number of imported results
- `max_res_name`: query parameter name used for page size
- `request_mode`: `offset` or `page`
- `offset_name`: query parameter for offset/page number
- `offset_start`: first offset/page value
- `get_count`: JSONata extracting total count from the API response
- `get_items`: JSONata extracting the current page item array
- `search_text_combiner`: how multiple search terms are combined (for example `+` or whitespace)
- `delayInMs`, `parallelCalls`: request throttling/concurrency
- `exclusion_criteria`: JSONata boolean expression to skip imported records
- `only_import_if_authors_inst`: only keep records with affiliated authors

### B) Web-Abfrage per DOI (`URL_DOI`)

Use this when records are queried directly by DOI.

Important fields:

- `format`: `json` or `xml`
- `url_doi`: DOI lookup URL template
- `get_doi_item`: JSONata extracting the single source item from response
- `delayInMs`, `parallelCalls`
- `exclusion_criteria`
- `only_import_if_authors_inst`

### C) Datei-Upload (`FILE_UPLOAD`)

Use this for manual source files.

Important fields:

- `format`: `csv` or `xlsx`
- `exclusion_criteria`
- `only_import_if_authors_inst`

CSV-only fields (required when `format = csv`):

- `encoding`
- `delimiter`
- `quote_char`
- `skip_first_line`

---

## 4) JSONata mapping (core concept)

`mapping` is a JSONata expression that transforms **one source item** into the target publication structure used by Output.

### Which configurations are accessible in JSONata

Mappings are evaluated with an additional object `params.cfg`.

- Access syntax: `params.cfg.<key>` (usually assigned once: `$cfg := params.cfg;`)
- `params.cfg` contains the merged runtime configuration:
  - DB-backed configuration entries
  - environment configuration entries (including secret values)

Examples from shipped templates:

- `$cfg.affiliation_tags`
- `$cfg.openalex_id`

Typical target fields include for example:

- `title`
- `doi`
- `authors_inst : {last_name, first_name, orcid?, affiliation?}`
- `authors` 
- `publisher : {label}`
- `pub_type`
- `pub_date`
- `oa_category`
- `link`
- `abstract`
- `greater_entity : {label, identifiers? : {type, value}[] }`
- `funder : {label, doi }[]`
- `invoices?: {number?: string, date?: Date, booking_date?: Date, booking_amount?: number, cost_center?: string, cost_items: { euro_value?: number, vat?: number, orig_value?: number, orig_currency?: string, cost_type?: string }[] }[]`

### Minimal mapping example

```jsonata
{
  "title": $.title,
  "doi": $.doi,
  "publisher": { "label": $.publisher },
  "authors": $join($.authors.name, "; "),
  "status": 1
}
```

### Practical tips

- Start small (title + doi), then add fields incrementally.
- Reuse helper variables/functions in JSONata when date parsing or nested transformations are complex.
- Keep `exclusion_criteria` and `mapping` aligned (same source structure assumptions).
- Test with representative payloads before publishing the workflow.

---

## 5) End-to-end setup checklist for UI users

1. Create/edit workflow metadata.
2. Select a strategy.
3. Fill all required strategy fields.
4. Add `exclusion_criteria` JSONata (if needed).
5. Enter and save `mapping` JSONata.
6. Use the workflow test view to validate extraction + mapping against sample input.
7. Publish when test results are correct.

If validation fails, check missing required fields first (especially strategy-specific fields such as CSV settings, URL templates, and JSONata expressions).

---

## 6) Workflow lifecycle: draft, published, archived, and new versions

Workflows are versioned and grouped by `workflow_id`.

### States

- **Draft**: `published_at = null` and `deleted_at = null`
  - editable
  - can be deleted
- **Published (active)**: `published_at != null` and `deleted_at = null`
  - can be executed
  - no direct content updates allowed
- **Archived**: `deleted_at != null`
  - kept for history/export
  - not executable

### Publishing rule

Only one version per `workflow_id` may be published at a time.
To publish another version, archive the currently published one first.

### Forking / creating a new version

In the action tab, “duplicate” creates a **new draft version** by copying the current workflow:

- same `workflow_id`
- `version + 1`
- reset lifecycle timestamps (`published_at`, `deleted_at`)

This is the normal path to evolve a workflow after it has already been published.
