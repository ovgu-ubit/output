import { Body, Controller, Get, Post, Query, Req, UseGuards, UsePipes } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "./app-config.service";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";
import { ConfigValueValidationPipe } from "./config-value-validation.pipe";
import { HealthState } from "../../../output-interfaces/Config";
import { Request } from "express";
import { ConfigScope } from "./Config.entity";

@Controller("config")
@ApiTags("config")
export class ConfigController {

    constructor(private configService: AppConfigService) { }

    @Get()
    @UseGuards(AccessGuard)
    async list(@Req() req: Request, @Query("key") key?: string) {
        const userScope: ConfigScope = req?.['user']?.admin ? 'admin' : req?.['user']?.read ? 'user' : 'public';
        let res;
        if (key) res = (await this.configService.listDatabaseConfig( userScope, key))[0];
        else res = await this.configService.listDatabaseConfig(userScope)
        return res;
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
        return await this.configService.setDatabaseConfig(value.key, value.value);
    }

    @Get("health")
    @ApiOkResponse({ description: "System is healthy" })
    @ApiServiceUnavailableResponse({ description: "System is unhealthy" })
    async getHealth(): Promise<HealthState> {
        return this.configService.checkHealth();
    }
}
