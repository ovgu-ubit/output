import { Body, Delete, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AccessGuard } from '../authorization/access.guard';
import { Permissions } from '../authorization/permission.decorator';
import { AbstractEntityService, LockableEntity } from './abstract-entity.service';

export abstract class AbstractCrudController<TEntity extends LockableEntity, TService extends AbstractEntityService<TEntity>> {
    protected constructor(protected readonly service: TService) { }

    @Get()
    @ApiResponse({ type: Object, isArray: true })
    async all(): Promise<TEntity[]> {
        return this.getAllEntities();
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({ type: Object })
    async one(@Query('id') id: number, @Req() request: Request): Promise<TEntity> {
        return this.getSingleEntity(id, this.isWriter(request));
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                label: 'Label',
            },
        },
    })
    async save(@Body() body: TEntity) {
        return this.createEntity(this.normalizeBodyForCreate(body));
    }

    @Put()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                label: 'Label',
            },
        },
    })
    async update(@Body() body: TEntity) {
        return this.updateEntity(body);
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: TEntity[]) {
        return this.deleteEntities(body);
    }

    protected normalizeBodyForCreate(body: TEntity): TEntity {
        return this.service.normalizeForCreate(body);
    }

    protected createEntity(body: TEntity) {
        return this.service.save([body]);
    }

    protected updateEntity(body: TEntity) {
        return this.service.save([body]);
    }

    protected deleteEntities(body: TEntity[]) {
        return this.service.delete(body);
    }

    protected getAllEntities() {
        return this.service.get();
    }

    protected getSingleEntity(id: number, writer: boolean) {
        return this.service.one(id, writer);
    }

    protected isWriter(request: Request): boolean {
        return request?.['user']?.['write'] ?? false;
    }
}
