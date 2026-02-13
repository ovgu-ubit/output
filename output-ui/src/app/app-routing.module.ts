import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StartComponent } from './start/start.component';
import { LoginGuard } from './security/login.guard';

const routes: Routes = [
  { path: '', component: StartComponent, canActivate: [LoginGuard], data: { roles: null } },
  {
    path: 'publications',
    loadChildren: () => import('./publications/publications.module').then(m => m.PublicationsModule),
  },
  {
    path: 'master-data',
    loadChildren: () => import('./master-data/master-data.module').then(m => m.MasterDataModule),
  },{
    path: 'administration',
    loadChildren: () => import('./administration/administration.module').then(m => m.AdministrationModule),
  },
  {
    path: 'statistics',
    loadChildren: () => import('./statistics/statistics.module').then(m => m.StatisticsModule),
  },
  {
    path: 'workflow',
    loadChildren: () => import('./workflow/workflow.module').then(m => m.WorkflowModule),
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
