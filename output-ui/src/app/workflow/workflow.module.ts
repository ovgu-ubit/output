import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { TableModule } from '../table/table.module';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { WorkflowRoutingModule } from './workflow-routing.module';
import { PublicationImportComponent } from './pages/publication-import/publication-import.component';
import { ImportWorkflowFormComponent } from './dialogs/import-workflow-form/import-workflow-form.component';
import { FormModule } from '../form/form.module';

@NgModule({
  declarations: [
    PublicationImportComponent,
    ImportWorkflowFormComponent
  ],
  imports: [
    TableModule,
    SharedModule,
    WorkflowRoutingModule,
    MatProgressBarModule,
    FormModule
  ],
})
export class WorkflowModule { }
