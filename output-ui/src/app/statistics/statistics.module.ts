import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { StatisticsRoutingModule } from './statistics-routing.module';
import { StatisticsComponent } from './pages/statistics/statistics.component';
import { StatisticsYearComponent } from './pages/statistics-year/statistics-year.component';
import { HighchartsChartModule } from 'highcharts-angular';

@NgModule({
  declarations: [
    StatisticsComponent,
    StatisticsYearComponent
  ],
  imports: [
    SharedModule,
    StatisticsRoutingModule,
    HighchartsChartModule
  ],
})
export class StatisticsModule {}
