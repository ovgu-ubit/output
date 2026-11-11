import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IndexPage, IndexPageRequest, IndexPagingRequest, IndexSortCriterion, IndexSortDirection, ReportingYearIndexPageRequest } from '@output/interfaces';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class IndexSortCriterionDto<TColumn extends string = string> implements IndexSortCriterion<TColumn> {
    @ApiPropertyOptional({ description: 'Index projection column.' })
    @IsString() @MaxLength(100)
    key: TColumn;

    @ApiPropertyOptional({ enum: ['asc', 'desc'] })
    @IsIn(['asc', 'desc'])
    direction: IndexSortDirection;
}

export class IndexPagingRequestDto implements IndexPagingRequest {
    @ApiPropertyOptional({ default: 0, minimum: 0 })
    @Type(() => Number) @IsInt() @Min(0) @Max(1000000)
    page = 0;

    @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 200 })
    @Type(() => Number) @IsInt() @Min(1) @Max(200)
    page_size = 10;

    @ApiPropertyOptional({ maxLength: 500, description: 'Case-insensitive search over the projected index columns.' })
    @IsOptional() @IsString() @MaxLength(500)
    q?: string;
}

/** Reusable transport DTO for zero-based index pagination. */
export class IndexPageRequestDto<TColumn extends string = string> extends IndexPagingRequestDto implements IndexPageRequest<TColumn> {
    @ApiPropertyOptional({ type: [String], description: 'Columns searched by q. An empty array matches no rows; omitted uses all projected columns.' })
    @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(100, { each: true })
    search_columns?: TColumn[];

    @ApiPropertyOptional({ type: [IndexSortCriterionDto], default: [] })
    @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => IndexSortCriterionDto)
    sort: IndexSortCriterionDto<TColumn>[] = [];

    @ApiPropertyOptional({ type: Object, description: 'Case-insensitive filters keyed by projected index column.' })
    @IsOptional() @IsObject()
    column_filters?: Partial<Record<TColumn, string>>;
}

export class ReportingYearIndexPageRequestDto<TColumn extends string = string> extends IndexPageRequestDto<TColumn> implements ReportingYearIndexPageRequest<TColumn> {
    @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, maximum: 9999 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999)
    reporting_year?: number | null;
}

export class IndexPageDto<T = object> implements IndexPage<T> {
    @ApiProperty({ type: [Object] }) items: T[];
    @ApiProperty() total: number;
    @ApiProperty() page: number;
    @ApiProperty() page_size: number;
}
