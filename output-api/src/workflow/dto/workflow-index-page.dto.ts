import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowIndexColumn, WorkflowIndexPageRequest, WorkflowIndexState } from '@output/interfaces';
import { IsIn, IsOptional } from 'class-validator';
import { IndexPageRequestDto } from '../../common/dto/index-page.dto';

export class WorkflowIndexPageRequestDto extends IndexPageRequestDto<WorkflowIndexColumn> implements WorkflowIndexPageRequest {
    @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
    @IsOptional() @IsIn(['draft', 'published', 'archived'])
    type?: WorkflowIndexState;
}
