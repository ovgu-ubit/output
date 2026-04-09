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

type LookupOption = {
  id: number,
  label: string
};

type FilterChip = {
  text: string,
  key: keyof FilterOptions,
  id?: number | null
};

type ChartBinding = {
  options: EChartsCoreOption,
  legendSeriesName?: string
};

type IncludedIdFilterKey = 'instituteId' | 'oaCatId' | 'contractId' | 'pubTypeId' | 'publisherId';
type ExcludedIdFilterKey = 'notInstituteId' | 'notOaCatId' | 'notContractId' | 'notPubTypeId' | 'notPublisherId';

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
  private readonly eChartToolbox = {
    top: 8,
    right: 12,
    itemSize: 16,
    iconStyle: {
      borderColor: this.chartTextColor
    },
    emphasis: {
      iconStyle: {
        borderColor: this.chartTextColor
      }
    },
    feature: {
      saveAsImage: {
        show: true,
        title: 'Als Bild speichern',
        pixelRatio: 2,
        backgroundColor: this.chartBackgroundColor,
        connectedBackgroundColor: this.chartBackgroundColor,
        excludeComponents: ['toolbox']
      }
    }
  };

  eChartOptionsDefault: EChartsCoreOption = {
    backgroundColor: this.chartBackgroundColor,
    animationDuration: 300,
    title: this.eChartTitle,
    toolbox: this.eChartToolbox,
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

  charts: ChartBinding[] = [];
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

  institutes: LookupOption[] = [];
  oaCategories: LookupOption[] = [];
  publishers: LookupOption[] = [];
  contracts: LookupOption[] = [];
  publicationTypes: LookupOption[] = [];

  filter: FilterOptions = {};
  filterChips: FilterChip[] = [];

  constructor(private route: ActivatedRoute, private statService: StatisticsService, private _snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.year = Number(this.route.snapshot.paramMap.get('year'));
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
        this.oaCategories = data.map(entry => ({ id: entry.id, label: entry.oa_cat }));
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
        this.publishers = data.map(entry => ({ id: entry.id, label: entry.publisher }));
        this.publisherData = this.sortChartData(data.map(entry => ({
          name: entry.publisher ? entry.publisher : 'Unbekannt',
          value: Number(entry.value)
        })));
        this.refreshChartOptions();
      })));

    ob$ = merge(ob$, this.statService.pub_type(this.year, costs, this.filter).pipe(map(
      data => {
        this.publicationTypes = data.map(entry => ({ id: entry.id, label: entry.pub_type }));
        this.publicationTypeData = this.sortChartData(data.map(entry => ({
          name: entry.pub_type ? entry.pub_type : 'Unbekannt',
          value: Number(entry.value)
        })));
        this.refreshChartOptions();
      })));

    ob$ = merge(ob$, this.statService.contract(this.year, costs, this.filter).pipe(map(
      data => {
        this.contracts = data.map(entry => ({ id: entry.id, label: entry.contract }));
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

  onChartLegendSelectChanged(seriesName: string | undefined, event: ChartLegendSelectChangedEvent) {
    if (!seriesName || this.chartDisplayMode !== 'pie') {
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

  applyFilter(seriesName: string, categoryName: string) {
    if (seriesName === 'Art' && categoryName === 'sonstige') {
      return;
    }

    const chip = this.applyBooleanFilter(seriesName, categoryName)
      ?? this.applyIncludedLookupFilter(seriesName, categoryName);

    if (!chip || !this.upsertFilterChip(chip)) {
      return;
    }

    this.loadData(this.costs);
  }

  applyAntiFilter(seriesName: string, categoryName: string) {
    if (seriesName === 'Art' && categoryName === 'sonstige') {
      return;
    }

    if (seriesName === 'Gesperrt') {
      return;
    }

    const chip = this.applyBooleanAntiFilter(seriesName, categoryName)
      ?? this.applyExcludedLookupFilter(seriesName, categoryName);

    if (!chip || !this.upsertFilterChip(chip)) {
      return;
    }

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

  removeFilter(elem: FilterChip) {
    if (elem.key.toString().startsWith('not')) {
      const remainingIds = ((this.filter[elem.key] as (number | null)[] | undefined) ?? [])
        .filter(id => id !== elem.id);

      if (remainingIds.length > 0) {
        this.filter = { ...this.filter, [elem.key]: remainingIds } as FilterOptions;
      }
      else {
        this.clearFilterKey(elem.key);
      }

      this.filterChips = this.filterChips.filter(chip => !(chip.key === elem.key && chip.id === elem.id));
    } else {
      this.clearFilterKey(elem.key);
      this.filterChips = this.filterChips.filter(chip => chip.key !== elem.key);
    }

    this.loadData(this.costs);
  }

  private applyBooleanFilter(seriesName: string, categoryName: string): FilterChip | undefined {
    if (seriesName === 'Art') {
      if (categoryName === 'Corresponding') {
        this.filter = { ...this.filter, corresponding: true };
      } else if (categoryName === 'Keine Person der Einrichtung') {
        this.filter = { ...this.filter, corresponding: false };
      } else {
        return undefined;
      }

      return { text: `${seriesName}: ${categoryName}`, key: 'corresponding' };
    }

    if (seriesName === 'Gesperrt') {
      this.filter = { ...this.filter, locked: categoryName === 'Gesperrt' };
      return { text: `${seriesName}: ${categoryName}`, key: 'locked' };
    }

    return undefined;
  }

  private applyBooleanAntiFilter(seriesName: string, categoryName: string): FilterChip | undefined {
    if (seriesName !== 'Art') {
      return undefined;
    }

    if (categoryName.toLowerCase() === 'corresponding') {
      this.filter = { ...this.filter, corresponding: false };
    } else if (categoryName === 'Keine Person der Einrichtung') {
      this.filter = { ...this.filter, corresponding: true };
    } else {
      return undefined;
    }

    return { text: `${seriesName}: !${categoryName}`, key: 'corresponding' };
  }

  private applyIncludedLookupFilter(seriesName: string, categoryName: string): FilterChip | undefined {
    const key = this.getIncludedIdFilterKey(seriesName);
    const lookupOptions = this.getLookupOptions(seriesName);
    const id = this.findLookupId(lookupOptions, categoryName);

    if (!key || !lookupOptions || (categoryName !== 'Unbekannt' && id === undefined)) {
      return undefined;
    }

    this.filter = { ...this.filter, [key]: [id ?? null] } as FilterOptions;
    return { text: `${seriesName}: ${categoryName}`, key };
  }

  private applyExcludedLookupFilter(seriesName: string, categoryName: string): FilterChip | undefined {
    const key = this.getExcludedIdFilterKey(seriesName);
    const lookupOptions = this.getLookupOptions(seriesName);
    const id = this.findLookupId(lookupOptions, categoryName);

    if (!key || !lookupOptions || (categoryName !== 'Unbekannt' && id === undefined)) {
      return undefined;
    }

    const currentIds = ((this.filter[key] as (number | null)[] | undefined) ?? []);
    if (currentIds.includes(id ?? null)) {
      return undefined;
    }

    this.filter = { ...this.filter, [key]: [...currentIds, id ?? null] } as FilterOptions;
    return { text: `${seriesName}: !${categoryName}`, key, id: id ?? null };
  }

  private getLookupOptions(seriesName: string): LookupOption[] | undefined {
    if (seriesName === 'Institut') {
      return this.institutes;
    }

    if (seriesName === 'OA-Kategorie') {
      return this.oaCategories;
    }

    if (seriesName === 'Verlag') {
      return this.publishers;
    }

    if (seriesName === 'Publikationsart') {
      return this.publicationTypes;
    }

    if (seriesName === 'Vertrag') {
      return this.contracts;
    }

    return undefined;
  }

  private getIncludedIdFilterKey(seriesName: string): IncludedIdFilterKey | undefined {
    if (seriesName === 'Institut') {
      return 'instituteId';
    }

    if (seriesName === 'OA-Kategorie') {
      return 'oaCatId';
    }

    if (seriesName === 'Verlag') {
      return 'publisherId';
    }

    if (seriesName === 'Publikationsart') {
      return 'pubTypeId';
    }

    if (seriesName === 'Vertrag') {
      return 'contractId';
    }

    return undefined;
  }

  private getExcludedIdFilterKey(seriesName: string): ExcludedIdFilterKey | undefined {
    if (seriesName === 'Institut') {
      return 'notInstituteId';
    }

    if (seriesName === 'OA-Kategorie') {
      return 'notOaCatId';
    }

    if (seriesName === 'Verlag') {
      return 'notPublisherId';
    }

    if (seriesName === 'Publikationsart') {
      return 'notPubTypeId';
    }

    if (seriesName === 'Vertrag') {
      return 'notContractId';
    }

    return undefined;
  }

  private findLookupId(lookupOptions: LookupOption[] | undefined, categoryName: string): number | null | undefined {
    if (categoryName === 'Unbekannt') {
      return null;
    }

    return lookupOptions?.find(option => option.label === categoryName)?.id;
  }

  private upsertFilterChip(chip: FilterChip): boolean {
    if (chip.key.toString().startsWith('not')) {
      if (this.filterChips.some(existing => existing.key === chip.key && existing.id === chip.id)) {
        return false;
      }

      this.filterChips = [...this.filterChips, chip];
      return true;
    }

    this.filterChips = [...this.filterChips.filter(existing => existing.key !== chip.key), chip];
    return true;
  }

  private clearFilterKey(key: keyof FilterOptions) {
    const nextFilter = { ...this.filter };
    delete nextFilter[key];
    this.filter = nextFilter;
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
    this.charts = [
      { options: this.eChartOptionsLocked },
      { options: this.eChartOptions },
      { options: this.eChartOptionsInstitute, legendSeriesName: 'Institut' },
      { options: this.eChartOptionsOACat, legendSeriesName: 'OA-Kategorie' },
      { options: this.eChartOptionsPublisher, legendSeriesName: 'Verlag' },
      { options: this.eChartOptionsPubType, legendSeriesName: 'Publikationsart' },
      { options: this.eChartOptionsContract, legendSeriesName: 'Vertrag' }
    ];
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
