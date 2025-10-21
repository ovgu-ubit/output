import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { DuplicateDialogComponent } from './components/duplicate-dialog/duplicate-dialog.component';
import { AdministrationRoutingModule } from './administration-routing.module';
import { DuplicatesComponent } from './pages/duplicates/duplicates.component';
import { EnrichComponent } from './pages/enrich/enrich.component';
import { ExportComponent } from './pages/export/export.component';
import { ImportComponent } from './pages/import/import.component';
import { PlausibilityComponent } from './pages/plausibility/plausibility.component';

@NgModule({
  declarations: [
    DuplicateDialogComponent,
    DuplicatesComponent,
    EnrichComponent,
    ExportComponent,
    ImportComponent,
    PlausibilityComponent,
  ],
  imports: [SharedModule, AdministrationRoutingModule],
})
export class AdministrationModule {}
