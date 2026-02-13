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