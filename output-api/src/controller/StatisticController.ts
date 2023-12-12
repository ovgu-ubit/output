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
    institute(@Query('year') year:number) {
        return this.statService.institute(year);
    }

    @Get('oa_cat')
    oaCat(@Query('year') year:number) {
        return this.statService.oaCategory(year);
    }

    @Get('publisher')
    publisher(@Query('year') year:number) {
        return this.statService.publisher(year);
    }

    @Get('pub_type')
    pub_tpye(@Query('year') year:number) {
        return this.statService.pub_type(year);
    }
}
