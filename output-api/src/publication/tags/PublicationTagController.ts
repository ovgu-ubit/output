import { Body, Controller, Delete, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AccessGuard } from '../../authorization/access.guard';
import { Permissions } from '../../authorization/permission.decorator';
import { IndexPageRequestDto } from '../../common/dto/index-page.dto';
import { PublicationTagService } from './publication-tag.service';
import { PublicationTag } from './PublicationTag.entity';

@Controller('publication-tags')
@ApiTags('publication-tags')
@UseGuards(AccessGuard)
export class PublicationTagController {
    constructor(private readonly service: PublicationTagService) { }

    @Get()
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    all() { return this.service.all(); }

    @Get('one')
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    one(@Query('id') id: string) { return this.service.one(Number(id)); }

    @Post('index-page')
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiResponse({ status: 201, description: 'Paged tag catalogue including usage_count.' })
    indexPage(@Body() body: IndexPageRequestDto) { return this.service.indexPage(body); }

    @Post()
    @Permissions([{ role: 'admin', app: 'output' }])
    @ApiBody({ type: PublicationTag })
    save(@Body() body: PublicationTag) { return this.service.save(body); }

    @Put()
    @Permissions([{ role: 'admin', app: 'output' }])
    @ApiBody({ type: PublicationTag })
    update(@Body() body: PublicationTag) { return this.service.save(body, true); }

    @Delete()
    @Permissions([{ role: 'admin', app: 'output' }])
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'integer' } } }, required: ['ids'] } })
    delete(@Body('ids') ids: unknown, @Req() request: Request) { return this.service.delete(ids, request['user']?.username); }
}
