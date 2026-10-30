import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicationIndex, PublicationIndexColumn, PublicationIndexPage, PublicationIndexPageRequest, SearchFilter } from '@output/interfaces';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { IndexPageRequestDto } from '../../../common/dto/index-page.dto';

export class PublicationIndexPageRequestDto extends IndexPageRequestDto<PublicationIndexColumn> implements PublicationIndexPageRequest {
    @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, maximum: 9999 })
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(9999)
    reporting_year?: number | null;

    @ApiPropertyOptional({ default: false })
    @IsOptional() @IsBoolean()
    all_reporting_years = false;

    @ApiPropertyOptional({ default: false, description: 'Return soft-deleted publications; reporting-year scope is ignored.' })
    @IsOptional() @IsBoolean()
    soft = false;

    @ApiPropertyOptional({ type: Object })
    @IsOptional() @IsObject()
    filter?: SearchFilter;

    @ApiPropertyOptional({ type: [String], default: [] })
    @IsOptional() @IsArray() @IsString({ each: true })
    paths: string[] = [];
}

export class PublicationIndexPageDto implements PublicationIndexPage {
    @ApiProperty({ type: [Object] }) items: PublicationIndex[];
    @ApiProperty() total: number;
    @ApiProperty() page: number;
    @ApiProperty() page_size: number;
}
