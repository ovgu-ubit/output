import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "./app-config.service";

@Controller("config")
@ApiTags("config")
export class ConfigController {

    constructor(private configService: AppConfigService) { }

    @Get('optional_fields')
    getOptionalFields() {
        return this.configService.get('optional_fields');
    }

    @Get('pub_index_columns')
    getPubIndexColumns() {
        return this.configService.get('pub_index_columns');
    }

    @Get('institution')
    async getInstitution() {
        return {
            label: await this.configService.get('institution_label'),
            short_label: await this.configService.get('institution_short_label')
        }
    }

    @Get('doi_import')
    async getDOIImport() {
        return JSON.stringify(await this.configService.get('doi_import_service'))
    }
}
