import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicationsComponent } from './pages/publications/publications.component';
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
import { PlausibilityComponent } from './pages/administration/plausibility/plausibility.component';
import { ImportComponent } from './pages/administration/import/import.component';
import { EnrichComponent } from './pages/administration/enrich/enrich.component';
import { ExportComponent } from './pages/administration/export/export.component';
import { StatisticsComponent } from './pages/statistics/statistics.component';
import { StatisticsYearComponent } from './pages/statistics/statistics-year/statistics-year.component';
import { CostCenterComponent } from './pages/master-data/cost-center/cost-center.component';
import { CostTypesComponent } from './pages/master-data/cost-types/cost-types.component';

const routes: Routes = [
  { path: '', component: StartComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'publications', component: PublicationsComponent, canActivate: [LoginGuard], data: { roles: null } },
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
  { path: 'administration', component: ExportComponent, canActivate: [LoginGuard], data: { roles: ['reader','writer','admin'] } },
  { path: 'administration/plausibility', component: PlausibilityComponent, canActivate: [LoginGuard], data: { roles: ['writer','admin'] } },
  { path: 'administration/import', component: ImportComponent, canActivate: [LoginGuard], data: { roles: ['admin'] } },
  { path: 'administration/enrich', component: EnrichComponent, canActivate: [LoginGuard], data: { roles: ['admin'] } },
  { path: 'administration/export', component: ExportComponent, canActivate: [LoginGuard], data: { roles: ['reader','writer','admin'] } },
  { path: 'statistics', component: StatisticsComponent, canActivate: [LoginGuard], data: { roles: null } },
  { path: 'statistics/:year', component: StatisticsYearComponent, canActivate: [LoginGuard], data: { roles: null } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
