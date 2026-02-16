import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ChartConstructorType } from 'highcharts-angular';
import { Observable, catchError, map, merge, of, startWith } from 'rxjs';
import { ContractService } from 'src/app/services/entities/contract.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { StatisticsService } from 'src/app/statistics/statistics.service';
import { Contract, Institute, OA_Category, PublicationType, Publisher } from '../../../../../../output-interfaces/Publication';
import { FilterOptions, HighlightOptions } from '../../../../../../output-interfaces/Statistics';

@Component({
    selector: 'app-statistics',
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.css'],
    standalone: false
})
export class StatisticsComponent implements OnInit {
  chartConstructor: ChartConstructorType = 'chart'; // 'chart'|'stockChart'|'mapChart'|'ganttChart'
  chartOptionsDefault: Highcharts.Options = {
    chart: {
      type: 'column',
      plotBorderWidth: null,
      plotShadow: false,
      backgroundColor: window.getComputedStyle(document.body).getPropertyValue("background-color")
    }, xAxis: {
      title: { text: 'Erscheinungsjahr' }
    }
  }
  chartOptions: Highcharts.Options = {
    ...this.chartOptionsDefault,
    title: {
      text: 'Anzahl Publikationen nach Jahr'
    },
    yAxis: {
      title: { text: 'Anzahl' },
      min: 0,
      stackLabels: {
        enabled: true
      }
    }, plotOptions: {
      column: {
        stacking: 'normal'
      }
    }
  }; // required
  chartOptions1: Highcharts.Options = {
    ...this.chartOptionsDefault,
    tooltip: {
      shared: false,
      pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)<br/>'
    },
    title: {
      text: 'Anteil Publikationen nach Jahr und OA-Kategorie'
    },
    yAxis: {
      title: { text: 'Anzahl' },
      min: 0
    }, plotOptions: {
      column: {
        stacking: 'percent',
        dataLabels: {
          enabled: true
        }
      }
    }
  }; // required
  chartOptions2: Highcharts.Options = {
    ...this.chartOptionsDefault,
    tooltip: {
      shared: false,
      pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)<br/>'
    },
    title: {
      text: 'Anteil Publikationen nach Jahr und Publikationsart'
    },
    yAxis: {
      title: { text: 'Anzahl' },
      min: 0
    }, plotOptions: {
      column: {
        stacking: 'percent',
        dataLabels: {
          enabled: true
        }
      }
    }
  }; // required
  
  charts = new Map<string, Highcharts.Chart>();

  form: FormGroup = this.formBuilder.group({
    institute: [''],
    publisher: [''],
    contract: [''],
    corresponding: [''],
    locked: ['']
  });
  formHighlight: FormGroup = this.formBuilder.group({
    corresponding: [''],
    institute: [''],
    publisher: [''],
    contract: [''],
    locked: ['']
  });
  institutes: Institute[];
  publishers: Publisher[];
  contracts: Contract[];
  oa_cats: OA_Category[];
  pub_types: PublicationType[];
  filtered_institutes: Observable<Institute[]>;
  filtered_publishers: Observable<Publisher[]>;
  filtered_contracts: Observable<Contract[]>;
  filtered_institutes1: Observable<Institute[]>;
  filtered_publishers1: Observable<Publisher[]>;
  filtered_contracts1: Observable<Contract[]>;
  filter: FilterOptions = {};
  highlight: HighlightOptions = {};
  highlightName: string;

  @ViewChild('select_oa') selectOA: MatSelect;
  @ViewChild('select_PubType') selectPubType: MatSelect;
  @ViewChild('select_oa1') selectOA1: MatSelect;
  @ViewChild('select_PubType1') selectPubType1: MatSelect;

  constructor(private statService: StatisticsService, private router: Router, private formBuilder: FormBuilder,
    private instService: InstituteService, private publisherService: PublisherService, private contractService: ContractService,
    private oaService: OACategoryService, private pubTypeService: PublicationTypeService, private _snackBar: MatSnackBar) { }

  ngOnInit(): void {
    let ob$: Observable<any> = this.updateChart();
    ob$ = merge(ob$, this.instService.getAll().pipe(map(
      data => {
        this.institutes = data.sort((a, b) => a.label.localeCompare(b.label));
        this.institutes.push({ label: 'Unbekannt' })
        this.filtered_institutes = this.form.get('institute').valueChanges.pipe(
          startWith(''),
          map(value => this._filterInst(value || '')),
        );
        this.filtered_institutes1 = this.formHighlight.get('institute').valueChanges.pipe(
          startWith(''),
          map(value => this._filterInst(value || '')),
        );
      })))

    ob$ = merge(ob$, this.publisherService.getAll().pipe(map(
      data => {
        this.publishers = data.sort((a, b) => a.label.localeCompare(b.label));
        this.publishers.push({ label: 'Unbekannt' })
        this.filtered_publishers = this.form.get('publisher').valueChanges.pipe(
          startWith(''),
          map(value => this._filterPublisher(value || '')),
        );
        this.filtered_publishers1 = this.formHighlight.get('publisher').valueChanges.pipe(
          startWith(''),
          map(value => this._filterPublisher(value || '')),
        );
      })));
    ob$ = merge(ob$, this.contractService.getAll().pipe(map(
      data => {
        this.contracts = data.sort((a, b) => a.label.localeCompare(b.label));
        this.contracts.push({ label: 'Unbekannt', publisher: null })
        this.filtered_contracts = this.form.get('contract').valueChanges.pipe(
          startWith(''),
          map(value => this._filterContract(value || '')),
        );
        this.filtered_contracts1 = this.formHighlight.get('contract').valueChanges.pipe(
          startWith(''),
          map(value => this._filterContract(value || '')),
        );
      })));
    ob$ = merge(ob$, this.oaService.getAll().pipe(map(
      data => {
        this.oa_cats = data.sort((a, b) => a.label.localeCompare(b.label));
        this.oa_cats.push({ label: 'Unbekannt', is_oa: null })
      })));
    ob$ = merge(ob$, this.pubTypeService.getAll().pipe(map(
      data => {
        this.pub_types = data.sort((a, b) => a.label.localeCompare(b.label));
        this.pub_types.push({ label: 'Unbekannt', review: null })
      })));
    ob$.subscribe({
      error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  onChartInstance(id: string, chart: Highcharts.Chart) {
    this.charts.set(id, chart);
  }

  updateChart() {
    this.chartOptions1.series = []
    this.chartOptions2.series = []
    let ob$ = this.statService.countPubByYear(this.filter, this.highlight).pipe(map(
      data => {
        data = data.filter(e => e.pub_year)
        this.chartOptions.series = [{
          name: 'Anzahl Publikationen',
          type: 'column',
          events: {
            click: this.chooseYear.bind(this)
          },
          data: data.map(e => {
            return {
              x: e.pub_year,
              y: Number.isFinite(e.highlight) ? e.count - e.highlight : e.count
            }
          })
        }]
        if (Number.isFinite(data[0]?.highlight)) {
          this.chartOptions.series.push({
            name: 'Highlight',
            type: 'column',
            events: {
              click: this.chooseYear.bind(this)
            },
            data: data.map(e => {
              return {
                x: e.pub_year,
                y: e.highlight
              }
            })
          })
        }
        this.charts.get('count')?.update(this.chartOptions, true, true);
      }))
    ob$ = merge(ob$, this.statService.countPubByYearAndOACat(this.filter).pipe(map(
      data => {
        data = data.filter(e => e.pub_year)
        let oa_cats = [...new Set(data.map(e => e.oa_category))]
        for (let oaCat of oa_cats) {
          let series = {
            name: oaCat,
            type: 'column' as 'xrange',
            events: {
              click: this.chooseYear.bind(this)
            },
            data: data.filter(e => e.oa_category === oaCat).map(e => {
              return {
                x: e.pub_year,
                y: e.count
              }
            }
            )
          }
          this.chartOptions1.series.push(series)
        }
        this.charts.get('oa_cat')?.update(this.chartOptions1, true, true);
      })))
    ob$ = merge(ob$, this.statService.countPubByYearAndPubType(this.filter).pipe(map(
      data => {
        data = data.filter(e => e.pub_year)
        let oa_cats = [...new Set(data.map(e => e.pub_type))]
        for (let oaCat of oa_cats) {
          let series = {
            name: oaCat,
            type: 'column' as 'xrange',
            events: {
              click: this.chooseYear.bind(this)
            },
            data: data.filter(e => e.pub_type === oaCat).map(e => {
              return {
                x: e.pub_year,
                y: e.count
              }
            }
            )
          }
          this.chartOptions2.series.push(series)
        }
        this.charts.get('pub_type')?.update(this.chartOptions2, true, true);
      })))
    return ob$.pipe(catchError((e, c) => { return of(console.log(e.message)) }));
  }

  chooseYear(event) {
    this.router.navigateByUrl('statistics/' + event.point.category)
  }

  action() {
    if (this.form.get('corresponding').value) this.filter = { ...this.filter, corresponding: true }
    if (this.form.get('locked').value) this.filter = { ...this.filter, locked: true }
    if (!this.form.get('institute').value) this.filter = { ...this.filter, instituteId: undefined }
    if (!this.form.get('publisher').value) this.filter = { ...this.filter, publisherId: undefined }
    if (!this.form.get('contract').value) this.filter = { ...this.filter, contractId: undefined }
    this.updateChart().subscribe();
  }

  actionHighlight() {
    if (this.formHighlight.get('corresponding').value) this.highlight = { ...this.highlight, corresponding: true }
    else this.highlight = { ...this.highlight, corresponding: undefined }
    if (this.formHighlight.get('locked').value) this.highlight = { ...this.highlight, locked: true }
    else this.highlight = { ...this.highlight, locked: undefined }
    if (!this.formHighlight.get('institute').value) this.highlight = { ...this.highlight, instituteId: undefined }
    if (!this.formHighlight.get('publisher').value) this.highlight = { ...this.highlight, publisherId: undefined }
    if (!this.formHighlight.get('contract').value) this.highlight = { ...this.highlight, contractId: undefined }
    this.updateChart().subscribe();
  }

  reset() {
    this.filter = {};
    this.form.reset();
    this.selectOA.value = null;
    this.selectPubType.value = null;
  }

  resetHighlight() {
    this.highlight = {};
    this.formHighlight.reset();
    this.selectOA1.value = null;
    this.selectPubType1.value = null;
  }

  selectedInst(event: MatAutocompleteSelectedEvent): void {
    let id = this.institutes.find(e => e.label === event.option.value).id
    if (!id) id = null;
    this.filter = { ...this.filter, instituteId: [id] }
  }
  selectedPublisher(event: MatAutocompleteSelectedEvent): void {
    let id = this.publishers.find(e => e.label === event.option.value).id
    if (!id) id = null;
    this.filter = { ...this.filter, publisherId: [id] }
  }
  selectedContract(event: MatAutocompleteSelectedEvent): void {
    let id = this.contracts.find(e => e.label === event.option.value).id
    if (!id) id = null;
    this.filter = { ...this.filter, contractId: [id] }
  }
  changeOA(event) {
    let id = this.oa_cats.find(e => e.label === event.value).id
    if (!id) id = null;
    this.filter = { ...this.filter, oaCatId: [id] }
  }
  changePubType(event) {
    let id = this.pub_types.find(e => e.label === event.value).id
    if (!id) id = null;
    this.filter = { ...this.filter, pubTypeId: [id] }
  }


  selectedInst1(event: MatAutocompleteSelectedEvent): void {
    let id = this.institutes.find(e => e.label === event.option.value).id
    if (!id) id = null;
    this.highlight = { ...this.highlight, instituteId: id }
  }
  selectedPublisher1(event: MatAutocompleteSelectedEvent): void {
    let id = this.publishers.find(e => e.label === event.option.value).id
    if (!id) id = null;
    this.highlight = { ...this.highlight, publisherId: id }
  }
  selectedContract1(event: MatAutocompleteSelectedEvent): void {
    let id = this.contracts.find(e => e.label === event.option.value).id
    if (!id) id = null;
    this.highlight = { ...this.highlight, contractId: id }
  }
  changeOA1(event) {
    let id = this.oa_cats.find(e => e.label === event.value).id
    if (!id) id = null;
    this.highlight = { ...this.highlight, oaCatId: id }
  }
  changePubType1(event) {
    let id = this.pub_types.find(e => e.label === event.value).id
    if (!id) id = null;
    this.highlight = { ...this.highlight, pubTypeId: id }
  }

  private _filterInst(value: string): Institute[] {
    const filterValue = value.toLowerCase();
    return this.institutes.filter(pub => pub?.label.toLowerCase().includes(filterValue) || pub?.short_label?.toLowerCase().includes(filterValue));
  }
  private _filterPublisher(value: string): Publisher[] {
    const filterValue = value.toLowerCase();
    return this.publishers.filter(pub => pub?.label.toLowerCase().includes(filterValue));
  }
  private _filterContract(value: string): Contract[] {
    const filterValue = value.toLowerCase();
    return this.contracts.filter(pub => pub?.label.toLowerCase().includes(filterValue));
  }

  getLink() {
    return '/statistics'
  }

  getLabel() {
    return '/Berichte'
  }
}
