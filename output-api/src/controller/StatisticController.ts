import { Controller, Get, Query, Post,Body } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StatisticsService } from "../services/statistics.service";
import { FilterOptions, HighlightOptions } from "../../../output-interfaces/Statistics";

@Controller("statistics")
@ApiTags("statistics")
export class StatisticController {

    constructor(private statService:StatisticsService ) {}

    @Post('count_by_year')
    count(@Body('filterOptions') filterOptions:FilterOptions,@Body('highlightOptions') highlightOptions:HighlightOptions) {
        return this.statService.countPubsByYear(filterOptions,highlightOptions);
    }

    @Get('corresponding')
    corresponding(@Query('year') year:number) {
        return this.statService.corresponding(year);
    }

    @Get('institute')
    institute(@Query('year') year:number, @Query('costs') costs:boolean) {
        return this.statService.institute(year, costs);
    }

    @Get('oa_cat')
    oaCat(@Query('year') year:number, @Query('costs') costs:boolean) {
        return this.statService.oaCategory(year, costs);
    }

    @Get('publisher')
    publisher(@Query('year') year:number, @Query('costs') costs:boolean) {
        return this.statService.publisher(year, costs);
    }

    @Get('pub_type')
    pub_tpye(@Query('year') year:number, @Query('costs') costs:boolean) {
        return this.statService.pub_type(year, costs);
    }

    @Get('contract')
    contract(@Query('year') year:number, @Query('costs') costs:boolean) {
        return this.statService.contract(year, costs);
    }
}
