import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, catchError, map, merge, of, startWith } from 'rxjs';
import { ContractService } from 'src/app/services/entities/contract.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { StatisticsService } from 'src/app/statistics/statistics.service';
import { Contract, Institute, OA_Category, PublicationType, Publisher } from '../../../../../../output-interfaces/Publication';
import { FilterOptions, HighlightOptions } from '../../../../../../output-interfaces/Statistics';
import { EChartsCoreOption } from 'echarts/core';

type PercentageSeriesPoint = {
  value: number,
  count: number,
  percentage: number
};

@Component({
    selector: 'app-statistics',
    templateUrl: './statistics.component.html',
    styleUrls: ['./statistics.component.css'],
    standalone: false
})
export class StatisticsComponent implements OnInit {
  private readonly chartStyles = window.getComputedStyle(document.body);
  private readonly chartBackgroundColor = this.chartStyles.getPropertyValue('background-color').trim();
  private readonly chartTextColor = this.chartStyles.getPropertyValue('color').trim() || '#333333';
  private readonly eChartCountColor = '#7cb5ec';
  private readonly eChartHighlightColor = '#434348';
  private readonly oaCategoryOrder = ['Green', 'Gold', 'Diamond', 'Bronze', 'Closed', 'Hybrid'];
  private readonly oaCategoryColors: Record<string, string> = {
    green: '#2e8b57',
    gold: '#ffd700',
    diamond: '#b9f2ff',
    bronze: '#cd7f32',
    closed: '#000000',
    hybrid: '#808080'
  };
  private readonly eChartTitle = {
    left: 'center',
    textStyle: {
      color: this.chartTextColor,
      fontSize: 16,
      fontWeight: 'bold'
    }
  };
  private readonly eChartLegend = {
    top: 36,
    textStyle: {
      color: this.chartTextColor
    }
  };
  private readonly eChartXAxis = {
    type: 'category' as const,
    name: 'Erscheinungsjahr',
    nameLocation: 'middle' as const,
    nameGap: 36,
    axisTick: {
      alignWithLabel: true
    },
    axisLine: {
      lineStyle: {
        color: '#ccd6eb'
      }
    },
    axisLabel: {
      color: this.chartTextColor
    },
    nameTextStyle: {
      color: this.chartTextColor
    }
  };
  private readonly eChartYAxis = {
    type: 'value' as const,
    name: 'Anzahl',
    nameLocation: 'middle' as const,
    nameGap: 55,
    min: 0,
    minInterval: 1,
    axisLabel: {
      color: this.chartTextColor
    },
    nameTextStyle: {
      color: this.chartTextColor
    },
    splitLine: {
      lineStyle: {
        color: '#e6e6e6'
      }
    }
  };

