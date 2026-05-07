import { Controller, Get, Query } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { Language } from "./Language.entity";
import { LanguageService } from "./language.service";
import { AbstractCrudController } from "../../common/abstract-crud.controller";

@Controller("language")
@ApiTags("language")
export class LanguageController extends AbstractCrudController<Language, LanguageService> {

    constructor(languageService:LanguageService) {
        super(languageService);
    }

    @Get()
    @ApiResponse({
        type: Language,
        isArray: true
    })
    async all(): Promise<Language[]> {
        return this.getAllEntities();
    }

    @Get('one')
    @ApiResponse({
        type: Language
    })
    async one(@Query('id') id:number) : Promise<Language> {
        return this.service.oneOrFail(id, false, undefined, 'Language not found.');
    }

}
