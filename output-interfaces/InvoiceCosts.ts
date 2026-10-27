import { Invoice } from './Publication';

/** Booking amount takes precedence, including zero; VAT is an amount in EUR. */
export function getInvoiceGrossAmount(invoice?: Invoice | null): number | null {
    if (!invoice) return null;
    if (invoice.booking_amount != null) return invoice.booking_amount;
    if (!invoice.cost_items) return null;
    return invoice.cost_items.reduce((sum, item) => sum + (item.euro_value ?? 0) + (item.vat ?? 0), 0);
}
