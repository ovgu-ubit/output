import { Controller, Get, Query, Post, Body, BadRequestException, UseGuards, Req, ForbiddenException } from "@nestjs/common";
import { ApiBody, ApiTags } from "@nestjs/swagger";
import { GROUP, FilterOptions, HighlightOptions, STATISTIC, TIMEFRAME } from "../../../output-interfaces/Statistics";
import { StatisticsService } from "./statistics.service";
import { AccessGuard } from "../authorization/access.guard";

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
        if (!year) throw new BadRequestException('year has to be given');
        if (!group || (highlightOptions && Object.keys(highlightOptions).length > 0)) group = []
        if (statistic == STATISTIC.NET_COSTS && request['user'] && !request['user']['read']) throw new ForbiddenException();
        return this.statService.publication_statistic(year, statistic, group, timeframe, filterOptions, highlightOptions)
    }
}
