import { Module } from '@nestjs/common';
import { StatisticController } from './StatisticController';
import { StatisticsService } from './statistics.service';
import { InstituteModule } from '../institute/institute.module';
import { PublicationModule } from '../publication/publication.module';

@Module({
  imports: [
    PublicationModule,
    InstituteModule
  ],
  controllers: [StatisticController],
  providers: [StatisticsService],
  exports: []
})
export class StatisticsModule {}
