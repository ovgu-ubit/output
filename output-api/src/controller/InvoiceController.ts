import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards} from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { InvoiceService } from "../services/entities/invoice.service";
import { Invoice } from "../entity/Invoice";
import { CostType } from "../entity/CostType";
import { CostCenter } from "../entity/CostCenter";
import { AccessGuard } from "../guards/access.guard";
import { Permissions } from "../guards/permission.decorator";

@Controller("invoice")
@ApiTags("invoice")
export class InvoiceController {

    constructor(private invoiceService:InvoiceService) { }

    @Get()
    @ApiResponse({
        type: Invoice,
        isArray: true
    })
    async all(@Query('pub_id') pub_id:number) : Promise<Invoice[]> {
        return await this.invoiceService.getForPub({id:pub_id});
    }

    @Get('one')
    @ApiResponse({
        type: Invoice
    })
    async one(@Query('id') id:number) : Promise<Invoice> {
        return await this.invoiceService.get(id);
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @Permissions([{ role: 'writer', app: 'output' }])
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
    
    @Get('cost_type')
    @ApiResponse({
        type: Invoice
    })
    async cost_type_one(@Query('id') id:number) : Promise<CostType> {
        return await this.invoiceService.getCostType(id);
    }

    @Post('cost_type')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @ApiResponse({
        type: Invoice
    })
    async cost_center() : Promise<CostCenter[]> {
        return await this.invoiceService.getCostCenters();
    }
    
    @Get('cost_center')
    @ApiResponse({
        type: Invoice
    })
    async cost_center_one(@Query('id') id:number) : Promise<CostCenter> {
        return await this.invoiceService.getCostCenter(id);
    }

    @Post('cost_center')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @Permissions([{ role: 'writer', app: 'output' }])
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
    @Permissions([{ role: 'writer', app: 'output' }])
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }])
    async removeCC(@Body() body: CostCenter[]) {
        return this.invoiceService.deleteCC(body);
    }
}
