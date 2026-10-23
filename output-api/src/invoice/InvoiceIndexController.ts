import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvoiceIndexPage } from '@output/interfaces';
import { AccessGuard } from '../authorization/access.guard';
import { Permissions } from '../authorization/permission.decorator';
import { createValidationException } from '../common/validation-exception.factory';
import { InvoiceIndexQueryDto } from './dto/invoice-index-query.dto';
import { InvoiceIndexPageDto } from './dto/invoice-index-response.dto';
import { InvoiceIndexService } from './invoice-index.service';

@Controller('invoice')
@ApiTags('invoice')
export class InvoiceIndexController {
    constructor(private readonly indexService: InvoiceIndexService) { }

    @Get('index')
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'reader', app: 'output' }, { role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    @ApiOperation({ summary: 'List invoices with aggregated positions, filters and server-side pagination' })
    @ApiResponse({ status: 200, type: InvoiceIndexPageDto, description: 'One row per invoice, including invoices of soft-deleted publications. Amounts are null if incomplete. Contract filters match either contract path.' })
    @ApiResponse({ status: 400, description: 'Invalid query parameters or date interval.' })
    @ApiResponse({ status: 403, description: 'Requires reader access (also inherited by publication_writer), writer or admin access.' })
    index(@Query(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: createValidationException,
    })) query: InvoiceIndexQueryDto): Promise<InvoiceIndexPage> {
        return this.indexService.index(query);
    }
}
