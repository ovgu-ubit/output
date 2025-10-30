import { Body, Controller, Get, Post, Query, UseGuards, UsePipes } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "./app-config.service";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { ConfigValueValidationPipe } from "./config-value-validation.pipe";

@Controller("config")
@ApiTags("config")
export class ConfigController {

    constructor(private configService: AppConfigService) { }

    @Get()
    async list(@Query("key") key?: string) {
        return await this.configService.listDatabaseConfig(key);
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'admin', app: 'output' }])
    @UsePipes(
        new ConfigValueValidationPipe(),
    )
    @ApiBody({
        schema: {
            example: {
                key: 'reporting_year',
                value: 2025
            }
        }
    })
    async set(@Body() value: any) {
        /*let save;
        if (typeof value === 'string') save = value;
        else if (Array.isArray(value)) save = value;
        else save = JSON.parse(value)
        return await this.configService.setDatabaseConfig(key, save);*/
        return await this.configService.setDatabaseConfig(value.key, value.value);
    }

    @Get('doi_import')
    async getDOIImport() {
        return JSON.stringify(await this.configService.get('doi_import_service'))
    }
}
