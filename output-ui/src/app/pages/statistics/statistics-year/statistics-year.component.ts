import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as Highcharts from 'highcharts';
import exporting from 'highcharts/modules/exporting';
import { StatisticsService } from 'src/app/services/statistics.service';
import { FilterOptions } from '../../../../../../output-interfaces/Statistics';

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
      pointFormat: '<b>{point.y:,.0f}</b><br>{point.percentage:.1f} %'
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
  chartOptionsContract = {
    ...this.chartOptions,
    title: {
      text: 'Anteil Verträge'
    }
  }
  chartCallback: Highcharts.ChartCallbackFunction = function (chart) { return null } // function after chart is created
  updateFlag: boolean = false; // set to true if you wish to update the chart
  updateFlag1: boolean = false; // set to true if you wish to update the chart
  updateFlag2: boolean = false; // set to true if you wish to update the chart
  updateFlag3: boolean = false; // set to true if you wish to update the chart
  updateFlag4: boolean = false; // set to true if you wish to update the chart
  updateFlag5: boolean = false; // set to true if you wish to update the chart
  oneToOneFlag: boolean = true; // changing number of series
  runOutsideAngular: boolean = false; // optional boolean, defaults to false

  year;
  costs = false;

  institutes:{id:number, label:string}[] = []
  oa_cats:{id:number, label:string}[] = []
  publisher:{id:number, label:string}[] = []
  constracts:{id:number, label:string}[] = []
  pub_types:{id:number, label:string}[] = []

  constructor(private route: ActivatedRoute, private statService: StatisticsService) { }

  ngOnInit(): void {
    exporting(Highcharts);
    this.year = parseInt(this.route.snapshot.paramMap.get('year'));
    this.loadData(this.costs)
  }

  loadData(costs:boolean) {
    this.costs = costs;
    this.statService.corresponding(this.year, this.filter).subscribe({
      next: data => {
        let chartData = []
        for (let e of data) {
          chartData.push(['corresponding', parseFloat(e.corresponding)])
          chartData.push(['sonstige', parseFloat(e.value) - parseFloat(e.corresponding)])
        }
        this.chartOptions.series = [{
          type: 'pie',
          name: 'Art',
          data: chartData,
          events: {click: 
            (event) => {this.applyFilter(event.point.series.name, event.point.name)}
          }
        }]
        this.updateFlag = true;
      }
    })
    this.statService.institute(this.year, costs, this.filter).subscribe({
      next: data => {
        this.institutes = data.map(e => {return {id: e['id'], label: e['institute']}});
        let chartData = []
        for (let e of data) {
          chartData.push([e.institute, parseFloat(e.value)])
        }
        this.chartOptionsInstitute.series = [{
          type: 'pie',
          name: 'Institut',
          data: chartData,
          events: {click: 
            (event) => {this.applyFilter(event.point.series.name, event.point.name)}
          }
        }]
        this.updateFlag1 = true;
      }
    });
    this.statService.oaCat(this.year, costs, this.filter).subscribe({
      next: data => {
        this.oa_cats = data.map(e => {return {id: e['id'], label: e['oa_cat']}});
        let chartData = []
        for (let e of data) {
          chartData.push([e.oa_cat, parseFloat(e.value)])
        }
        this.chartOptionsOACat.series = [{
          type: 'pie',
          name: 'OA-Kategorie',
          data: chartData,
          events: {click: 
            (event) => {this.applyFilter(event.point.series.name, event.point.name)}
          }
        }]
        this.updateFlag2 = true;
      }
    });
    this.statService.publisher(this.year, costs, this.filter).subscribe({
      next: data => {
        this.publisher = data.map(e => {return {id: e['id'], label: e['publisher']}});
        let chartData = []
        for (let e of data) {
          chartData.push([e.publisher, parseFloat(e.value)])
        }
        this.chartOptionsPublisher.series = [{
          type: 'pie',
          name: 'Verlag',
          data: chartData,
          events: {click: 
            (event) => {this.applyFilter(event.point.series.name, event.point.name)}
          }
        }]
        this.updateFlag3 = true;
      }
    });
    this.statService.pub_type(this.year, costs, this.filter).subscribe({
      next: data => {
        this.pub_types = data.map(e => {return {id: e['id'], label: e['pub_type']}});
        let chartData = []
        for (let e of data) {
          chartData.push([e.pub_type, parseFloat(e.value)])
        }
        this.chartOptionsPubType.series = [{
          type: 'pie',
          name: 'Publikationsart',
          data: chartData,
          events: {click: 
            (event) => {this.applyFilter(event.point.series.name, event.point.name)}
          }
        }]
        this.updateFlag4 = true;
      }
    });
    this.statService.contract(this.year, costs, this.filter).subscribe({
      next: data => {
        this.constracts = data.map(e => {return {id: e['id'], label: e['contract']}});
        let chartData = []
        for (let e of data) {
          chartData.push([e.contract, parseFloat(e.value)])
        }
        this.chartOptionsContract.series = [{
          type: 'pie',
          name: 'Vertrag',
          data: chartData,
          events: {click: 
            (event) => {this.applyFilter(event.point.series.name, event.point.name)}
          }
        }]
        this.updateFlag5 = true;
      }
    });
  }

  getLink() {
    return '/statistics/' + this.year;
  }

  getLabel() {
    return '/Berichte/' + this.year;
  }

  filter:FilterOptions;
  filterText:string=''

  applyFilter(series_name: string, cat_name: string) {
    if (cat_name === 'Unbekannt' || (series_name === 'Art' && cat_name === 'sonstige')) return;
    this.filterText += series_name+': '+cat_name +' ';
    if (series_name === 'Art') {
      if (cat_name === 'corresponding') this.filter = {...this.filter, corresponding: true}
    } 
    if (series_name === 'Institut') {
      this.filter = {...this.filter,instituteId: this.institutes.find(e => e.label === cat_name)?.id}
    } 
    if (series_name === 'OA-Kategorie') {
      this.filter = {...this.filter,oaCatId: this.oa_cats.find(e => e.label === cat_name)?.id}
    } 
    if (series_name === 'Vertrag') {
      this.filter = {...this.filter,contractId: this.constracts.find(e => e.label === cat_name)?.id}
    } 
    if (series_name === 'Publikationsart') {
      this.filter = {...this.filter,pubTypeId: this.pub_types.find(e => e.label === cat_name)?.id}
    } 
    if (series_name === 'Verlag') {
      this.filter = {...this.filter,publisherId: this.publisher.find(e => e.label === cat_name)?.id}
    }
    this.loadData(this.costs);
  }

  resetFilter() {
    this.filterText = '';
    this.filter = {};
    this.loadData(this.costs);
  }
}
