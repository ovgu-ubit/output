import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicationIndex, PublicationIndexColumn, PublicationIndexPage, PublicationIndexPageRequest, SearchFilter } from '@output/interfaces';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { ReportingYearIndexPageRequestDto } from '../../../common/dto/index-page.dto';

export class PublicationIndexPageRequestDto extends ReportingYearIndexPageRequestDto<PublicationIndexColumn> implements PublicationIndexPageRequest {
    @ApiPropertyOptional({ default: false })
    @IsOptional() @IsBoolean()
    all_reporting_years = false;

    @ApiPropertyOptional({ default: false, description: 'Include internal publication tags.' })
    @IsOptional() @IsBoolean()
    include_tags?: boolean;

    @ApiPropertyOptional({ default: false, description: 'Return soft-deleted publications; reporting-year scope is ignored.' })
    @IsOptional() @IsBoolean()
    soft = false;

    @ApiPropertyOptional({ type: Object, description: 'Extended filters ignore reporting_year. Explicit date expressions still apply.' })
    @IsOptional() @IsObject()
    filter?: SearchFilter;

    @ApiPropertyOptional({ type: [String], default: [], description: 'Active saved filter paths ignore reporting_year.' })
    @IsOptional() @IsArray() @IsString({ each: true })
    paths: string[] = [];
}

export class PublicationIndexPageDto implements PublicationIndexPage {
    @ApiProperty({ type: [Object] }) items: PublicationIndex[];
    @ApiProperty() total: number;
    @ApiProperty() page: number;
    @ApiProperty() page_size: number;
}
