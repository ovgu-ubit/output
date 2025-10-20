import { Module } from '@nestjs/common';
import { StatisticController } from './StatisticController';
import { StatisticsService } from './statistics.service';
import { PublicationModule } from '../publication/publication.module';

@Module({
  imports: [
    PublicationModule
  ],
  controllers: [StatisticController],
  providers: [StatisticsService],
  exports: []
})
export class StatisticsModule {}
