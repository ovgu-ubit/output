import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { INVOICE_INDEX_SORT_FIELDS, InvoiceIndex, InvoiceIndexPage, InvoiceIndexSortField } from '@output/interfaces';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { createInvalidRequestHttpException } from '../common/api-error';
import { CostItem } from './CostItem.entity';
import { Invoice } from './Invoice.entity';
import { InvoiceIndexQueryDto } from './dto/invoice-index-query.dto';

const SORT_COLUMNS: Record<InvoiceIndexSortField, string> = {
    id: 'invoice.id',
    number: 'invoice.number',
    date: 'invoice.date',
    booking_date: 'invoice.booking_date',
    invoice_kind: 'invoice.invoice_kind',
    cost_center: 'cost_center.label',
    booking_amount: 'invoice.booking_amount',
    net_amount_eur: 'amounts.net_amount_eur',
    vat_amount_eur: 'amounts.vat_amount_eur',
    gross_amount_eur: 'amounts.gross_amount_eur',
    item_count: 'COALESCE(amounts.item_count, 0)',
};

const CONTEXT_EXPRESSION = `CASE
    WHEN invoice."publicationId" IS NOT NULL AND invoice."contractComponentId" IS NOT NULL THEN 'both'
    WHEN invoice."publicationId" IS NOT NULL THEN 'publication'
    WHEN invoice."contractComponentId" IS NOT NULL THEN 'contract_component'
    ELSE 'unassigned' END`;

@Injectable()
export class InvoiceIndexService {
    constructor(@InjectRepository(Invoice) private readonly repository: Repository<Invoice>) { }

    async index(options: InvoiceIndexQueryDto): Promise<InvoiceIndexPage> {
        const query = this.buildQuery(options);
        if (!INVOICE_INDEX_SORT_FIELDS.includes(options.sort) || !['asc', 'desc'].includes(options.sort_dir)) {
            throw createInvalidRequestHttpException('Unsupported invoice sort order.');
        }
        const sortColumn = SORT_COLUMNS[options.sort];

        const countQuery = query.clone().select('COUNT(*)', 'total');
        query.orderBy(sortColumn, options.sort_dir === 'asc' ? 'ASC' : 'DESC', 'NULLS LAST');
        if (options.sort !== 'id') query.addOrderBy('invoice.id', 'DESC');
        // The joins below yield exactly one row per invoice, so LIMIT/OFFSET is safe.
        query.offset(options.page * options.page_size).limit(options.page_size);

        const [rows, count] = await Promise.all([
            query.getRawMany<RawInvoiceIndex>(),
            countQuery.getRawOne<{ total: string }>(),
        ]);
        return {
            items: rows.map(row => this.mapRow(row)),
            total: Number(count?.total ?? 0),
            page: options.page,
            page_size: options.page_size,
        };
    }

