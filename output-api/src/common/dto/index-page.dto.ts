import { ApiPropertyOptional } from '@nestjs/swagger';
import { IndexPageRequest, IndexSortCriterion, IndexSortDirection } from '@output/interfaces';
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

/** Reusable transport DTO for zero-based index pagination. */
export class IndexPageRequestDto<TColumn extends string = string> implements IndexPageRequest<TColumn> {
    @ApiPropertyOptional({ default: 0, minimum: 0 })
    @Type(() => Number) @IsInt() @Min(0) @Max(1000000)
    page = 0;

    @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 200 })
    @Type(() => Number) @IsInt() @Min(1) @Max(200)
    page_size = 10;

    @ApiPropertyOptional({ type: [IndexSortCriterionDto], default: [] })
    @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => IndexSortCriterionDto)
    sort: IndexSortCriterionDto<TColumn>[] = [];

    @ApiPropertyOptional({ maxLength: 500, description: 'Case-insensitive search over the projected index columns.' })
    @IsOptional() @IsString() @MaxLength(500)
    q?: string;

    @ApiPropertyOptional({ type: Object, description: 'Case-insensitive filters keyed by projected index column.' })
    @IsOptional() @IsObject()
    column_filters?: Partial<Record<TColumn, string>>;
}
