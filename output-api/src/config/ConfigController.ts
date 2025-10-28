import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "./app-config.service";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";

@Controller("config")
@ApiTags("config")
export class ConfigController {

    constructor(private configService: AppConfigService) { }

    @Get()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'admin', app: 'output' }])
    async list(@Query("key") key?:string) {
        return await this.configService.listDatabaseConfig(key);
    }

    @Post()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'admin', app: 'output' }])
    async set(@Body('key') key: string, @Body('value') value: any) {
        /*let save;
        if (typeof value === 'string') save = value;
        else if (Array.isArray(value)) save = value;
        else save = JSON.parse(value)
        return await this.configService.setDatabaseConfig(key, save);*/
        return await this.configService.setDatabaseConfig(key, value);
    }

    @Get('optional_fields')
    getOptionalFields() {
        return this.configService.get('optional_fields');
    }

    @Get('pub_index_columns')
    getPubIndexColumns() {
        return this.configService.get('pub_index_columns');
    }

    @Get('doi_import')
    async getDOIImport() {
        return JSON.stringify(await this.configService.get('doi_import_service'))
    }
}
