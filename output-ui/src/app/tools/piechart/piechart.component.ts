import { Component, OnInit, Input, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Highcharts from 'highcharts';
import HC_exporting from 'highcharts/modules/exporting';
import HC_offline_exporting from 'highcharts/modules/offline-exporting';
import { Alert } from '../../interfaces/alert';
HC_exporting(Highcharts);
HC_offline_exporting(Highcharts);

@Component({
   selector: 'apppiechart',
   templateUrl: './piechart.component.html',
   styleUrls: ['./piechart.component.css']
})
export class PiechartComponent implements OnInit {

   @Input() title: string;
   @Input() name: string;
   filters: string[];
   @Input() value: string;
   @Input() source: string;

   public ChartData = [];
   public chartOptions: any;
   Highcharts: typeof Highcharts = Highcharts; // required

   @Output() alerts: Alert[] = [];

   loading: boolean;

   constructor(private http: HttpClient) { }

   //https://github.com/highcharts/highcharts-angular
   //https://api.highcharts.com/highcharts/
   public ngOnInit(): void {
      this.loading = true;
      this.ChartData = [];
      this.http.get(this.source, { params: { filters: this.filters } }).subscribe(res => {
         Object.values(res).forEach(value => {
            if (this.value.startsWith('=')) {
               if (this.value.indexOf('/') !== -1) {
                  let elems = this.value.slice(1).split('/')
                  this.ChartData.push([value[this.name], value[elems[0]]/value[elems[1]]])
               }
            }
            else this.ChartData.push([value[this.name], parseFloat(value[this.value])])
         });

         this.chartOptions = {
            chart: {
               plotBorderWidth: null,
               plotShadow: false
            },
            title: {
               text: this.title
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
            series: [{
               type: 'pie',
               name: 'Verlag',
               data: this.ChartData
            }]
         };
         this.loading = false;
      }, (error) => {
         const alert: Alert = {
            type: 'danger',
            message: 'Backend ist nicht erreichbar, bitte melden Sie das Problem der IT, falls es länger auftritt.',
            details: error.message
         }
         this.alerts.push(alert);
      });
   }
}
