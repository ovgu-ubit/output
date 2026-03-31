import { Body, Controller, Delete, Get, Post, Put, Query, Req, UseGuards,Param} from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { CostTypeIndex } from "../../../output-interfaces/PublicationIndex";
import { InvoiceService } from "./invoice.service";
import { Invoice } from "./Invoice.entity";
import { CostType } from "./CostType.entity";
import { CostCenter } from "./CostCenter.entity";
import { CostTypeService } from "./cost-type.service";
import { CostCenterService } from "./cost-center.service";
import { assertCreateRequestHasNoId } from "../common/entity-id";

@Controller("invoice")
@ApiTags("invoice")
export class InvoiceController {

    constructor(
        private invoiceService:InvoiceService,
        private costTypeService: CostTypeService,
        private costCenterService: CostCenterService,
    ) { }

    @Get()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiResponse({
        type: Invoice,
        isArray: true
    })
    async all(@Query('pub_id') pub_id:number) : Promise<Invoice[]> {
        return await this.invoiceService.getForPub({id:pub_id});
    }

    @Get('one')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiResponse({
        type: Invoice
    })
    async one(@Query('id') id:number, @Req() request: Request) : Promise<Invoice> {
        return await this.invoiceService.get(id, request['user'] ? request['user']['write'] : false, request['user']?.['username']);
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
    async save(@Body() body: Invoice, @Req() request: Request) {
        assertCreateRequestHasNoId(body);
        return this.invoiceService.save([body], request['user']?.['username'])
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
    async update(@Body() body: Invoice, @Req() request: Request) {
        return this.invoiceService.save([body], request['user']?.['username'])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Invoice[], @Req() request: Request) {
        return this.invoiceService.delete(body, request['user']?.['username']);
    }

    @Get('cost_type')
    @ApiResponse({
        type: Invoice
    })
    async cost_type() : Promise<CostType[]> {
        return await this.costTypeService.get();
    }
    
    @Get('cost_type_index')
    @ApiResponse({
        type: Invoice
    })
    async cost_type_index(@Query('reporting_year') reporting_year: number) : Promise<CostTypeIndex[]> {
        return await this.costTypeService.getCostTypeIndex(reporting_year);
    }
    
    @Get('cost_type/:id')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Invoice
    })
    async cost_type_one(@Param('id') id:number, @Req() request: Request) : Promise<CostType> {
        return await this.costTypeService.one(id, request['user']? request['user']['write'] : false, request['user']?.['username']);
    }

    @Post('cost_type')
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
    async saveCT(@Body() body: CostType) {
        assertCreateRequestHasNoId(body);
        return this.costTypeService.save(body)
    }
    
    @Put('cost_type')
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
    async updateCT(@Body() body: CostType, @Req() request: Request) {
        return this.costTypeService.update(body, request['user']?.['username'])
    }

    @Delete('cost_type')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
    async removeCT(@Body() body: CostType[]) {
        return this.costTypeService.delete(body);
    }
    

    @Get('cost_center')
    async cost_center() : Promise<CostCenter[]> {
        return await this.costCenterService.get();
    } 

    @Get('cost_center/index')
    @ApiResponse({ status: 200, description: 'Author index is returned.' })
    async ccIndex(@Query('reporting_year') reporting_year: number) {
        return await this.costCenterService.getCostCenterIndex(reporting_year);
    }

    
    @Get('cost_center/:id')
    @UseGuards(AccessGuard)
    async cost_center_one(@Param('id') id:number, @Req() request: Request) : Promise<CostCenter> {
        return await this.costCenterService.one(id, request['user']? request['user']['write'] : false, request['user']?.['username']);
    }

    @Post('cost_center')
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
    async saveCC(@Body() body: CostCenter) {
        assertCreateRequestHasNoId(body);
        return this.costCenterService.save(body)
    }
    
    @Put('cost_center')
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
    async updateCC(@Body() body: CostCenter, @Req() request: Request) {
        return this.costCenterService.update(body, request['user']?.['username'])
    }

    @Delete('cost_center')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async removeCC(@Body() body: CostCenter[]) {
        return this.costCenterService.delete(body);
    }
}
