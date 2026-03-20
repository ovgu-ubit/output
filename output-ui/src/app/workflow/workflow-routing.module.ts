import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginGuard } from '../security/login.guard';
import { ExportWorkflowFormComponent } from './dialogs/export-workflow-form/export-workflow-form.component';
import { PublicationImportComponent } from './pages/publication-import/publication-import.component';
import { PublicationExportComponent } from './pages/publication-export/publication-export.component';
import { ImportWorkflowFormComponent } from './dialogs/import-workflow-form/import-workflow-form.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'publication_import', },
  { path: 'publication_import/:id', component: ImportWorkflowFormComponent, canActivate: [LoginGuard], data: { roles: ['admin'] }, },
  { path: 'publication_import', component: PublicationImportComponent, canActivate: [LoginGuard], data: { roles: ['admin'] }, },
  { path: 'publication_export/:id', component: ExportWorkflowFormComponent, canActivate: [LoginGuard], data: { roles: ['admin'] }, },
  { path: 'publication_export', component: PublicationExportComponent, canActivate: [LoginGuard], data: { roles: ['admin'] }, },
  {
    path: 'publication_import/:id', loadComponent: () => import('./dialogs/import-workflow-form/import-workflow-form.component').then(m => m.ImportWorkflowFormComponent), 
    canActivate: [LoginGuard], data: { roles: ['admin'] },
    children: [
      { path: 'overview', loadComponent: () => import('./dialogs/import-workflow-form/import-form-overview/import-form-overview.component').then(m => m.ImportFormOverviewComponent), 
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'logs/:reportId', loadComponent: () => import('./dialogs/import-workflow-form/import-form-log/import-form-log.component').then(m => m.ImportFormLogComponent),
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'general', loadComponent: () => import('./dialogs/import-workflow-form/import-form-general/import-form-general.component').then(m => m.ImportFormGeneralComponent), 
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'strategy', loadComponent: () => import('./dialogs/import-workflow-form/import-form-strategy/import-form-strategy.component').then(m => m.ImportFormStrategyComponent), 
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'mapping', loadComponent: () => import('./dialogs/import-workflow-form/import-form-mapping/import-form-mapping.component').then(m => m.ImportFormMappingComponent), 
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'test', loadComponent: () => import('./dialogs/import-workflow-form/import-form-test/import-form-test.component').then(m => m.ImportFormTestComponent), 
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'action', loadComponent: () => import('./dialogs/import-workflow-form/import-form-action/import-form-action.component').then(m => m.ImportFormActionComponent), 
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
    ]
  },
  {
    path: 'publication_export/:id', loadComponent: () => import('./dialogs/export-workflow-form/export-workflow-form.component').then(m => m.ExportWorkflowFormComponent),
    canActivate: [LoginGuard], data: { roles: ['admin'] },
    children: [
      { path: 'overview', loadComponent: () => import('./dialogs/export-workflow-form/export-form-overview/export-form-overview.component').then(m => m.ExportFormOverviewComponent),
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'logs/:reportId', loadComponent: () => import('./dialogs/export-workflow-form/export-form-log/export-form-log.component').then(m => m.ExportFormLogComponent),
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'general', loadComponent: () => import('./dialogs/export-workflow-form/export-form-general/export-form-general.component').then(m => m.ExportFormGeneralComponent),
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'strategy', loadComponent: () => import('./dialogs/export-workflow-form/export-form-strategy/export-form-strategy.component').then(m => m.ExportFormStrategyComponent),
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'mapping', loadComponent: () => import('./dialogs/export-workflow-form/export-form-mapping/export-form-mapping.component').then(m => m.ExportFormMappingComponent),
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
      { path: 'action', loadComponent: () => import('./dialogs/export-workflow-form/export-form-action/export-form-action.component').then(m => m.ExportFormActionComponent),
    canActivate: [LoginGuard], data: { roles: ['admin'] } },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkflowRoutingModule { }
