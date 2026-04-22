import { NgModule } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SharedModule } from '../shared/shared.module';
import { TableModule } from '../table/table.module';
import { PublicationExportComponent } from './pages/publication-export/publication-export.component';
import { PublicationImportComponent } from './pages/publication-import/publication-import.component';
import { PublicationValidationComponent } from './pages/publication-validation/publication-validation.component';
import { WorkflowRoutingModule } from './workflow-routing.module';

@NgModule({
  declarations: [
    PublicationImportComponent,
    PublicationExportComponent,
    PublicationValidationComponent
  ],
  imports: [
    TableModule,
    SharedModule,
    WorkflowRoutingModule,
    MatProgressBarModule,
    SharedModule,
    MatSidenavModule,
    MatListModule
  ],
})
export class WorkflowModule { }
