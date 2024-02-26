import { Component, OnInit, ViewChild } from '@angular/core';
import { StatisticsService } from 'src/app/services/statistics.service';
import * as Highcharts from 'highcharts';
import exporting from 'highcharts/modules/exporting';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Contract, Institute, OA_Category, PublicationType, Publisher } from '../../../../../output-interfaces/Publication';
import { Observable, map, startWith } from 'rxjs';
import { FilterOptions, HighlightOptions } from "../../../../../output-interfaces/Statistics"
import { InstituteService } from 'src/app/services/entities/institute.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {

  Highcharts: typeof Highcharts = Highcharts; // required
  chartConstructor: string = 'chart'; // 'chart'|'stockChart'|'mapChart'|'ganttChart'
  chartOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      plotBorderWidth: null,
      plotShadow: false,      
    },
    title: {
      text: 'Anzahl Publikationen nach Jahr'
    },
    xAxis: {
      title: { text: 'Erscheinungsjahr' }
    }, yAxis: {
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
  chartCallback: Highcharts.ChartCallbackFunction = function (chart) { return null } // function after chart is created
  updateFlag: boolean = false; // set to true if you wish to update the chart
  oneToOneFlag: boolean = true; // changing number of series
  runOutsideAngular: boolean = false; // optional boolean, defaults to false

  form:FormGroup = this.formBuilder.group({
    institute: [''],
    publisher: [''],
    contract: [''],
    corresponding: ['']
  });
  formHighlight:FormGroup = this.formBuilder.group({
    corresponding: ['']
  });
  institutes: Institute[];
  publishers: Publisher[];
  contracts: Contract[];
  oa_cats: OA_Category[];
  pub_types: PublicationType[];
  filtered_institutes: Observable<Institute[]>;
  filtered_publishers: Observable<Publisher[]>;
  filtered_contracts: Observable<Contract[]>;
  filter: FilterOptions = {};
  highlight: HighlightOptions = {};
  highlightName: string;

  @ViewChild('select_oa') selectOA: MatSelect;
  @ViewChild('select_PubType') selectPubType: MatSelect;

  constructor(private statService: StatisticsService, private router:Router, private formBuilder:FormBuilder, 
    private instService:InstituteService, private publisherService:PublisherService, private contractService:ContractService,
    private oaService:OACategoryService, private pubTypeService:PublicationTypeService) { }

  ngOnInit(): void {
    exporting(Highcharts);
    this.updateChart();
    this.instService.getinstitutes().subscribe({
      next: data => {
        this.institutes = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_institutes = this.form.get('institute').valueChanges.pipe(
          startWith(''),
          map(value => this._filterInst(value || '')),
        );
      }
    })
    this.publisherService.getPublishers().subscribe({
      next: data => {
        this.publishers = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_publishers = this.form.get('publisher').valueChanges.pipe(
          startWith(''),
          map(value => this._filterPublisher(value || '')),
        );
      }
    })
    this.contractService.getContracts().subscribe({
      next: data => {
        this.contracts = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_contracts = this.form.get('contract').valueChanges.pipe(
          startWith(''),
          map(value => this._filterContract(value || '')),
        );
      }
    })
    this.oaService.getOACategories().subscribe({
      next: data => {
        this.oa_cats = data.sort((a, b) => a.label.localeCompare(b.label));
      }
    })
    this.pubTypeService.getPubTypes().subscribe({
      next: data => {
        this.pub_types = data.sort((a, b) => a.label.localeCompare(b.label));
      }
    })
  }

  updateChart() {
    this.statService.countPubByYear(this.filter, this.highlight).subscribe({
      next: data => {
        this.chartOptions.series = [{
          name: 'Anzahl Publikationen',
          type: 'column',
          events: {
            click: this.chooseYear.bind(this)
          },
          data: data.map(e => {
            return {
              x: e.pub_year,
              y: Number.isFinite(e.highlight)? e.count - e.highlight : e.count
            }
          })
        }]
        if (Number.isFinite(data[0]?.highlight)) {
          this.chartOptions.series.push({
            name: 'Highlight: '+this.highlightName,
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
        this.updateFlag = true;
      }
    })
  }

  chooseYear(event) {
    this.router.navigateByUrl('statistics/'+event.point.category)
  }

  action() {
    this.updateChart();
  }

  actionHighlight() {
    if (this.formHighlight.get('corresponding').value) {
      this.highlight = {corresponding: true};
      this.highlightName = 'corresponding'
    }
    this.updateChart();
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
  }
  
  selectedInst(event: MatAutocompleteSelectedEvent): void {
    this.filter = {...this.filter, instituteId: this.institutes.find(e => e.label === event.option.value).id}
  }
  selectedPublisher(event: MatAutocompleteSelectedEvent): void {
    this.filter = {...this.filter, publisherId: this.publishers.find(e => e.label === event.option.value).id}
  }
  selectedContract(event: MatAutocompleteSelectedEvent): void {
    this.filter = {...this.filter, contractId: this.contracts.find(e => e.label === event.option.value).id}
  }
  changeOA(event) {
    this.filter = {...this.filter, oaCatId: this.oa_cats.find(e => e.label === event.value).id}
  }
  changePubType(event) {
    this.filter = {...this.filter, pubTypeId: this.pub_types.find(e => e.label === event.value).id}
  }

  private _filterInst(value: string): Institute[] {
    const filterValue = value.toLowerCase();
    return this.institutes.filter(pub => pub?.label.toLowerCase().includes(filterValue) || pub?.short_label?.toLowerCase().includes(filterValue));
  }
  private _filterPublisher(value: string): Publisher[] {
    const filterValue = value.toLowerCase();
    return this.publishers.filter(pub => pub?.label.toLowerCase().includes(filterValue) || pub?.location?.toLowerCase().includes(filterValue));
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
