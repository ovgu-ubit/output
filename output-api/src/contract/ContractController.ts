import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { Contract } from './Contract.entity';
import { ContractIndex } from '../../../output-interfaces/PublicationIndex';
import { Permissions } from '../authorization/permission.decorator';
import { AccessGuard } from '../authorization/access.guard';
import { AbstractCrudController } from '../common/abstract-crud.controller';
import { ContractComponent } from './ContractComponent.entity';

@Controller('contract')
@ApiTags('contract')
export class ContractController extends AbstractCrudController<Contract, ContractService> {

    constructor(contractService: ContractService) {
        super(contractService);
    }

    @Get('index')
    @ApiOperation({ summary: 'List contract index entries' })
    @ApiQuery({ name: 'reporting_year', required: false, type: Number, description: 'Reporting year used to aggregate publication counts.' })
    @ApiResponse({ status: 200, description: 'Contract index entries for the requested reporting year.' })
    async index(@Query('reporting_year') reporting_year: number): Promise<ContractIndex[]> {
        return await this.service.index(reporting_year);
    }

    @Get('component')
    @UseGuards(AccessGuard)
    @ApiOperation({ summary: 'List contract components' })
    @ApiQuery({ name: 'contract_id', required: false, type: Number, description: 'Optional contract id to restrict the result to a single contract.' })
    @ApiResponse({ status: 200, description: 'Contract components including related filters and linked invoices.' })
    async components(@Query('contract_id') contractId?: number): Promise<ContractComponent[]> {
        return this.service.getComponents(contractId);
    }

    @Get('component/one')
    @UseGuards(AccessGuard)
    @ApiOperation({ summary: 'Get a single contract component' })
    @ApiQuery({ name: 'id', required: true, type: Number, description: 'Contract component id.' })
    @ApiResponse({ status: 200, description: 'The requested contract component.' })
    @ApiResponse({ status: 404, description: 'Contract component was not found.' })
    async oneComponent(@Query('id') id: number): Promise<ContractComponent|null> {
        return this.service.oneComponent(id);
    }

    @Post('component')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiOperation({ summary: 'Create a contract component' })
    @ApiBody({
        description: 'Create a contract component. contract_model_params must match the selected contract_model.',
        schema: {
            example: {
                contract: { id: 1 },
                label: 'Main component',
                contract_model: 0,
                contract_model_version: 1,
                contract_model_params: {
                    percentage: 10,
                    service_fee: 100,
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'The contract component was created.' })
    @ApiResponse({ status: 400, description: 'Validation failed for the contract component or its model parameters.' })
    async saveComponent(@Body() body: ContractComponent) {
        return this.service.saveComponent(body);
    }

    @Put('component')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiOperation({ summary: 'Update a contract component' })
    @ApiBody({
        description: 'Update a contract component. contract_model_params must match the selected contract_model.',
        schema: {
            example: {
                id: 5,
                label: 'Updated component',
                contract_model: 2,
                contract_model_version: 1,
                contract_model_params: {
                    limit_type: 'budget',
                    distribution_formula: 'average',
                    service_fee: 250,
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'The contract component was updated.' })
    @ApiResponse({ status: 400, description: 'Validation failed for the contract component or its model parameters.' })
    async updateComponent(@Body() body: ContractComponent) {
        return this.service.updateComponent(body);
    }

    @Delete('component')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiOperation({ summary: 'Delete contract components' })
    @ApiBody({
        description: 'Delete one or more contract components by id.',
        schema: {
            example: [{ id: 7 }, { id: 8 }],
        },
    })
    @ApiResponse({ status: 200, description: 'The selected contract components were deleted.' })
    async removeComponent(@Body() body: ContractComponent[]) {
        return this.service.deleteComponents(body);
    }

    @Post('combine')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiOperation({ summary: 'Combine duplicate contracts' })
    @ApiBody({
        schema: {
            example: {
                id1: 4,
                id2: 6,
            },
        },
    })
    @ApiResponse({ status: 200, description: 'The contracts were combined successfully.' })
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[]) {
        return this.service.combine(id1,ids);
    }
}
