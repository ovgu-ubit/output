import { Controller, Get, Query, Post, Body, UseGuards, Req } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { GROUP, FilterOptions, HighlightOptions, STATISTIC, TIMEFRAME } from "../../../output-interfaces/Statistics";
import { StatisticsService } from "./statistics.service";
import { AccessGuard } from "../authorization/access.guard";
import { createForbiddenHttpException, createInvalidRequestHttpException } from "../common/api-error";

@Controller("statistics")
@ApiTags("statistics")
export class StatisticController {

    constructor(private statService: StatisticsService) { }

    @Post('publication_statistic')
    @UseGuards(AccessGuard)
    @ApiBody({
        description: '<p>JSON Request:</p>',
        schema: {
            example: {
                year: 2024,
                statistic: 0,
                group: [5],
                timeframe: 1,
                filterOptions: {
                    corresponding: true
                },
                highlightOptions: {}
            }
        }
    })
    publication_stat(@Req() request, @Body('year') year: number, @Body('statistic') statistic: STATISTIC, @Body('group') group: GROUP[], @Body('timeframe') timeframe: TIMEFRAME, @Body('filterOptions') filterOptions: FilterOptions, @Body('highlightOptions') highlightOptions: HighlightOptions) {
        if (!year) throw createInvalidRequestHttpException('year has to be given');
        if (!group || (highlightOptions && Object.keys(highlightOptions).length > 0)) group = []
        if (statistic == STATISTIC.NET_COSTS && request['user'] && !request['user']['read']) throw createForbiddenHttpException();
        return this.statService.publication_statistic(year, statistic, group, timeframe, filterOptions, highlightOptions)
    }
}
