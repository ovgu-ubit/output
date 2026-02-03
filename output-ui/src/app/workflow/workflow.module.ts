import { NgModule } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SharedModule } from '../shared/shared.module';
import { TableModule } from '../table/table.module';
import { PublicationImportComponent } from './pages/publication-import/publication-import.component';
import { WorkflowRoutingModule } from './workflow-routing.module';

@NgModule({
  declarations: [
    PublicationImportComponent,
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
