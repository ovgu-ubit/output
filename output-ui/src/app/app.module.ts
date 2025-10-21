import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MetaReducer, StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
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
import { StartComponent } from './pages/start/start.component';
import { AuthorizationService } from './security/authorization.service';
import { hydrationMetaReducer, viewConfigReducer } from './services/redux';
import { RolesComponent } from './pages/master-data/roles/roles.component';
import { StatusesComponent } from './pages/master-data/statuses/statuses.component';
import { TableModule } from './table/table.module';

export const metaReducers: MetaReducer[] = [hydrationMetaReducer];

@NgModule({
    declarations: [
        AppComponent,
        StartComponent,
        AuthorsComponent,
        InstitutionsComponent,
        ContractsComponent,
        PublishersComponent,
        GreaterEntitiesComponent,
        FundersComponent,
        PubTypesComponent,
        OaCategoriesComponent,
        CostCenterComponent,
        CostTypesComponent,
        RolesComponent,
        StatusesComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        SharedModule,
        AppRoutingModule,
        TableModule,
        StoreModule.forRoot({ viewConfigReducer }, { metaReducers }),
        !environment.production ? StoreDevtoolsModule.instrument({ connectInZone: true }) : []
    ],
    providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
        { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
        { provide: AuthorizationService, useClass: environment.authorization_service },
        provideHttpClient(withInterceptorsFromDi())
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
