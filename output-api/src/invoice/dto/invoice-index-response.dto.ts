import { ApiProperty } from '@nestjs/swagger';
import { INVOICE_CONTEXTS, InvoiceContext, InvoiceIndex, InvoiceIndexPage, InvoiceKind } from '@output/interfaces';

export class InvoiceIndexDto implements InvoiceIndex {
    @ApiProperty() id: number;
    @ApiProperty({ enum: InvoiceKind }) invoice_kind: InvoiceKind;
    @ApiProperty({ type: String, nullable: true }) number: string | null;
    @ApiProperty({ type: String, format: 'date-time', nullable: true }) date: string | null;
    @ApiProperty({ type: String, format: 'date-time', nullable: true }) booking_date: string | null;
    @ApiProperty({ type: Number, nullable: true }) booking_amount: number | null;
    @ApiProperty({ description: 'Gross costs: booking amount, otherwise sum of positions including VAT; missing values count as zero.' }) costs_eur: number;

    @ApiProperty() item_count: number;
    @ApiProperty({ type: [Number] }) cost_type_ids: number[];
    @ApiProperty({ type: [String] }) cost_type_labels: string[];
    @ApiProperty({ type: Number, nullable: true, description: 'Null for no positions or incomplete net amounts.' }) net_amount_eur: number | null;
    @ApiProperty({ type: Number, nullable: true, description: 'Null for no positions or incomplete VAT amounts.' }) vat_amount_eur: number | null;
    @ApiProperty({ type: Number, nullable: true, description: 'Net plus VAT; null if either is incomplete.' }) gross_amount_eur: number | null;
    @ApiProperty() missing_amount_item_count: number;

    @ApiProperty({ type: Number, nullable: true }) cost_center_id: number | null;
    @ApiProperty({ type: String, nullable: true }) cost_center_number: string | null;
    @ApiProperty({ type: String, nullable: true }) cost_center_label: string | null;
    @ApiProperty({ type: Number, nullable: true }) publication_id: number | null;
    @ApiProperty({ type: String, nullable: true }) publication_title: string | null;
    @ApiProperty({ type: String, nullable: true }) publication_doi: string | null;
    @ApiProperty() publication_deleted: boolean;
    @ApiProperty({ type: Number, nullable: true }) contract_component_id: number | null;
    @ApiProperty({ type: String, nullable: true }) contract_component_label: string | null;
    @ApiProperty({ type: Number, nullable: true }) publication_contract_id: number | null;
    @ApiProperty({ type: String, nullable: true }) publication_contract_label: string | null;
    @ApiProperty({ type: Number, nullable: true }) component_contract_id: number | null;
    @ApiProperty({ type: String, nullable: true }) component_contract_label: string | null;
    @ApiProperty() contract_conflict: boolean;
    @ApiProperty({ enum: INVOICE_CONTEXTS }) context: InvoiceContext;
}

export class InvoiceIndexPageDto implements InvoiceIndexPage {
    @ApiProperty({ type: [InvoiceIndexDto] }) items: InvoiceIndexDto[];
    @ApiProperty() total: number;
    @ApiProperty() page: number;
    @ApiProperty() page_size: number;
}
