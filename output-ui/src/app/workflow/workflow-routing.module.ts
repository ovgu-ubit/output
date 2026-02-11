import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginGuard } from '../security/login.guard';
import { PublicationImportComponent } from './pages/publication-import/publication-import.component';
import { ImportWorkflowFormComponent } from './dialogs/import-workflow-form/import-workflow-form.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'publication_import', },
  { path: 'publication_import/:id', component: ImportWorkflowFormComponent, canActivate: [LoginGuard], data: { roles: ['admin'] }, },
  { path: 'publication_import', component: PublicationImportComponent, canActivate: [LoginGuard], data: { roles: ['admin'] }, },
  {
    path: 'publication_import/:id', loadComponent: () => import('./dialogs/import-workflow-form/import-workflow-form.component').then(m => m.ImportWorkflowFormComponent), 
    canActivate: [LoginGuard], data: { roles: ['admin'] },
    children: [
      { path: 'overview', loadComponent: () => import('./dialogs/import-workflow-form/import-form-overview/import-form-overview.component').then(m => m.ImportFormOverviewComponent), 
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
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkflowRoutingModule { }
