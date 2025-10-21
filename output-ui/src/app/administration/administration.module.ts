import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { DuplicateDialogComponent } from './components/duplicate-dialog/duplicate-dialog.component';
import { AdministrationRoutingModule } from './administration-routing.module';
import { DuplicatesComponent } from './pages/duplicates/duplicates.component';
import { EnrichComponent } from './pages/enrich/enrich.component';
import { ExportComponent } from './pages/export/export.component';
import { ImportComponent } from './pages/import/import.component';
import { PlausibilityComponent } from './pages/plausibility/plausibility.component';
import { ImportConfigComponent } from './components/import-config/import-config.component';
import { CsvFormatComponent } from './components/csv-format/csv-format.component';
import { LogDialogComponent } from './components/log-dialog/log-dialog.component';

@NgModule({
  declarations: [
    DuplicateDialogComponent,
    DuplicatesComponent,
    EnrichComponent,
    ExportComponent,
    ImportComponent,
    PlausibilityComponent,
    ImportConfigComponent,
    CsvFormatComponent,
    LogDialogComponent
  ],
  imports: [
    SharedModule,
    AdministrationRoutingModule,

  ],
})
export class AdministrationModule {}
