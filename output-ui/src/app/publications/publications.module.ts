import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { PublicationFormComponent } from './dialogs/publication-form/publication-form.component';
import { ReportingYearFormComponent } from './dialogs/reporting-year-form/reporting-year-form.component';
import { PublicationsRoutingModule } from './publications-routing.module';
import { PublicationsComponent } from './pages/publications/publications.component';
import { TableModule } from '../table/table.module';
import { FormModule } from '../form/form.module';
import { FilterViewComponent } from './dialogs/filter-view/filter-view.component';

@NgModule({
  declarations: [
    PublicationsComponent, 
    PublicationFormComponent, 
    ReportingYearFormComponent,
    FilterViewComponent
  ],
  imports: [
    SharedModule,
    TableModule,
    FormModule,
    PublicationsRoutingModule
  ],
})
export class PublicationsModule {}