  eChartOptionsDefault: EChartsCoreOption = {
    backgroundColor: this.chartBackgroundColor,
    animationDuration: 300,
    title: this.eChartTitle,
    legend: this.eChartLegend,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      top: 88,
      right: 24,
      bottom: 60,
      left: 24,
      containLabel: true
    },
    xAxis: this.eChartXAxis,
    yAxis: this.eChartYAxis,
    series: []
  };
  eChartOptions: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anzahl Publikationen nach Jahr'
    },
  };
  eChartOptions1: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil Publikationen nach Jahr und OA-Kategorie'
    },
  };
  eChartOptions2: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil Publikationen nach Jahr und Publikationsart'
    },
  };

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

  updateChart() {
    let ob$ = this.statService.countPubByYear(this.filter, this.highlight).pipe(map(
      data => {
        data = data.filter(e => e.pub_year)
        this.eChartOptions = this.createCountEChartOptions(data);
      }))
    ob$ = merge(ob$, this.statService.countPubByYearAndOACat(this.filter).pipe(map(
      data => {
        data = data.filter(e => e.pub_year)
        this.eChartOptions1 = this.createOACategoryEChartOptions(data);
      })))
    ob$ = merge(ob$, this.statService.countPubByYearAndPubType(this.filter).pipe(map(
      data => {
        data = data.filter(e => e.pub_year)
        this.eChartOptions2 = this.createPublicationTypeEChartOptions(data);
      })))
    return ob$.pipe(catchError((e, c) => { return of(console.log(e.message)) }));
  }

  chooseEChartYear(event: { name?: string | number }) {
    const year = Number(event.name);
    if (!Number.isFinite(year)) {
      return;
    }

    this.router.navigateByUrl('statistics/' + year);
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

  private createCountEChartOptions(data: { pub_year: number, count: number, highlight?: number }[]): EChartsCoreOption {
    const categories = data.map(entry => entry.pub_year.toString());
    const totals = data.map(entry => entry.count);
    const baseSeriesData = data.map(entry => Number.isFinite(entry.highlight) ? entry.count - entry.highlight : entry.count);
    const hasHighlight = data.some(entry => Number.isFinite(entry.highlight));
    const series = [];

    if (hasHighlight) {
      series.push({
        name: 'Highlight',
        type: 'bar',
        stack: 'total',
        itemStyle: {
          color: this.eChartHighlightColor
        },
        emphasis: {
          focus: 'series'
        },
        data: data.map(entry => Number.isFinite(entry.highlight) ? entry.highlight : 0),
        label: {
          show: false
        }
      });
    }

    series.push({
      name: 'Anzahl Publikationen',
      type: 'bar',
      stack: 'total',
      itemStyle: {
        color: this.eChartCountColor
      },
      emphasis: {
        focus: 'series'
      },
      data: baseSeriesData,
      label: {
        show: true,
        position: 'top',
        formatter: ({ dataIndex }: { dataIndex: number }) => `${totals[dataIndex]}`
      }
    });

    return {
      ...this.eChartOptionsDefault,
      title: {
        ...this.eChartTitle,
        text: 'Anzahl Publikationen nach Jahr'
      },
      legend: {
        ...this.eChartLegend,
        data: ['Anzahl Publikationen', 'Highlight'],
        show: hasHighlight
      },
      xAxis: {
        ...this.eChartXAxis,
        data: categories
      },
      series
    };
  }

  private createOACategoryEChartOptions(data: { pub_year: number, count: number, oa_category: string }[]): EChartsCoreOption {
    return this.createPercentageStackedEChartOptions(
      'Anteil Publikationen nach Jahr und OA-Kategorie',
      data,
      entry => entry.oa_category,
      (left, right) => this.compareOACategories(left, right),
      category => this.getOACategoryColor(category)
    );
  }

  private createPublicationTypeEChartOptions(data: { pub_year: number, count: number, pub_type: string }[]): EChartsCoreOption {
    return this.createPercentageStackedEChartOptions(
      'Anteil Publikationen nach Jahr und Publikationsart',
      data,
      entry => entry.pub_type
    );
  }

  private createPercentageStackedEChartOptions<T extends { pub_year: number, count: number }>(
    title: string,
    data: T[],
    getSeriesName: (entry: T) => string,
    sortSeriesNames?: (left: string, right: string) => number,
    getColor?: (seriesName: string) => string | undefined
  ): EChartsCoreOption {
    const years = [...new Set(data.map(entry => entry.pub_year))].sort((a, b) => a - b);
    const categories = years.map(year => year.toString());
    const totalsByYear = new Map<number, number>();

    for (const year of years) {
      totalsByYear.set(
        year,
        data.filter(entry => entry.pub_year === year).reduce((sum, entry) => sum + Number(entry.count), 0)
      );
    }

    const seriesNames = [...new Set(data.map(entry => getSeriesName(entry)))];
    if (sortSeriesNames) {
      seriesNames.sort(sortSeriesNames);
    }

    const series = seriesNames.map(seriesName => ({
      name: seriesName,
      type: 'bar',
      stack: 'total',
      itemStyle: getColor?.(seriesName) ? { color: getColor(seriesName) } : undefined,
      emphasis: {
        focus: 'series'
      },
      label: {
        show: true,
        position: 'inside',
        formatter: ({ data: point }: { data?: PercentageSeriesPoint }) => point?.count ? `${point.count}` : ''
      },
      data: years.map(year => {
        const entry = data.find(item => item.pub_year === year && getSeriesName(item) === seriesName);
        const count = Number(entry?.count ?? 0);
        const total = totalsByYear.get(year) ?? 0;
        const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;

        return {
          value: percentage,
          count,
          percentage
        };
      })
    }));

    return {
      ...this.eChartOptionsDefault,
      title: {
        ...this.eChartTitle,
        text: title
      },
      legend: {
        ...this.eChartLegend,
        data: seriesNames,
        show: seriesNames.length > 0
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: {
          seriesName: string,
          color?: string,
          data?: PercentageSeriesPoint
        }) => {
          const count = params.data?.count ?? 0;
          const percentage = params.data?.percentage ?? 0;
          const color = getColor?.(params.seriesName) ?? params.color ?? this.chartTextColor;
          return `<span style="color:${color}">\u25CF</span> ${params.seriesName}: <b>${count}</b> (${percentage.toFixed(1)}%)`;
        }
      },
      xAxis: {
        ...this.eChartXAxis,
        data: categories
      },
      yAxis: {
        ...this.eChartYAxis,
        max: 100
      },
      series
    };
  }

  private compareOACategories(left: string, right: string): number {
    const leftIndex = this.oaCategoryOrder.findIndex(category => category.toLowerCase() === left?.toLowerCase());
    const rightIndex = this.oaCategoryOrder.findIndex(category => category.toLowerCase() === right?.toLowerCase());

    if (leftIndex >= 0 && rightIndex >= 0) {
      return leftIndex - rightIndex;
    }

    if (leftIndex >= 0) {
      return -1;
    }

    if (rightIndex >= 0) {
      return 1;
    }

    return left.localeCompare(right);
  }

  private getOACategoryColor(category: string): string | undefined {
    return this.oaCategoryColors[category?.toLowerCase()] ?? undefined;
  }
}
