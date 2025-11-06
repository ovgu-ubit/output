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
import { StartComponent } from './start/start.component';
import { AuthorizationService } from './security/authorization.service';
import { hydrationMetaReducer, viewConfigReducer } from './services/redux';
import { SharedModule } from './shared/shared.module';
import { TableModule } from './table/table.module';
import { FormModule } from './form/form.module';
import { provideHighcharts } from 'highcharts-angular';

export const metaReducers: MetaReducer[] = [hydrationMetaReducer];

@NgModule({
    declarations: [
        AppComponent,
        StartComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        SharedModule,
        AppRoutingModule,
        TableModule,
        FormModule,
        StoreModule.forRoot({ viewConfigReducer }, { metaReducers }),
        !environment.production ? StoreDevtoolsModule.instrument({ connectInZone: true }) : []
    ],
    providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
        { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
        { provide: AuthorizationService, useClass: environment.authorization_service },
        provideHttpClient(withInterceptorsFromDi()),
        provideHighcharts({
            modules: () => {
                return [
                    import('highcharts/esm/modules/accessibility'),
                    import('highcharts/esm/modules/exporting'),
                    //import('highcharts/esm/themes/brand-light'),
                    import('highcharts/esm/themes/grid-light'),
                    //import('highcharts/esm/themes/high-contrast-light'),
                ];
            }})
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
