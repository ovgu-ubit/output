import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map, merge } from 'rxjs';
import { EChartsCoreOption } from 'echarts/core';
import { StatisticsService } from 'src/app/statistics/statistics.service';
import { FilterOptions } from '../../../../../../output-interfaces/Statistics';

type ChartDisplayMode = 'pie' | 'treemap';

type ChartDatum = {
  name: string,
  value: number,
  itemStyle?: {
    color: string
  }
};

type ChartClickEvent = {
  seriesName?: string,
  name?: string
};

type ChartContextMenuEvent = ChartClickEvent & {
  event?: {
    event?: {
      preventDefault?: () => void,
      stopPropagation?: () => void
    }
  }
};

type ChartLegendSelectChangedEvent = {
  name?: string,
  selected?: Record<string, boolean>
};

type PieLabelParams = {
  name?: string,
  percent?: number
};

type PieTooltipParams = {
  name?: string,
  value?: number,
  percent?: number,
  color?: string
};

type TreemapLabelParams = {
  name?: string
};

type TreemapTooltipParams = {
  name?: string,
  value?: number,
  color?: string
};

@Component({
  selector: 'app-statistics-year',
  templateUrl: './statistics-year.component.html',
  styleUrls: ['./statistics-year.component.css'],
  standalone: false
})
export class StatisticsYearComponent implements OnInit {
  private readonly chartStyles = window.getComputedStyle(document.body);
  private readonly chartBackgroundColor = this.chartStyles.getPropertyValue('background-color').trim();
  private readonly chartTextColor = this.chartStyles.getPropertyValue('color').trim() || '#333333';
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
    top: 8,
    textStyle: {
      color: this.chartTextColor,
      fontSize: 16,
      fontWeight: 'bold'
    }
  };
  private readonly eChartLegend = {
    type: 'scroll' as const,
    orient: 'horizontal' as const,
    left: 16,
    right: 16,
    bottom: 16,
    itemGap: 12,
    textStyle: {
      color: this.chartTextColor
    },
    pageTextStyle: {
      color: this.chartTextColor
    }
  };

  eChartOptionsDefault: EChartsCoreOption = {
    backgroundColor: this.chartBackgroundColor,
    animationDuration: 300,
    title: this.eChartTitle,
    tooltip: {
      trigger: 'item'
    },
    legend: this.eChartLegend,
    series: []
  };
  eChartOptions: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil Corresponding'
    }
  };
  eChartOptionsLocked: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil gesperrt'
    }
  };
  eChartOptionsInstitute: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil Institute (corresponding)'
    }
  };
  eChartOptionsOACat: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil OA-Kategorien'
    }
  };
  eChartOptionsPublisher: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil Verlage'
    }
  };
  eChartOptionsPubType: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil Publikationsarten'
    }
  };
  eChartOptionsContract: EChartsCoreOption = {
    ...this.eChartOptionsDefault,
    title: {
      ...this.eChartTitle,
      text: 'Anteil Verträge'
    }
  };

  chartDisplayMode: ChartDisplayMode = 'pie';
  year: number;
  costs = false;

  correspondingData: ChartDatum[] = [];
  lockedData: ChartDatum[] = [];
  instituteData: ChartDatum[] = [];
  oaCategoryData: ChartDatum[] = [];
  publisherData: ChartDatum[] = [];
  publicationTypeData: ChartDatum[] = [];
  contractData: ChartDatum[] = [];

  institutes: { id: number, label: string }[] = [];
  oa_cats: { id: number, label: string }[] = [];
  publisher: { id: number, label: string }[] = [];
  constracts: { id: number, label: string }[] = [];
  pub_types: { id: number, label: string }[] = [];

  filter: FilterOptions = {};
  filterChips: { text: string, key: string, id?: number }[] = [];

  constructor(private route: ActivatedRoute, private statService: StatisticsService, private _snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.year = parseInt(this.route.snapshot.paramMap.get('year'));
    this.loadData(this.costs);
  }

  loadData(costs: boolean) {
    this.costs = costs;
    let ob$: Observable<any> = this.statService.corresponding(this.year, costs, this.filter).pipe(map(
      data => {
        this.correspondingData = data.map(entry => ({
          name: entry.corresponding === null ? 'Unbekannt' : (entry.corresponding ? 'Corresponding' : 'Keine Person der Einrichtung'),
          value: Number(entry.value)
        }));
        this.refreshChartOptions();
      }));

    ob$ = merge(ob$, this.statService.locked(this.year, this.filter).pipe(map(
      data => {
        this.lockedData = data.map(entry => ({
          name: entry.locked ? 'Gesperrt' : 'Nicht gesperrt',
          value: Number(entry.value)
        }));
        this.refreshChartOptions();
      })));

    ob$ = merge(ob$, this.statService.institute(this.year, costs, this.filter).pipe(map(
      data => {
        this.institutes = data.map(entry => ({ id: entry.id, label: entry.institute }));
        this.instituteData = this.sortChartData(data.map(entry => ({
          name: entry.institute ? entry.institute : 'Unbekannt',
          value: Number(entry.value)
        })));
        this.refreshChartOptions();
      })));

    ob$ = merge(ob$, this.statService.oaCat(this.year, costs, this.filter).pipe(map(
      data => {
        this.oa_cats = data.map(entry => ({ id: entry.id, label: entry.oa_cat }));
        this.oaCategoryData = this.sortChartData(data.map(entry => {
          const color = this.getOACategoryColor(entry.oa_cat);

          return {
            name: entry.oa_cat ? entry.oa_cat : 'Unbekannt',
            value: Number(entry.value),
            itemStyle: color ? { color } : undefined
          };
        })).sort((left, right) => this.compareOACategories(left.name, right.name));
        this.refreshChartOptions();
      })));

    ob$ = merge(ob$, this.statService.publisher(this.year, costs, this.filter).pipe(map(
      data => {
        this.publisher = data.map(entry => ({ id: entry.id, label: entry.publisher }));
        this.publisherData = this.sortChartData(data.map(entry => ({
          name: entry.publisher ? entry.publisher : 'Unbekannt',
          value: Number(entry.value)
        })));
        this.refreshChartOptions();
      })));

    ob$ = merge(ob$, this.statService.pub_type(this.year, costs, this.filter).pipe(map(
      data => {
        this.pub_types = data.map(entry => ({ id: entry.id, label: entry.pub_type }));
        this.publicationTypeData = this.sortChartData(data.map(entry => ({
          name: entry.pub_type ? entry.pub_type : 'Unbekannt',
          value: Number(entry.value)
        })));
        this.refreshChartOptions();
      })));

    ob$ = merge(ob$, this.statService.contract(this.year, costs, this.filter).pipe(map(
      data => {
        this.constracts = data.map(entry => ({ id: entry.id, label: entry.contract }));
        this.contractData = this.sortChartData(data.map(entry => ({
          name: entry.contract ? entry.contract : 'Unbekannt',
          value: Number(entry.value)
        })));
        this.refreshChartOptions();
      })));

    ob$.subscribe({
      error: err => {
        this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        });
        console.log(err);
      }
    });
  }

  setChartDisplayMode(mode: ChartDisplayMode) {
    if (this.chartDisplayMode === mode) {
      return;
    }

    this.chartDisplayMode = mode;
    this.refreshChartOptions();
  }

  onChartClick(event: ChartClickEvent) {
    if (!event.seriesName || !event.name) {
      return;
    }

    this.applyFilter(event.seriesName, event.name);
  }

  onChartContextMenu(event: ChartContextMenuEvent) {
    event.event?.event?.preventDefault?.();
    event.event?.event?.stopPropagation?.();

    if (!event.seriesName || !event.name) {
      return;
    }

    this.applyAntiFilter(event.seriesName, event.name);
  }

  onChartLegendSelectChanged(seriesName: string, event: ChartLegendSelectChangedEvent) {
    if (this.chartDisplayMode !== 'pie') {
      return;
    }

    if (!event.name || event.selected?.[event.name] !== false) {
      return;
    }

    this.applyAntiFilter(seriesName, event.name);
  }

  getLink() {
    return '/statistics/' + this.year;
  }

  getLabel() {
    return '/Berichte/' + this.year;
  }

  applyFilter(series_name: string, cat_name: string) {
    if (series_name === 'Art' && cat_name === 'sonstige') return;
    let key = undefined;
    if (series_name === 'Art') {
      if (cat_name === 'Corresponding') this.filter = { ...this.filter, corresponding: true };
      else if (cat_name === 'Keine Person der Einrichtung') this.filter = { ...this.filter, corresponding: false };
      else return;
      key = 'corresponding';
    }
    if (series_name === 'Gesperrt') {
      if (cat_name === 'Gesperrt') this.filter = { ...this.filter, locked: true };
      else this.filter = { ...this.filter, locked: false };
      key = 'locked';
    }
    if (series_name === 'Institut') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, instituteId: [null] };
      else this.filter = { ...this.filter, instituteId: [this.institutes.find(e => e.label === cat_name)?.id] };
      key = 'instituteId';
    }
    if (series_name === 'OA-Kategorie') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, oaCatId: [null] };
      else this.filter = { ...this.filter, oaCatId: [this.oa_cats.find(e => e.label === cat_name)?.id] };
      key = 'oaCatId';
    }
    if (series_name === 'Vertrag') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, contractId: [null] };
      else this.filter = { ...this.filter, contractId: [this.constracts.find(e => e.label === cat_name)?.id] };
      key = 'contractId';
    }
    if (series_name === 'Publikationsart') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, pubTypeId: [null] };
      else this.filter = { ...this.filter, pubTypeId: [this.pub_types.find(e => e.label === cat_name)?.id] };
      key = 'pubTypeId';
    }
    if (series_name === 'Verlag') {
      if (cat_name === 'Unbekannt') this.filter = { ...this.filter, publisherId: [null] };
      else this.filter = { ...this.filter, publisherId: [this.publisher.find(e => e.label === cat_name)?.id] };
      key = 'publisherId';
    }
    this.filterChips.push({ text: series_name + ': ' + cat_name, key });
    this.loadData(this.costs);
  }

  applyAntiFilter(series_name: string, cat_name: string) {
    if (series_name === 'Art' && cat_name === 'sonstige') return;
    if (series_name === 'Gesperrt') return;
    let key = undefined;
    let id = undefined;
    if (series_name === 'Art') {
      if (cat_name.toLowerCase() === 'corresponding') this.filter = { ...this.filter, corresponding: false };
      else if (cat_name === 'Keine Person der Einrichtung') this.filter = { ...this.filter, corresponding: true };
      else return;
      key = 'corresponding';
    }
    if (series_name === 'Institut') {
      const notInstituteId = this.filter?.notInstituteId ? this.filter.notInstituteId : [];
      if (cat_name === 'Unbekannt') id = null;
      else id = this.institutes.find(e => e.label === cat_name)?.id;
      notInstituteId.push(id);
      this.filter.notInstituteId = notInstituteId;
      key = 'notInstituteId';
    }
    if (series_name === 'OA-Kategorie') {
      const notOaCatId = this.filter?.notOaCatId ? this.filter.notOaCatId : [];
      if (cat_name === 'Unbekannt') id = null;
      else id = this.oa_cats.find(e => e.label === cat_name)?.id;
      notOaCatId.push(id);
      this.filter.notOaCatId = notOaCatId;
      key = 'notOaCatId';
    }
    if (series_name === 'Vertrag') {
      const notContractId = this.filter?.notContractId ? this.filter.notContractId : [];
      if (cat_name === 'Unbekannt') id = null;
      else id = this.constracts.find(e => e.label === cat_name)?.id;
      notContractId.push(id);
      this.filter.notContractId = notContractId;
      key = 'notContractId';
    }
    if (series_name === 'Publikationsart') {
      const notPubTypeId = this.filter?.notPubTypeId ? this.filter.notPubTypeId : [];
      if (cat_name === 'Unbekannt') id = null;
      else id = this.pub_types.find(e => e.label === cat_name)?.id;
      notPubTypeId.push(id);
      this.filter.notPubTypeId = notPubTypeId;
      key = 'notPubTypeId';
    }
    if (series_name === 'Verlag') {
      const notPublisherId = this.filter?.notPublisherId ? this.filter.notPublisherId : [];
      if (cat_name === 'Unbekannt') id = null;
      else id = this.publisher.find(e => e.label === cat_name)?.id;
      notPublisherId.push(id);
      this.filter.notPublisherId = notPublisherId;
      key = 'notPublisherId';
    }
    this.filterChips.push({ text: series_name + ': !' + cat_name, key, id });
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
    if (elem.key.includes('not')) {
      this.filter[elem.key] = this.filter[elem.key].filter(e => e !== elem.id);
      this.filterChips = this.filterChips.filter(e => !(e.key === elem.key && e.id === elem.id));
    }
    else {
      delete this.filter[elem.key];
      this.filterChips = this.filterChips.filter(e => e.key !== elem.key);
    }
    this.loadData(this.costs);
  }

  private refreshChartOptions() {
    const valueSuffix = this.costs ? ' €' : '';

    this.eChartOptions = this.createDistributionEChartOptions('Anteil Corresponding', 'Art', this.correspondingData);
    this.eChartOptionsLocked = this.createDistributionEChartOptions('Anteil gesperrt', 'Gesperrt', this.lockedData);
    this.eChartOptionsInstitute = this.createDistributionEChartOptions('Anteil Institute (corresponding)', 'Institut', this.instituteData, valueSuffix);
    this.eChartOptionsOACat = this.createDistributionEChartOptions('Anteil OA-Kategorien', 'OA-Kategorie', this.oaCategoryData, valueSuffix);
    this.eChartOptionsPublisher = this.createDistributionEChartOptions('Anteil Verlage', 'Verlag', this.publisherData, valueSuffix);
    this.eChartOptionsPubType = this.createDistributionEChartOptions('Anteil Publikationsarten', 'Publikationsart', this.publicationTypeData, valueSuffix);
    this.eChartOptionsContract = this.createDistributionEChartOptions('Anteil Verträge', 'Vertrag', this.contractData, valueSuffix);
  }

  private createDistributionEChartOptions(title: string, seriesName: string, data: ChartDatum[], valueSuffix = ''): EChartsCoreOption {
    if (this.chartDisplayMode === 'treemap') {
      return this.createTreemapEChartOptions(title, seriesName, data, valueSuffix);
    }

    return this.createPieEChartOptions(title, seriesName, data, valueSuffix);
  }

  private createPieEChartOptions(title: string, seriesName: string, data: ChartDatum[], valueSuffix = ''): EChartsCoreOption {
    return {
      ...this.eChartOptionsDefault,
      title: {
        ...this.eChartTitle,
        text: title
      },
      legend: {
        ...this.eChartLegend,
        show: data.length > 0
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: PieTooltipParams) => {
          const value = this.formatValue(Number(params.value ?? 0));
          const percentage = (params.percent ?? 0).toFixed(1);
          const color = params.color ?? this.chartTextColor;

          return `<span style="color:${color}">\u25CF</span> ${params.name}<br><b>${value}${valueSuffix}</b><br>${percentage} %`;
        }
      },
      series: [{
        name: seriesName,
        type: 'pie',
        colorBy: 'data',
        radius: '44%',
        center: ['50%', '36%'],
        minShowLabelAngle: 3,
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: this.chartBackgroundColor,
          borderWidth: 1
        },
        label: {
          show: true,
          color: this.chartTextColor,
          width: 120,
          overflow: 'truncate',
          formatter: (params: PieLabelParams) => `${params.name}: ${(params.percent ?? 0).toFixed(1)} %`
        },
        labelLine: {
          length: 10,
          length2: 8
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        data
      }]
    };
  }

  private createTreemapEChartOptions(title: string, seriesName: string, data: ChartDatum[], valueSuffix = ''): EChartsCoreOption {
    const total = data.reduce((sum, entry) => sum + entry.value, 0);

    return {
      ...this.eChartOptionsDefault,
      title: {
        ...this.eChartTitle,
        text: title
      },
      legend: {
        ...this.eChartLegend,
        show: false
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: TreemapTooltipParams) => {
          const value = Number(params.value ?? 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
          const color = params.color ?? this.chartTextColor;

          return `<span style="color:${color}">\u25CF</span> ${params.name}<br><b>${this.formatValue(value)}${valueSuffix}</b><br>${percentage} %`;
        }
      },
      series: [{
        name: seriesName,
        type: 'treemap',
        roam: false,
        nodeClick: false,
        sort: 'desc',
        breadcrumb: {
          show: false
        },
        top: 48,
        right: 8,
        bottom: 8,
        left: 8,
        label: {
          show: true,
          overflow: 'truncate',
          formatter: (params: TreemapLabelParams) => params.name ?? ''
        },
        upperLabel: {
          show: false
        },
        itemStyle: {
          borderColor: this.chartBackgroundColor,
          borderWidth: 2,
          gapWidth: 2
        },
        emphasis: {
          itemStyle: {
            borderColor: this.chartTextColor
          }
        },
        data: data.map(entry => ({
          id: entry.name,
          name: entry.name,
          value: entry.value,
          itemStyle: entry.itemStyle
        }))
      }]
    };
  }

  private sortChartData(data: ChartDatum[]): ChartDatum[] {
    return data.sort((left, right) => {
      if (left.name === 'Unbekannt') return 1;
      if (right.name === 'Unbekannt') return -1;
      return right.value - left.value;
    });
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

    if (left === 'Unbekannt') {
      return 1;
    }

    if (right === 'Unbekannt') {
      return -1;
    }

    return left.localeCompare(right);
  }

  private getOACategoryColor(category: string): string | undefined {
    return this.oaCategoryColors[category?.toLowerCase()] ?? undefined;
  }

  private formatValue(value: number): string {
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value);
  }
}
