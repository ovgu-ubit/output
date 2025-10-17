import { Body, Controller, Delete, Get, Post, Put, Query, Req, UseGuards,Param} from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { CostTypeIndex } from "../../../output-interfaces/PublicationIndex";
import { InvoiceService } from "./invoice.service";
import { Invoice } from "./Invoice";
import { CostType } from "./CostType";
import { CostCenter } from "./CostCenter";

@Controller("invoice")
@ApiTags("invoice")
export class InvoiceController {

    constructor(private invoiceService:InvoiceService) { }

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
    async one(@Query('id') id:number) : Promise<Invoice> {
        return await this.invoiceService.get(id);
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
    async save(@Body() body: Invoice) {
        if (!body.id) body.id = undefined;
        return this.invoiceService.save([body])
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
    async update(@Body() body: Invoice) {
        return this.invoiceService.save([body])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Invoice[]) {
        return this.invoiceService.delete(body);
    }

    @Get('cost_type')
    @ApiResponse({
        type: Invoice
    })
    async cost_type() : Promise<CostType[]> {
        return await this.invoiceService.getCostTypes();
    }
    
    @Get('cost_type_index')
    @ApiResponse({
        type: Invoice
    })
    async cost_type_index(@Query('reporting_year') reporting_year: number) : Promise<CostTypeIndex[]> {
        return await this.invoiceService.getCostTypeIndex(reporting_year);
    }
    
    @Get('cost_type/:id')
    @UseGuards(AccessGuard)
    @ApiResponse({
        type: Invoice
    })
    async cost_type_one(@Param('id') id:number, @Req() request: Request) : Promise<CostType> {
        return await this.invoiceService.getCostType(id, request['user']? request['user']['write'] : false);
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
        if (!body.id) body.id = undefined;
        return this.invoiceService.saveCT([body])
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
    async updateCT(@Body() body: CostType) {
        return this.invoiceService.saveCT([body])
    }

    @Delete('cost_type')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
    async removeCT(@Body() body: CostType[]) {
        return this.invoiceService.deleteCT(body);
    }
    

    @Get('cost_center')
    async cost_center() : Promise<CostCenter[]> {
        return await this.invoiceService.getCostCenters();
    } 

    @Get('cost_center/index')
    @ApiResponse({ status: 200, description: 'Author index is returned.' })
    async ccIndex(@Query('reporting_year') reporting_year: number) {
        return await this.invoiceService.getCostCenterIndex(reporting_year);
    }

    
    @Get('cost_center/:id')
    @UseGuards(AccessGuard)
    async cost_center_one(@Param('id') id:number, @Req() request: Request) : Promise<CostCenter> {
        return await this.invoiceService.getCostCenter(id, request['user']? request['user']['write'] : false);
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
        if (!body.id) body.id = undefined;
        return this.invoiceService.saveCC([body])
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
    async updateCC(@Body() body: CostCenter) {
        return this.invoiceService.saveCC([body])
    }

    @Delete('cost_center')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async removeCC(@Body() body: CostCenter[]) {
        return this.invoiceService.deleteCC(body);
    }
}
