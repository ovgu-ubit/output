import { Controller, Get, Query, Post,Body } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { StatisticsService } from "../services/statistics.service";
import { FilterOptions, HighlightOptions } from "../../../output-interfaces/Statistics";

@Controller("statistics")
@ApiTags("statistics")
export class StatisticController {

    constructor(private statService:StatisticsService ) {}

    @Post('count_by_year')
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                filterOptions: {
                    
                },
                highlightOptions: {

                }
            }
        }
    })
    count(@Body('filterOptions') filterOptions:FilterOptions,@Body('highlightOptions') highlightOptions:HighlightOptions) {
        return this.statService.countPubsByYear(filterOptions,highlightOptions);
    }

    @Post('corresponding')
    corresponding(@Query('year') year:number,@Body('filterOptions') filterOptions:FilterOptions) {
        return this.statService.corresponding(year, filterOptions);
    }

    @Post('locked')
    locked(@Query('year') year:number,@Body('filterOptions') filterOptions:FilterOptions) {
        return this.statService.locked(year, filterOptions);
    }

    @Post('institute')
    institute(@Query('year') year:number, @Query('costs') costs:boolean,@Body('filterOptions') filterOptions:FilterOptions) {
        return this.statService.institute(year, costs, filterOptions);
    }

    @Post('oa_cat')
    oaCat(@Query('year') year:number, @Query('costs') costs:boolean,@Body('filterOptions') filterOptions:FilterOptions) {
        return this.statService.oaCategory(year, costs, filterOptions);
    }

    @Post('publisher')
    publisher(@Query('year') year:number, @Query('costs') costs:boolean,@Body('filterOptions') filterOptions:FilterOptions) {
        return this.statService.publisher(year, costs, filterOptions);
    }

    @Post('pub_type')
    pub_tpye(@Query('year') year:number, @Query('costs') costs:boolean,@Body('filterOptions') filterOptions:FilterOptions) {
        return this.statService.pub_type(year, costs, filterOptions);
    }

    @Post('contract')
    contract(@Query('year') year:number, @Query('costs') costs:boolean,@Body('filterOptions') filterOptions:FilterOptions) {
        return this.statService.contract(year, costs, filterOptions);
    }
}
