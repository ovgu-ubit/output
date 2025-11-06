import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StatisticsService } from 'src/app/statistics/statistics.service';
import { FilterOptions } from '../../../../../../output-interfaces/Statistics';
import { Observable, map, merge } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChartConstructorType } from 'highcharts-angular';

@Component({
    selector: 'app-statistics-year',
    templateUrl: './statistics-year.component.html',
    styleUrls: ['./statistics-year.component.css'],
    standalone: false
})
export class StatisticsYearComponent implements OnInit {

  chartConstructor: ChartConstructorType = 'chart'; // 'chart'|'stockChart'|'mapChart'|'ganttChart'
  chartOptions: Highcharts.Options = {
    chart: {
      plotBorderWidth: null,
      plotShadow: false,
      backgroundColor: window.getComputedStyle(document.body).getPropertyValue("background-color"),
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
        showInLegend: true,
        point: {
          events: {
            legendItemClick: (event) => {
              this.applyAntiFilter(event.target.series.name, event.target.name)
            }
          }
        }
      }
    },navigation: {
      buttonOptions: {
        theme: {
          fill: window.getComputedStyle(document.body).getPropertyValue("background-color"),
        }
      }, menuStyle : {
        backgroundColor: window.getComputedStyle(document.body).getPropertyValue("background-color")
      }
    }

  }; // required
  chartOptionsLocked = {
    ...this.chartOptions,
    title: {
      text: 'Anteil gesperrt'
    }
  }
  chartOptionsInstitute = {
    ...this.chartOptions,
    title: {
      text: 'Anteil Institute (corresponding)'
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
  updateFlagLocked: boolean = false; // set to true if you wish to update the chart
  oneToOneFlag: boolean = true; // changing number of series
  runOutsideAngular: boolean = false; // optional boolean, defaults to false

  year;
  costs = false;

  institutes: { id: number, label: string }[] = []
  oa_cats: { id: number, label: string }[] = []
  publisher: { id: number, label: string }[] = []
  constracts: { id: number, label: string }[] = []
  pub_types: { id: number, label: string }[] = []

  constructor(private route: ActivatedRoute, private statService: StatisticsService, private _snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.year = parseInt(this.route.snapshot.paramMap.get('year'));
    this.loadData(this.costs)
  }

  loadData(costs: boolean) {
    this.costs = costs;
    let ob$: Observable<any> = this.statService.corresponding(this.year, costs, this.filter).pipe(map(
      data => {
        let chartData = []
        for (let e of data) {
          chartData.push([e.corresponding === null? "Unbekannt": (e.corresponding? "Corresponding" : "Keine Person der Einrichtung"), e.value])
        }
        this.chartOptions.series = [{
          type: 'pie',
          name: 'Art',
          data: chartData,
          events: {
            click:
              (event) => { this.applyFilter(event.point.series.name, event.point.name) }
          }
        }]
        this.updateFlag = true;
      }));
    ob$ = merge(ob$, this.statService.locked(this.year, this.filter).pipe(map(
      data => {
        let chartData = []
        for (let e of data) {
          chartData.push([e.locked? "Gesperrt": "Nicht gesperrt", e.value])
        }
        this.chartOptionsLocked.series = [{
          type: 'pie',
          name: 'Gesperrt',
          data: chartData,
          events: {
            click:
              (event) => { this.applyFilter(event.point.series.name, event.point.name) }
          }
        }]
        this.updateFlagLocked = true;
      })));
    ob$ = merge(ob$, this.statService.institute(this.year, costs, this.filter).pipe(map(
      data => {
        this.institutes = data.map(e => {return {id:e.id, label:e.institute}});
        let chartData = []
        for (let e of data) {
          chartData.push([e.institute? e.institute: 'Unbekannt', e.value])
        }
        chartData = chartData.sort((a,b) => {
          if (a[0] === "Unbekannt") return 1;
          else if (b[0] === "Unbekannt") return -1;
          else return b[1] - a[1]
        })
        this.chartOptionsInstitute.series = [{
          type: 'pie',
          name: 'Institut',
          data: chartData,
          events: {
            click:
              (event) => { this.applyFilter(event.point.series.name, event.point.name) }
          },
          tooltip: {
            pointFormat: `<b>{point.y:,.0f}${costs? ' €' : ''}</b><br>{point.percentage:.1f} %`
          }
        }]
        this.updateFlag1 = true;
      })));
    ob$ = merge(ob$, this.statService.oaCat(this.year, costs, this.filter).pipe(map(
      data => {
        this.oa_cats = data.map(e => { return { id: e['id'], label: e['oa_cat'] } });
        let chartData = []
        for (let e of data) {
          chartData.push([e.oa_cat, e.value])
        }
        chartData = chartData.sort((a,b) => {
          if (a[0] === "Unbekannt") return 1;
          else if (b[0] === "Unbekannt") return -1;
          else return b[1] - a[1]
        })
        this.chartOptionsOACat.series = [{
          type: 'pie',
          name: 'OA-Kategorie',
          data: chartData,
          events: {
            click:
              (event) => { this.applyFilter(event.point.series.name, event.point.name) }
          },
          tooltip: {
            pointFormat: `<b>{point.y:,.0f}${costs? ' €' : ''}</b><br>{point.percentage:.1f} %`
          }
        }]
        this.updateFlag2 = true;
      })));
    ob$ = merge(ob$, this.statService.publisher(this.year, costs, this.filter).pipe(map(
      data => {
        this.publisher = data.map(e => { return { id: e['id'], label: e['publisher'] } });
        let chartData = []
        for (let e of data) {
          chartData.push([e.publisher, e.value])
        }
        chartData = chartData.sort((a,b) => {
          if (a[0] === "Unbekannt") return 1;
          else if (b[0] === "Unbekannt") return -1;
          else return b[1] - a[1]
        })
        this.chartOptionsPublisher.series = [{
          type: 'pie',
          name: 'Verlag',
          data: chartData,
          events: {
            click:
              (event) => { this.applyFilter(event.point.series.name, event.point.name) }
          },
          tooltip: {
            pointFormat: `<b>{point.y:,.0f}${costs? ' €' : ''}</b><br>{point.percentage:.1f} %`
          }
        }]
        this.updateFlag3 = true;
      })));
    ob$ = merge(ob$, this.statService.pub_type(this.year, costs, this.filter).pipe(map(
      data => {
        this.pub_types = data.map(e => { return { id: e['id'], label: e['pub_type'] } });
        let chartData = []
        for (let e of data) {
          chartData.push([e.pub_type, e.value])
        }
        chartData = chartData.sort((a,b) => {
          if (a[0] === "Unbekannt") return 1;
          else if (b[0] === "Unbekannt") return -1;
          else return b[1] - a[1]
        })
        this.chartOptionsPubType.series = [{
          type: 'pie',
          name: 'Publikationsart',
          data: chartData,
          events: {
            click:
              (event) => { this.applyFilter(event.point.series.name, event.point.name) }
          },
          tooltip: {
            pointFormat: `<b>{point.y:,.0f}${costs? ' €' : ''}</b><br>{point.percentage:.1f} %`
          }
        }]
        this.updateFlag4 = true;
      })));
    ob$ = merge(ob$, this.statService.contract(this.year, costs, this.filter).pipe(map(
      data => {
        this.constracts = data.map(e => { return { id: e['id'], label: e['contract'] } });
        let chartData = []
        for (let e of data) {
          chartData.push([e.contract, e.value])
        }
        chartData = chartData.sort((a,b) => {
          if (a[0] === "Unbekannt") return 1;
          else if (b[0] === "Unbekannt") return -1;
          else return b[1] - a[1]
        })
        this.chartOptionsContract.series = [{
          type: 'pie',
          name: 'Vertrag',
          data: chartData,
          events: {
            click:
              (event) => { this.applyFilter(event.point.series.name, event.point.name) }
          },
          tooltip: {
            pointFormat: `<b>{point.y:,.0f}${costs? ' €' : ''}</b><br>{point.percentage:.1f} %`
          }
        }]
        this.updateFlag5 = true;
      })));
    ob$.subscribe({
      error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  getLink() {
    return '/statistics/' + this.year;
  }

  getLabel() {
    return '/Berichte/' + this.year;
  }

  filter: FilterOptions = {};
  filterChips: { text: string, key: string, id?: number }[] = [];


  applyFilter(series_name: string, cat_name: string) {
    if (series_name === 'Art' && cat_name === 'sonstige') return;
    let key = undefined;
    if (series_name === 'Art') {
      if (cat_name === 'Corresponding') this.filter = { ...this.filter, corresponding: true }
      key = 'corresponding'
    }
    if (series_name === 'Gesperrt') {
      if (cat_name === 'Gesperrt') this.filter = { ...this.filter, locked: true }
      else this.filter = { ...this.filter, locked: false }
      key = 'locked'
    }
    if (series_name === 'Institut') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, instituteId: [null] }
      else this.filter = { ...this.filter, instituteId: [this.institutes.find(e => e.label === cat_name)?.id] }
      key = 'instituteId'
    }
    if (series_name === 'OA-Kategorie') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, oaCatId: [null] }
      else this.filter = { ...this.filter, oaCatId: [this.oa_cats.find(e => e.label === cat_name)?.id] }
      key = 'oaCatId'
    }
    if (series_name === 'Vertrag') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, contractId: [null] }
      else this.filter = { ...this.filter, contractId: [this.constracts.find(e => e.label === cat_name)?.id] }
      key = 'contractId'
    }
    if (series_name === 'Publikationsart') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, pubTypeId: [null] }
      else this.filter = { ...this.filter, pubTypeId: [this.pub_types.find(e => e.label === cat_name)?.id] }
      key = 'pubTypeId'
    }
    if (series_name === 'Verlag') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, publisherId: [null] }
      else this.filter = { ...this.filter, publisherId: [this.publisher.find(e => e.label === cat_name)?.id] }
      key = 'publisherId'
    }
    this.filterChips.push({ text: series_name + ': ' + cat_name, key })
    this.loadData(this.costs);
  }
  applyAntiFilter(series_name: string, cat_name: string) {
    if (series_name === 'Art' && cat_name === 'sonstige') return;
    if (series_name === 'Gesperrt') return;
    let key = undefined;
    let id = undefined;
    if (series_name === 'Art') {
      if (cat_name === 'corresponding') this.filter = { ...this.filter, corresponding: false }
      key = 'corresponding'
    }
    if (series_name === 'Institut') {
      let notInstituteId = this.filter?.notInstituteId ? this.filter.notInstituteId : [];
      if (cat_name === 'Unbekannt') id = null;
      else id = this.institutes.find(e => e.label === cat_name)?.id
      notInstituteId.push(id)
      this.filter.notInstituteId = notInstituteId;
      key = 'notInstituteId'
    }
    if (series_name === 'OA-Kategorie') {
      let notOaCatId = this.filter?.notOaCatId ? this.filter.notOaCatId : [];
      if (cat_name === 'Unbekannt') id = null
      else id = this.oa_cats.find(e => e.label === cat_name)?.id
      notOaCatId.push(id)
      this.filter.notOaCatId = notOaCatId;
      key = 'notOaCatId'
    }
    if (series_name === 'Vertrag') {
      let notContractId = this.filter?.notContractId ? this.filter.notContractId : [];
      if (cat_name === 'Unbekannt') id=null
      else id = this.constracts.find(e => e.label === cat_name)?.id;
      notContractId.push(id)
      this.filter.notContractId = notContractId;
      key = 'notContractId'
    }
    if (series_name === 'Publikationsart') {
      let notPubTypeId = this.filter?.notPubTypeId ? this.filter.notPubTypeId : [];
      if (cat_name === 'Unbekannt') id = null
      else id=this.pub_types.find(e => e.label === cat_name)?.id
      notPubTypeId.push(id)
      this.filter.notPubTypeId = notPubTypeId;
      key = 'notPubTypeId'
    }
    if (series_name === 'Verlag') {
      let notPublisherId = this.filter?.notPublisherId ? this.filter.notPublisherId : [];
      if (cat_name === 'Unbekannt') id=null
      else id=this.publisher.find(e => e.label === cat_name)?.id
      notPublisherId.push(id)
      this.filter.notPublisherId = notPublisherId;
      key = 'notPublisherId'
    }
    this.filterChips.push({ text: series_name + ': !' + cat_name, key, id })
    this.loadData(this.costs);
  }

  hidden() {
    return !this.filter || Object.keys(this.filter).length === 0;
  }

  resetFilter() {
    this.filterChips = [];
    this.filter = {};
    this.loadData(this.costs);
  }

  removeFilter(elem: { text: string, key: string, id?: number }) {
    if (elem.key.includes("not")) {
      this.filter[elem.key] = this.filter[elem.key].filter(e => e !== elem.id)
      this.filterChips = this.filterChips.filter(e => !(e.key === elem.key && e.id === elem.id))
    }
    else {
      delete this.filter[elem.key]
      this.filterChips = this.filterChips.filter(e => e.key !== elem.key)
    }
    this.loadData(this.costs);
  }
}
