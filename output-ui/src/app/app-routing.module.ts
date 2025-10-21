import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StartComponent } from './pages/start/start.component';
import { LoginGuard } from './security/login.guard';
import { AuthorsComponent } from './pages/authors/authors.component';
import { InstitutionsComponent } from './pages/master-data/institutions/institutions.component';
import { ContractsComponent } from './pages/master-data/contracts/contracts.component';
import { PublishersComponent } from './pages/master-data/publishers/publishers.component';
import { GreaterEntitiesComponent } from './pages/master-data/greater-entities/greater-entities.component';
import { FundersComponent } from './pages/master-data/funders/funders.component';
import { PubTypesComponent } from './pages/master-data/pub-types/pub-types.component';
import { OaCategoriesComponent } from './pages/master-data/oa-categories/oa-categories.component';
import { CostCenterComponent } from './pages/master-data/cost-center/cost-center.component';
import { CostTypesComponent } from './pages/master-data/cost-types/cost-types.component';
import { RolesComponent } from './pages/master-data/roles/roles.component';
import { StatusesComponent } from './pages/master-data/statuses/statuses.component';

const routes: Routes = [
  { path: '', component: StartComponent, canActivate: [LoginGuard], data: { roles: null } },
  {
    path: 'publications',
    loadChildren: () => import('./publications/publications.module').then(m => m.PublicationsModule),
  },
  { path: 'authors', component: AuthorsComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data', component: InstitutionsComponent, canActivate: [LoginGuard], data: { roles: null} },
  { path: 'master-data/institutions', component: InstitutionsComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/contracts', component: ContractsComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/publishers', component: PublishersComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/greater-entities', component: GreaterEntitiesComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/funders', component: FundersComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/pub-types', component: PubTypesComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/oa-categories', component: OaCategoriesComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/cost-centers', component: CostCenterComponent, canActivate: [LoginGuard], data: { roles: null} },
  { path: 'master-data/cost-types', component: CostTypesComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/roles', component: RolesComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'master-data/status', component: StatusesComponent, canActivate: [LoginGuard], data: { roles: null } },
  {
    path: 'administration',
    loadChildren: () => import('./administration/administration.module').then(m => m.AdministrationModule),
  },
  {
    path: 'statistics',
    loadChildren: () => import('./statistics/statistics.module').then(m => m.StatisticsModule),
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
