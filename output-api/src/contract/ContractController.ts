import { Body, Controller, Get, InternalServerErrorException, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { ContractService } from "./contract.service";
import { Contract } from "./Contract.entity";
import { ContractIndex } from "../../../output-interfaces/PublicationIndex";
import { Permissions } from "../authorization/permission.decorator";
import { AccessGuard } from "../authorization/access.guard";
import { AbstractCrudController } from "../common/abstract-crud.controller";

@Controller("contract")
@ApiTags("contract")
export class ContractController extends AbstractCrudController<Contract, ContractService> {

    constructor(contractService:ContractService) {
        super(contractService);
    }

    @Get("index")
    async index(@Query('reporting_year') reporting_year:number) : Promise<ContractIndex[]> {
        return await this.service.index(reporting_year);
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
        const res = await this.service.combine(id1,ids);
        if (res['error'] && res['error'] === 'update') throw new InternalServerErrorException('Problems while updating first contract') 
        else if (res['error'] && res['error'] === 'delete') throw new InternalServerErrorException('Problems while deleting second contract') 
        else return res;
    }

}
