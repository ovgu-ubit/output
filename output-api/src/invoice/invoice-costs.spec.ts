import { DatabaseSync } from 'node:sqlite';
import { getInvoiceGrossAmount, Invoice } from '@output/interfaces';
import { allocatedCostItemGrossAmountSql, invoiceAmountsSql, publicationGrossAmountSql } from './invoice-costs';

// Execute the shared aggregate arithmetic with real rows, without an external DB.
// PostgreSQL query generation is covered by the index service tests.
describe('Gross invoice costs', () => {
    let db: DatabaseSync;

    beforeEach(() => {
        db = new DatabaseSync(':memory:');
        db.exec(`CREATE TABLE publication (id INTEGER PRIMARY KEY);
            CREATE TABLE invoice (id INTEGER PRIMARY KEY, "publicationId" INTEGER, booking_amount REAL);
            CREATE TABLE cost_item (id INTEGER PRIMARY KEY, "invoiceId" INTEGER, "costTypeId" INTEGER, euro_value REAL, vat REAL);`);
    });
    afterEach(() => db.close());

    function insertInvoice(id: number, invoice: Invoice, publicationId = 1) {
        db.prepare('INSERT INTO invoice VALUES (?, ?, ?)').run(id, publicationId, invoice.booking_amount ?? null);
        const insertItem = db.prepare('INSERT INTO cost_item ("invoiceId", "costTypeId", euro_value, vat) VALUES (?, ?, ?, ?)');
        for (const item of invoice.cost_items ?? []) {
            insertItem.run(id, item.cost_type?.id ?? null, item.euro_value ?? null, item.vat ?? null);
        }
    }

    const cases: { label: string; invoice: Invoice; expected: number }[] = [
        { label: 'booking takes priority over multiple items', invoice: { booking_amount: 250, cost_items: [{ euro_value: 100, vat: 19 }, { euro_value: 50, vat: 3.5 }] }, expected: 250 },
        { label: 'zero booking takes priority', invoice: { booking_amount: 0, cost_items: [{ euro_value: 100, vat: 19 }] }, expected: 0 },
        { label: 'booking without items', invoice: { booking_amount: 75 }, expected: 75 },
        { label: 'net plus VAT with different tax rates', invoice: { cost_items: [{ euro_value: 100, vat: 19 }, { euro_value: 50, vat: 3.5 }] }, expected: 172.5 },
        { label: 'missing amounts count as zero', invoice: { cost_items: [{ euro_value: 100 }, { vat: 7 }, {}] }, expected: 107 },
        { label: 'zero VAT', invoice: { cost_items: [{ euro_value: 100, vat: 0 }] }, expected: 100 },
        { label: 'credit booking', invoice: { booking_amount: -50, cost_items: [{ euro_value: 100, vat: 19 }] }, expected: -50 },
        { label: 'credit items', invoice: { cost_items: [{ euro_value: -100, vat: -19 }] }, expected: -119 },
        { label: 'empty items', invoice: { cost_items: [] }, expected: 0 },
        { label: 'no booking or items', invoice: {}, expected: 0 },
    ];

    it.each(cases)('$label agrees between SQL aggregates and invoice overviews', ({ invoice, expected }) => {
        insertInvoice(1, invoice);
        const row = db.prepare(`SELECT gross_amount FROM (${invoiceAmountsSql()}) amounts WHERE invoice_id = 1`).get();
        expect(row?.gross_amount).toBe(expected);
        expect(getInvoiceGrossAmount(invoice) ?? 0).toBe(expected);
    });

    it('sums invoices once each and keeps publications separate', () => {
        db.exec('INSERT INTO publication VALUES (1), (2), (3)');
        insertInvoice(1, { booking_amount: 250, cost_items: [{ euro_value: 100, vat: 19 }, { euro_value: 100, vat: 19 }] });
        insertInvoice(2, { cost_items: [{ euro_value: 100, vat: 19 }] });
        insertInvoice(3, { booking_amount: 0, cost_items: [{ euro_value: 100, vat: 19 }] });
        insertInvoice(4, { booking_amount: 999 }, 2);

        const rows = db.prepare(`SELECT ${publicationGrossAmountSql()} AS costs FROM publication ORDER BY id`).all();
        expect(rows.map(row => row.costs)).toEqual([369, 999, 0]);
    });

    it.each([300, 0, -300, null])('allocates booking %s proportionally across cost types without duplication', bookingAmount => {
        insertInvoice(1, {
            booking_amount: bookingAmount,
            cost_items: [
                { euro_value: 100, vat: 20, cost_type: { id: 1, label: 'APC' } },
                { euro_value: 50, vat: 10, cost_type: { id: 1, label: 'APC' } },
                { euro_value: 50, vat: 10, cost_type: { id: 2, label: 'Other' } },
            ],
        });
        const rows = db.prepare(`SELECT cost_item."costTypeId" AS type_id, SUM(${allocatedCostItemGrossAmountSql()}) AS costs
            FROM cost_item cost_item JOIN invoice invoice ON cost_item."invoiceId" = invoice.id
            JOIN (${invoiceAmountsSql()}) invoice_amounts ON invoice_amounts.invoice_id = invoice.id
            GROUP BY cost_item."costTypeId" ORDER BY type_id`).all();

        const total = bookingAmount ?? 240;
        expect(rows.map(row => row.costs)).toEqual([total * 0.75, total * 0.25]);
        expect(rows.reduce((sum, row) => sum + Number(row.costs), 0)).toBe(total);
    });

    it('splits a booking equally when the item gross total is zero', () => {
        insertInvoice(1, { booking_amount: 90, cost_items: [{ euro_value: 50 }, { euro_value: -50 }, {}] });
        const rows = db.prepare(`SELECT ${allocatedCostItemGrossAmountSql()} AS costs
            FROM cost_item cost_item JOIN invoice invoice ON cost_item."invoiceId" = invoice.id
            JOIN (${invoiceAmountsSql()}) invoice_amounts ON invoice_amounts.invoice_id = invoice.id`).all();
        expect(rows.map(row => row.costs)).toEqual([30, 30, 30]);
    });
});
