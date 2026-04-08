import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, LOCALE_ID, NgModule } from '@angular/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MetaReducer, StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
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
import { RuntimeConfigService } from './services/runtime-config.service';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { ApiErrorInterceptor } from './core/errors/api-error.interceptor';
import { provideEchartsCore } from 'ngx-echarts';
import 'moment/locale/de';

echarts.use([
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    DatasetComponent,
    GridComponent,
    LegendComponent,
    TitleComponent,
    ToolboxComponent,
    TooltipComponent,
    TransformComponent,
    LabelLayout,
    UniversalTransition,
    CanvasRenderer,
]);

registerLocaleData(localeDe);

export const metaReducers: MetaReducer[] = [hydrationMetaReducer];
export function initRuntimeConfig(rc: RuntimeConfigService) {
  return () => rc.load();
}

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
        {
            provide: APP_INITIALIZER,
            useFactory: initRuntimeConfig,
            deps: [RuntimeConfigService],
            multi: true,
        },
        { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
        { provide: LOCALE_ID, useValue: 'de-DE' },
        { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
        { provide: AuthorizationService, useClass: environment.authorization_service },
        { provide: HTTP_INTERCEPTORS, useClass: ApiErrorInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
        provideEchartsCore({ echarts }),
        provideHighcharts({
            modules: () => {
                return [
                    import('highcharts/esm/modules/accessibility'),
                    import('highcharts/esm/modules/exporting'),
                    //import('highcharts/esm/themes/brand-light'),
                    import('highcharts/esm/themes/grid-light'),
                    //import('highcharts/esm/themes/high-contrast-light'),
                ];
            }
        })
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
