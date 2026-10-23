import { ParamMap } from '@angular/router';
import { INVOICE_CONTEXTS, INVOICE_INDEX_SORT_FIELDS, InvoiceContext, InvoiceIndexQuery, InvoiceIndexSortField, InvoiceKind } from '@output/interfaces';

export const INVOICE_INDEX_DEFAULTS = { page: 0, page_size: 50, sort: 'date', sort_dir: 'desc' } as const;
export const INVOICE_ID_FILTERS = ['cost_center_id', 'cost_type_id', 'contract_id', 'contract_component_id', 'publication_id'] as const;
export const INVOICE_YEAR_FILTERS = ['invoice_year', 'booking_year', 'publication_year'] as const;
export const INVOICE_DATE_FILTERS = ['date_from', 'date_to', 'booking_date_from', 'booking_date_to'] as const;

/** Parse only supported, valid values; old or malformed links must not break the page. */
export function parseInvoiceIndexQuery(params: ParamMap): InvoiceIndexQuery {
  const query: InvoiceIndexQuery = { ...INVOICE_INDEX_DEFAULTS };
  for (const key of [...INVOICE_ID_FILTERS, ...INVOICE_YEAR_FILTERS, 'page', 'page_size'] as const) {
    const raw = params.get(key);
    if (!raw || !/^\d+$/.test(raw)) continue;
    const value = Number(raw);
    const maximum = key === 'page' ? 1000000 : key === 'page_size' ? 200 : INVOICE_YEAR_FILTERS.some(year => year === key) ? 9999 : 2147483647;
    if (Number.isSafeInteger(value) && value >= (key === 'page' ? 0 : 1) && value <= maximum) query[key] = value;
  }
  for (const key of INVOICE_DATE_FILTERS) {
    const value = params.get(key);
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value) query[key] = value;
    }
  }
  const sort = params.get('sort');
  if (INVOICE_INDEX_SORT_FIELDS.some(field => field === sort)) query.sort = sort as InvoiceIndexSortField;
  const direction = params.get('sort_dir');
  if (direction === 'asc' || direction === 'desc') query.sort_dir = direction;
  const kind = params.get('invoice_kind');
  if (kind === InvoiceKind.INVOICE || kind === InvoiceKind.PRE_INVOICE) query.invoice_kind = kind;
  const context = params.get('context');
  if (INVOICE_CONTEXTS.some(value => value === context)) query.context = context as InvoiceContext;
  const missingDate = params.get('invoice_date_missing');
  if (missingDate === 'true' || missingDate === 'false') query.invoice_date_missing = missingDate === 'true';
  const search = params.get('q')?.trim().slice(0, 200);
  if (search) query.q = search;
  return query;
}

export function invoiceIndexQueryParams(query: InvoiceIndexQuery): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(query).filter(([key, value]) =>
    value !== undefined && value !== null && value !== '' && value !== INVOICE_INDEX_DEFAULTS[key]
  ));
}
