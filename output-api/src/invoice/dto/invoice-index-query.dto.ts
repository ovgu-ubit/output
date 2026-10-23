import { ApiPropertyOptional } from '@nestjs/swagger';
import { INVOICE_CONTEXTS, INVOICE_INDEX_SORT_FIELDS, InvoiceContext, InvoiceIndexQuery, InvoiceIndexSortField, InvoiceKind } from '@output/interfaces';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class InvoiceIndexQueryDto implements InvoiceIndexQuery {
    @ApiPropertyOptional({ default: 0, minimum: 0 })
    @Type(() => Number) @IsInt() @Min(0) @Max(1000000)
    page = 0;

    @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
    @Type(() => Number) @IsInt() @Min(1) @Max(200)
    page_size = 50;

    @ApiPropertyOptional({ enum: INVOICE_INDEX_SORT_FIELDS, default: 'date' })
    @IsIn(INVOICE_INDEX_SORT_FIELDS)
    sort: InvoiceIndexSortField = 'date';

    @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
    @IsIn(['asc', 'desc'])
    sort_dir: 'asc' | 'desc' = 'desc';

    @ApiPropertyOptional({ maxLength: 200, description: 'Search invoice number, publication, cost center and contract labels.' })
    @IsOptional() @IsString() @MaxLength(200)
    q?: string;

    @ApiPropertyOptional({ enum: InvoiceKind })
    @IsOptional() @IsEnum(InvoiceKind)
    invoice_kind?: InvoiceKind;

    @ApiPropertyOptional({ minimum: 1, maximum: 9999 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999)
    invoice_year?: number;

    @ApiPropertyOptional({ minimum: 1, maximum: 9999 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999)
    booking_year?: number;

    @ApiPropertyOptional({ minimum: 1, maximum: 9999, description: 'Year of publication.pub_date.' })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999)
    publication_year?: number;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => value === 'true' ? true : value === 'false' ? false : value)
    @IsBoolean()
    invoice_date_missing?: boolean;

    @ApiPropertyOptional({ example: '2026-01-01', description: 'Inclusive date-only lower bound.' })
    @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
    date_from?: string;

    @ApiPropertyOptional({ example: '2026-12-31', description: 'Inclusive date-only upper bound.' })
    @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
    date_to?: string;

    @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
    booking_date_from?: string;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
    booking_date_to?: string;

    @ApiPropertyOptional({ minimum: 1 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2147483647)
    publication_id?: number;

    @ApiPropertyOptional({ minimum: 1 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2147483647)
    cost_center_id?: number;

    @ApiPropertyOptional({ minimum: 1 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2147483647)
    cost_type_id?: number;

    @ApiPropertyOptional({ minimum: 1, description: 'Matches either contract path; each invoice occurs once.' })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2147483647)
    contract_id?: number;

    @ApiPropertyOptional({ minimum: 1 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2147483647)
    contract_component_id?: number;

    @ApiPropertyOptional({ enum: INVOICE_CONTEXTS })
    @IsOptional() @IsIn(INVOICE_CONTEXTS)
    context?: InvoiceContext;
}
