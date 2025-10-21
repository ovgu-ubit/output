import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { PublicationFormComponent } from './dialogs/publication-form/publication-form.component';
import { ReportingYearFormComponent } from './dialogs/reporting-year-form/reporting-year-form.component';
import { PublicationsRoutingModule } from './publications-routing.module';
import { PublicationsComponent } from './pages/publications/publications.component';
import { TableModule } from '../table/table.module';

@NgModule({
  declarations: [PublicationsComponent, PublicationFormComponent, ReportingYearFormComponent],
  imports: [
    SharedModule,
    TableModule,
    PublicationsRoutingModule
  ],
})
export class PublicationsModule {}
