import { ApiPropertyOptional } from '@nestjs/swagger';
import { PublicationDuplicate, PublicationDuplicateIndexPageRequest } from '@output/interfaces';
import { IsBoolean, IsOptional } from 'class-validator';
import { IndexPageRequestDto } from '../../../common/dto/index-page.dto';

export class DuplicateIndexPageRequestDto extends IndexPageRequestDto<Extract<keyof PublicationDuplicate, string>> implements PublicationDuplicateIndexPageRequest {
    @ApiPropertyOptional({ default: false })
    @IsOptional() @IsBoolean()
    soft = false;
}
