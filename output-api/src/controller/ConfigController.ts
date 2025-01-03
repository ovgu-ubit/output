import { Controller, Get, Query, Post, Body } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { StatisticsService } from "../services/statistics.service";
import { FilterOptions, HighlightOptions } from "../../../output-interfaces/Statistics";
import { ConfigService } from "@nestjs/config";

@Controller("config")
@ApiTags("config")
export class ConfigController {

    constructor(private configService: ConfigService) { }

    @Get('optional_fields')
    getOptionalFields() {
        return this.configService.get('optional_fields');
    }

    @Get('pub_index_columns')
    getPubIndexColumns() {
        return this.configService.get('pub_index_columns');
    }

    @Get('institution')
    getInstitution() {
        return {
            label: this.configService.get('institution_label'),
            short_label: this.configService.get('institution_short_label')
        }
    }

    @Get('doi_import')
    getDOIImport() {
        return JSON.stringify(this.configService.get('doi_import_service'))
    }
}
