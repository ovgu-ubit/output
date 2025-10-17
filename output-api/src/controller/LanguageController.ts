import { Body, Controller, Delete, Get, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import { LanguageService } from "../services/entities/language.service";
import { Language } from "../entity/Language";
import { AccessGuard } from "../authorization/access.guard";
import { Permissions } from "../authorization/permission.decorator";

@Controller("language")
@ApiTags("language")
export class LanguageController {

    constructor(private languageService:LanguageService) { }

    @Get()
    @ApiResponse({
        type: Language,
        isArray: true
    })
    async all() : Promise<Language[]> {
        return await this.languageService.get();
    }

    @Get('one')
    @ApiResponse({
        type: Language
    })
    async one(@Query('id') id:number) : Promise<Language> {
        return await this.languageService.one(id);
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
    async save(@Body() body: Language) {
        if (!body.id) body.id = undefined;
        return this.languageService.save([body])
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
    async update(@Body() body: Language) {
        return this.languageService.save([body])
    }

    @Delete()
    @UseGuards(AccessGuard)
    @Permissions([{ role: 'writer', app: 'output' }, { role: 'admin', app: 'output' }])
    async remove(@Body() body: Language[]) {
        return this.languageService.delete(body);
    }

}
