import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function costItemGrossAmountSql(alias = 'cost_item'): string {
    return `(COALESCE(${alias}.euro_value, 0) + COALESCE(${alias}.vat, 0))`;
}

/** One row per invoice prevents counting booking amounts once per cost item. */
export function invoiceAmountsSql(): string {
    return `SELECT cost_invoice.id AS invoice_id,
        cost_invoice."publicationId" AS publication_id,
        COALESCE(cost_invoice.booking_amount, SUM(${costItemGrossAmountSql()}), 0) AS gross_amount,
        COALESCE(SUM(${costItemGrossAmountSql()}), 0) AS item_gross_amount,
        COUNT(cost_item.id) AS item_count
        FROM invoice cost_invoice
        LEFT JOIN cost_item cost_item ON cost_item."invoiceId" = cost_invoice.id
        GROUP BY cost_invoice.id`;
}

export function addInvoiceAmounts<T extends ObjectLiteral>(query: SelectQueryBuilder<T>): SelectQueryBuilder<T> {
    return query.leftJoin(`(${invoiceAmountsSql()})`, 'invoice_amounts', 'invoice_amounts.invoice_id = invoice.id');
}

export function publicationGrossAmountSql(publicationAlias = 'publication'): string {
    return `COALESCE((SELECT SUM(invoice_amounts.gross_amount) FROM (${invoiceAmountsSql()}) invoice_amounts WHERE invoice_amounts.publication_id = ${publicationAlias}.id), 0)`;
}

/** Allocate bookings by gross item value; zero-sum invoices use equal item shares. */
export function allocatedCostItemGrossAmountSql(): string {
    return `CASE WHEN invoice.booking_amount IS NULL THEN ${costItemGrossAmountSql()}
        WHEN invoice_amounts.item_gross_amount <> 0
            THEN invoice.booking_amount * ${costItemGrossAmountSql()} / invoice_amounts.item_gross_amount
        ELSE invoice.booking_amount / NULLIF(invoice_amounts.item_count, 0) END`;
}
