import { Component, OnInit } from '@angular/core';
import { StatisticsService } from 'src/app/services/statistics.service';
import * as Highcharts from 'highcharts';
import exporting from 'highcharts/modules/exporting';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Institute } from '../../../../../output-interfaces/Publication';
import { Observable, map, startWith } from 'rxjs';
import { FilterOptions, HighlightOptions } from "../../../../../output-interfaces/Statistics"
import { InstituteService } from 'src/app/services/entities/institute.service';

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
    corresponding: ['']
  });
  formHighlight:FormGroup = this.formBuilder.group({
    corresponding: ['']
  });
  institutes: Institute[];
  filtered_institutes: Observable<Institute[]>;
  filter: FilterOptions = {};
  highlight: HighlightOptions = {};
  highlightName: string;

  constructor(private statService: StatisticsService, private router:Router, private formBuilder:FormBuilder, private instService:InstituteService) { }

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
  }

  resetHighlight() {
    this.highlight = {};
    this.formHighlight.reset();
  }
  
  selectedInst(event: MatAutocompleteSelectedEvent): void {
    this.filter = {...this.filter, instituteId: this.institutes.find(e => e.label === event.option.value).id}
  }

  private _filterInst(value: string): Institute[] {
    const filterValue = value.toLowerCase();

    return this.institutes.filter(pub => pub?.label.toLowerCase().includes(filterValue) || pub?.short_label?.toLowerCase().includes(filterValue));
  }

  getLink() {
    return '/statistics'
  }

  getLabel() {
    return '/Berichte'
  }
}
