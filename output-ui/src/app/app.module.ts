import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortHeaderIntl, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MetaReducer, StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { HighchartsChartModule } from 'highcharts-angular';
import { environment } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EnrichComponent } from './pages/administration/enrich/enrich.component';
import { ExportComponent } from './pages/administration/export/export.component';
import { ImportComponent } from './pages/administration/import/import.component';
import { PlausibilityComponent } from './pages/administration/plausibility/plausibility.component';
import { AuthorsComponent } from './pages/authors/authors.component';
import { ContractsComponent } from './pages/master-data/contracts/contracts.component';
import { CostCenterComponent } from './pages/master-data/cost-center/cost-center.component';
import { CostTypesComponent } from './pages/master-data/cost-types/cost-types.component';
import { FundersComponent } from './pages/master-data/funders/funders.component';
import { GreaterEntitiesComponent } from './pages/master-data/greater-entities/greater-entities.component';
import { InstitutionsComponent } from './pages/master-data/institutions/institutions.component';
import { OaCategoriesComponent } from './pages/master-data/oa-categories/oa-categories.component';
import { PubTypesComponent } from './pages/master-data/pub-types/pub-types.component';
import { PublishersComponent } from './pages/master-data/publishers/publishers.component';
import { PublicationsComponent } from './pages/publications/publications.component';
import { StartComponent } from './pages/start/start.component';
import { StatisticsYearComponent } from './pages/statistics/statistics-year/statistics-year.component';
import { StatisticsComponent } from './pages/statistics/statistics.component';
import { AuthorFormComponent } from './pages/windows/author-form/author-form.component';
import { ContractFormComponent } from './pages/windows/contract-form/contract-form.component';
import { CostCenterFormComponent } from './pages/windows/cost-center-form/cost-center-form.component';
import { CostItemFormComponent } from './pages/windows/cost-item-form/cost-item-form.component';
import { CostTypeFormComponent } from './pages/windows/cost-type-form/cost-type-form.component';
import { FilterViewComponent } from './tools/filter-view/filter-view.component';
import { FunderFormComponent } from './pages/windows/funder-form/funder-form.component';
import { GreaterEntityFormComponent } from './pages/windows/greater-entity-form/greater-entity-form.component';
import { ImportConfigComponent } from './tools/import-config/import-config.component';
import { InstituteFormComponent } from './pages/windows/institute-form/institute-form.component';
import { InvoiceFormComponent } from './pages/windows/invoice-form/invoice-form.component';
import { OaCategoryFormComponent } from './pages/windows/oa-category-form/oa-category-form.component';
import { PubTypeFormComponent } from './pages/windows/pub-type-form/pub-type-form.component';
import { PublicationFormComponent } from './pages/windows/publication-form/publication-form.component';
import { PublisherFormComponent } from './pages/windows/publisher-form/publisher-form.component';
import { ReportingYearFormComponent } from './pages/windows/reporting-year-form/reporting-year-form.component';
import { AuthorizationService } from './security/authorization.service';
import { MatPaginatorDE } from './services/mat-paginator-de';
import { hydrationMetaReducer, viewConfigReducer } from './services/redux';
import { BreadcrumpComponent } from './tools/breadcrump/breadcrump.component';
import { CombineDialogComponent } from './tools/combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent } from './tools/confirm-dialog/confirm-dialog.component';
import { CsvFormatComponent } from './tools/csv-format/csv-format.component';
import { LogDialogComponent } from './tools/log-dialog/log-dialog.component';
import { TableComponent } from './tools/table/table.component';
import { AliasFormComponent } from './tools/alias-form/alias-form.component';
import { AuthorshipFormComponent } from './pages/windows/authorship-form/authorship-form.component';
import { RolesComponent } from './pages/master-data/roles/roles.component';
import { RoleFormComponent } from './pages/windows/role-form/role-form.component';
import { StatusesComponent } from './pages/master-data/statuses/statuses.component';
import { StatusFormComponent } from './pages/windows/status-form/status-form.component';
import { DoiFormComponent } from './pages/windows/doi-form/doi-form.component';
import { AbstractFormComponent } from './pages/windows/abstract-form/abstract-form.component';
import { SelectEntityComponent } from './tools/select-entity/select-entity.component';
import { IdTableComponent } from './tools/id-table/id-table.component';
import { AliasTableComponent } from './tools/alias-table/alias-table.component';
import { SelectAuthorComponent } from './tools/select-author/select-author.component';
import { WindowToolbarComponent } from './tools/window-toolbar/window-toolbar.component';

export const metaReducers: MetaReducer[] = [hydrationMetaReducer];

@NgModule({
    declarations: [
        AppComponent,
        StartComponent,
        PublicationsComponent,
        TableComponent,
        BreadcrumpComponent,
        PublicationFormComponent,
        ConfirmDialogComponent,
        ReportingYearFormComponent,
        CombineDialogComponent,
        FilterViewComponent,
        GreaterEntityFormComponent,
        PublisherFormComponent,
        ContractFormComponent,
        AuthorsComponent,
        AuthorFormComponent,
        InstitutionsComponent,
        InstituteFormComponent,
        ContractsComponent,
        PublishersComponent,
        GreaterEntitiesComponent,
        FundersComponent,
        FunderFormComponent,
        PubTypesComponent,
        PubTypeFormComponent,
        OaCategoriesComponent,
        OaCategoryFormComponent,
        PlausibilityComponent,
        ImportComponent,
        EnrichComponent,
        ExportComponent,
        StatisticsComponent,
        LogDialogComponent,
        ImportConfigComponent,
        CsvFormatComponent,
        StatisticsYearComponent,
        InvoiceFormComponent,
        CostItemFormComponent,
        CostCenterComponent,
        CostTypesComponent,
        CostCenterFormComponent,
        CostTypeFormComponent,
        AliasFormComponent,
        AuthorshipFormComponent,
        RolesComponent,
        RoleFormComponent,
        DoiFormComponent,
        StatusesComponent,
        StatusFormComponent,
        AbstractFormComponent,
        SelectEntityComponent,
        IdTableComponent,
        AliasTableComponent,
        SelectAuthorComponent,
        WindowToolbarComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        MatTableModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatIconModule,
        MatMenuModule,
        MatToolbarModule,
        MatButtonModule,
        MatCheckboxModule,
        MatPaginatorModule,
        MatSortModule,
        MatFormFieldModule,
        FormsModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatMomentDateModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatTooltipModule,
        MatExpansionModule,
        MatSnackBarModule,
        MatAutocompleteModule,
        MatChipsModule,
        MatProgressBarModule,
        MatDividerModule,
        MatCardModule,
        HighchartsChartModule,
        NgbModule,
        StoreModule.forRoot({ viewConfigReducer }, { metaReducers }),
        !environment.production ? StoreDevtoolsModule.instrument({ connectInZone: true }) : []], providers: [
            { provide: MatPaginatorIntl, useClass: MatPaginatorDE },
            { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
            { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
            { provide: AuthorizationService, useClass: environment.authorization_service },
            provideHttpClient(withInterceptorsFromDi())
        ]
})
export class AppModule { }