    private buildQuery(options: InvoiceIndexQueryDto): SelectQueryBuilder<Invoice> {
        const query = this.repository.createQueryBuilder('invoice')
            // Retain invoice context even when the associated publication was soft-deleted.
            .withDeleted()
            .leftJoin('invoice.cost_center', 'cost_center')
            .leftJoin('invoice.publication', 'publication')
            .leftJoin('publication.contract', 'publication_contract')
            .leftJoin('invoice.contract_component', 'component')
            .leftJoin('component.contract', 'component_contract')
            .leftJoin(subQuery => subQuery
                .select('cost_item."invoiceId"', 'invoice_id')
                .addSelect('COUNT(*)', 'item_count')
                .addSelect('COUNT(*) FILTER (WHERE cost_item.euro_value IS NULL OR cost_item.vat IS NULL)', 'missing_amount_item_count')
                .addSelect('CASE WHEN COUNT(cost_item.euro_value) = COUNT(*) THEN SUM(cost_item.euro_value) END', 'net_amount_eur')
                .addSelect('CASE WHEN COUNT(cost_item.vat) = COUNT(*) THEN SUM(cost_item.vat) END', 'vat_amount_eur')
                .addSelect('CASE WHEN COUNT(cost_item.euro_value) = COUNT(*) AND COUNT(cost_item.vat) = COUNT(*) THEN SUM(cost_item.euro_value + cost_item.vat) END', 'gross_amount_eur')
                .addSelect('ARRAY_AGG(DISTINCT cost_type.id ORDER BY cost_type.id) FILTER (WHERE cost_type.id IS NOT NULL)', 'cost_type_ids')
                .addSelect('ARRAY_AGG(DISTINCT cost_type.label ORDER BY cost_type.label) FILTER (WHERE cost_type.label IS NOT NULL)', 'cost_type_labels')
                .from(CostItem, 'cost_item')
                .leftJoin('cost_item.cost_type', 'cost_type')
                .groupBy('cost_item."invoiceId"'),
            'amounts', 'amounts.invoice_id = invoice.id')
            .select('invoice.id', 'id')
            .addSelect('invoice.invoice_kind', 'invoice_kind')
            .addSelect('invoice.number', 'number')
            // These two columns are timestamps without a zone. Preserve their calendar dates
            // regardless of the Node process timezone when pg converts the result to a Date.
            .addSelect("invoice.date AT TIME ZONE 'UTC'", 'date')
            .addSelect("invoice.booking_date AT TIME ZONE 'UTC'", 'booking_date')
            .addSelect('invoice.booking_amount', 'booking_amount')
            .addSelect('COALESCE(amounts.item_count, 0)', 'item_count')
            .addSelect('COALESCE(amounts.missing_amount_item_count, 0)', 'missing_amount_item_count')
            .addSelect('amounts.net_amount_eur', 'net_amount_eur')
            .addSelect('amounts.vat_amount_eur', 'vat_amount_eur')
            .addSelect('amounts.gross_amount_eur', 'gross_amount_eur')
            .addSelect('amounts.cost_type_ids', 'cost_type_ids')
            .addSelect('amounts.cost_type_labels', 'cost_type_labels')
            .addSelect('cost_center.id', 'cost_center_id')
            .addSelect('cost_center.number', 'cost_center_number')
            .addSelect('cost_center.label', 'cost_center_label')
            .addSelect('publication.id', 'publication_id')
            .addSelect('publication.title', 'publication_title')
            .addSelect('publication.doi', 'publication_doi')
            .addSelect('publication.delete_date IS NOT NULL', 'publication_deleted')
            .addSelect('component.id', 'contract_component_id')
            .addSelect('component.label', 'contract_component_label')
            .addSelect('publication_contract.id', 'publication_contract_id')
            .addSelect('publication_contract.label', 'publication_contract_label')
            .addSelect('component_contract.id', 'component_contract_id')
            .addSelect('component_contract.label', 'component_contract_label')
            .addSelect('COALESCE(publication_contract.id <> component_contract.id, FALSE)', 'contract_conflict')
            .addSelect(CONTEXT_EXPRESSION, 'context');

        const idColumns = {
            publication_id: 'invoice."publicationId"',
            cost_center_id: 'invoice."costCenterId"',
            contract_component_id: 'invoice."contractComponentId"',
        } as const;
        for (const [key, column] of Object.entries(idColumns)) {
            if (options[key] !== undefined) query.andWhere(`${column} = :${key}`, { [key]: options[key] });
        }
        if (options.contract_id !== undefined) {
            query.andWhere(new Brackets(where => where
                .where('publication_contract.id = :contract_id')
                .orWhere('component_contract.id = :contract_id')), { contract_id: options.contract_id });
        }
        if (options.cost_type_id !== undefined) {
            query.andWhere('EXISTS (SELECT 1 FROM cost_item matching_item WHERE matching_item."invoiceId" = invoice.id AND matching_item."costTypeId" = :cost_type_id)', { cost_type_id: options.cost_type_id });
        }
        if (options.invoice_kind !== undefined) query.andWhere('invoice.invoice_kind = :kind', { kind: options.invoice_kind });
        if (options.context !== undefined) query.andWhere(`(${CONTEXT_EXPRESSION}) = :context`, { context: options.context });
        if (options.invoice_date_missing !== undefined) query.andWhere(`invoice.date IS ${options.invoice_date_missing ? '' : 'NOT '}NULL`);

        this.addYearFilter(query, 'invoice.date', 'invoice_year', options.invoice_year);
        this.addYearFilter(query, 'invoice.booking_date', 'booking_year', options.booking_year);
        this.addYearFilter(query, 'publication.pub_date', 'publication_year', options.publication_year);
        this.addDateRange(query, 'invoice.date', 'date', options.date_from, options.date_to);
        this.addDateRange(query, 'invoice.booking_date', 'booking_date', options.booking_date_from, options.booking_date_to);

        if (options.q?.trim()) {
            const search = `%${options.q.trim().replace(/[\\%_]/g, '\\$&')}%`;
            query.andWhere(new Brackets(where => {
                for (const column of ['invoice.number', 'publication.title', 'publication.doi', 'cost_center.label', 'cost_center.number', 'publication_contract.label', 'component_contract.label', 'component.label']) {
                    where.orWhere(`${column} ILIKE :search`);
                }
            }), { search });
        }
        return query;
    }

