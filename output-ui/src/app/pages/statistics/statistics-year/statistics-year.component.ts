import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as Highcharts from 'highcharts';
import exporting from 'highcharts/modules/exporting';
import { StatisticsService } from 'src/app/services/statistics.service';

@Component({
  selector: 'app-statistics-year',
  templateUrl: './statistics-year.component.html',
  styleUrls: ['./statistics-year.component.css']
})
export class StatisticsYearComponent implements OnInit {

  Highcharts: typeof Highcharts = Highcharts; // required
  chartConstructor: string = 'chart'; // 'chart'|'stockChart'|'mapChart'|'ganttChart'
  chartOptions: Highcharts.Options = {
    chart: {
      plotBorderWidth: null,
      plotShadow: false
    },
    title: {
      text: 'Anteil Corresponding'
    },
    tooltip: {
      pointFormat: '<b>{point.y:.0f}</b><br>{point.percentage:.1f} %'
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.percentage:.1f} %'
        },
        showInLegend: true
      }
    },

  }; // required
  chartOptionsInstitute = {
    ...this.chartOptions,
    title: {
      text: 'Anteil Institute'
    }
  }
  chartOptionsOACat = {
    ...this.chartOptions,
    title: {
      text: 'Anteil OA-Kategorien'
    }
  }
  chartOptionsPublisher = {
    ...this.chartOptions,
    title: {
      text: 'Anteil Verlage'
    }
  }
  chartOptionsPubType = {
    ...this.chartOptions,
    title: {
      text: 'Anteil Publikationsarten'
    }
  }
  chartCallback: Highcharts.ChartCallbackFunction = function (chart) { return null } // function after chart is created
  updateFlag: boolean = false; // set to true if you wish to update the chart
  updateFlag1: boolean = false; // set to true if you wish to update the chart
  updateFlag2: boolean = false; // set to true if you wish to update the chart
  updateFlag3: boolean = false; // set to true if you wish to update the chart
  updateFlag4: boolean = false; // set to true if you wish to update the chart
  oneToOneFlag: boolean = true; // changing number of series
  runOutsideAngular: boolean = false; // optional boolean, defaults to false

  year;

  constructor(private route: ActivatedRoute, private statService: StatisticsService) { }

  ngOnInit(): void {
    exporting(Highcharts);
    this.year = parseInt(this.route.snapshot.paramMap.get('year'));
    this.statService.corresponding(this.year).subscribe({
      next: data => {
        let chartData = []
        for (let e of data) {
          chartData.push(['corresponding', parseFloat(e.corresponding)])
          chartData.push(['sonstige', parseFloat(e.count) - parseFloat(e.corresponding)])
        }
        this.chartOptions.series = [{
          type: 'pie',
          name: 'Art',
          data: chartData
        }]
        this.updateFlag = true;
      }
    })
    this.statService.institute(this.year).subscribe({
      next: data => {
        let chartData = []
        for (let e of data) {
          chartData.push([e.institute, parseFloat(e.count)])
        }
        this.chartOptionsInstitute.series = [{
          type: 'pie',
          name: 'Institut',
          data: chartData
        }]
        this.updateFlag1 = true;
      }
    });
    this.statService.oaCat(this.year).subscribe({
      next: data => {
        let chartData = []
        for (let e of data) {
          chartData.push([e.oa_cat, parseFloat(e.count)])
        }
        this.chartOptionsOACat.series = [{
          type: 'pie',
          name: 'OA-Kategorie',
          data: chartData
        }]
        this.updateFlag2 = true;
      }
    });
    this.statService.publisher(this.year).subscribe({
      next: data => {
        let chartData = []
        for (let e of data) {
          chartData.push([e.publisher, parseFloat(e.count)])
        }
        this.chartOptionsPublisher.series = [{
          type: 'pie',
          name: 'Verlag',
          data: chartData
        }]
        this.updateFlag3 = true;
      }
    });
    this.statService.pub_type(this.year).subscribe({
      next: data => {
        let chartData = []
        for (let e of data) {
          chartData.push([e.pub_type, parseFloat(e.count)])
        }
        this.chartOptionsPubType.series = [{
          type: 'pie',
          name: 'Publikationsart',
          data: chartData
        }]
        this.updateFlag4 = true;
      }
    });
  }

  getLink() {
    return '/statistics/' + this.year;
  }

  getLabel() {
    return '/Berichte/' + this.year;
  }
}
