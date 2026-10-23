import { InvoiceCounts, InvoiceIndexEntityFilter } from '@output/interfaces';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Invoice } from './Invoice.entity';

/** Independent scalar subqueries keep existing publication counts and cost sums unchanged. */
export function addInvoiceCounts<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>, filter: InvoiceIndexEntityFilter, reportingYear: number | null | undefined,
): void {
    const invoices = query.subQuery().select('COUNT(*)').from(Invoice, 'counted_invoice')
        // Match InvoiceIndex: a deleted publication must not hide its invoices.
        .withDeleted();
    const entityId = `${query.alias}.id`;
    switch (filter) {
        case 'contract_id':
            invoices.leftJoin('counted_invoice.publication', 'counted_publication')
                .leftJoin('counted_invoice.contract_component', 'counted_component')
                .where(`(counted_publication."contractId" = ${entityId} OR counted_component."contractId" = ${entityId})`);
            break;
        case 'cost_center_id':
            invoices.where(`counted_invoice."costCenterId" = ${entityId}`);
            break;
        case 'cost_type_id':
            invoices.where(`EXISTS (SELECT 1 FROM cost_item counted_item WHERE counted_item."invoiceId" = counted_invoice.id AND counted_item."costTypeId" = ${entityId})`);
            break;
    }
    query.addSelect(invoices.getQuery(), 'invoice_count_total');

    const yearlyInvoices = invoices.clone();
    if (typeof reportingYear === 'number' && Number.isInteger(reportingYear) && reportingYear > 0 && reportingYear <= 9999) {
        const start = new Date(0);
        start.setUTCFullYear(reportingYear, 0, 1);
        const end = new Date(start);
        end.setUTCFullYear(reportingYear + 1);
        yearlyInvoices.andWhere('counted_invoice.date >= :invoice_count_start AND counted_invoice.date < :invoice_count_end', {
            invoice_count_start: start.toISOString(), invoice_count_end: end.toISOString(),
        });
    } else {
        yearlyInvoices.andWhere('counted_invoice.date IS NULL');
    }
    query.addSelect(yearlyInvoices.getQuery(), 'invoice_count').setParameters(yearlyInvoices.getParameters());
}

export function normalizeInvoiceCounts<T extends Partial<InvoiceCounts>>(rows: T[]): T[] {
    return rows.map(row => ({
        ...row,
        invoice_count: Number(row.invoice_count),
        invoice_count_total: Number(row.invoice_count_total),
    }));
}