    private addYearFilter(query: SelectQueryBuilder<Invoice>, column: string, key: string, year?: number): void {
        if (year === undefined) return;
        // setUTCFullYear also handles years 1–99 without Date.UTC's 1900 offset.
        const start = new Date(0);
        start.setUTCFullYear(year, 0, 1);
        const end = new Date(start);
        end.setUTCFullYear(year + 1);
        query.andWhere(`${column} >= :${key}_start AND ${column} < :${key}_end`, {
            [`${key}_start`]: start.toISOString(), [`${key}_end`]: end.toISOString(),
        });
    }

    private addDateRange(query: SelectQueryBuilder<Invoice>, column: string, key: string, from?: string, to?: string): void {
        if (from && to && from > to) throw createInvalidRequestHttpException(`${key}_from must be before or equal to ${key}_to.`);
        if (from) query.andWhere(`${column} >= :${key}_from`, { [`${key}_from`]: `${from}T00:00:00.000Z` });
        if (to) {
            const end = new Date(`${to}T00:00:00.000Z`);
            end.setUTCDate(end.getUTCDate() + 1);
            query.andWhere(`${column} < :${key}_until`, { [`${key}_until`]: end.toISOString() });
        }
    }

    private mapRow(row: RawInvoiceIndex): InvoiceIndex {
        return {
            ...row,
            id: Number(row.id),
            date: row.date ? new Date(row.date).toISOString() : null,
            booking_date: row.booking_date ? new Date(row.booking_date).toISOString() : null,
            booking_amount: this.numberOrNull(row.booking_amount),
            net_amount_eur: this.numberOrNull(row.net_amount_eur),
            vat_amount_eur: this.numberOrNull(row.vat_amount_eur),
            gross_amount_eur: this.numberOrNull(row.gross_amount_eur),
            item_count: Number(row.item_count),
            missing_amount_item_count: Number(row.missing_amount_item_count),
            cost_type_ids: (row.cost_type_ids ?? []).map(Number),
            cost_type_labels: row.cost_type_labels ?? [],
        };
    }

    private numberOrNull(value: number | string | null): number | null {
        return value === null || value === undefined ? null : Number(value);
    }
}

type RawInvoiceIndex = Omit<InvoiceIndex, 'date' | 'booking_date' | 'booking_amount' | 'net_amount_eur' | 'vat_amount_eur' | 'gross_amount_eur' | 'item_count' | 'missing_amount_item_count'> & {
    date: string | Date | null;
    booking_date: string | Date | null;
    booking_amount: number | string | null;
    net_amount_eur: number | string | null;
    vat_amount_eur: number | string | null;
    gross_amount_eur: number | string | null;
    item_count: string | number;
    missing_amount_item_count: string | number;
};
