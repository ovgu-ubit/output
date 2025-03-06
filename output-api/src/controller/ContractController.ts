import { Body, Controller, Delete, Get, InternalServerErrorException, Post, Put, Query, UseGuards, Req } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ContractService } from "../services/entities/contract.service";
import { Contract } from "../entity/Contract";
import { ContractIndex } from "../../../output-interfaces/PublicationIndex";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("contract")
@ApiTags("contract")
export class ContractController {

    constructor(private contractService:ContractService) { }

    @Get()
    @ApiResponse({
        type: Contract,
        isArray: true
    })
    async all() : Promise<Contract[]> {
        return await this.contractService.get();
    }
    
    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<ContractIndex[]> {
        return await this.contractService.index(reporting_year);
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Contract
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<Contract> {
        return await this.contractService.one(id, request['user']? request['user']['write'] : false);
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                label: 'Label'
            }
        }
    })
    async save(@Body() body: Contract) {
        if (!body.id) body.id = undefined;
        return this.contractService.save([body])
    }
    
    @Put()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                label: 'Label'
            }
        }
    })
    async update(@Body() body: Contract) {
        return this.contractService.update(body)
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Contract[]) {
        return this.contractService.delete(body);
    }

    @Post('combine')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiBody({
        schema: {
            example: {
                id1: 4,
                id2: 6
            }
        }
    })
    async combine(@Body('id1') id1: number, @Body('ids') ids: number[]) {
        let res = await this.contractService.combine(id1,ids);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first contract') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second contract') 
        else return res;
    }

}
