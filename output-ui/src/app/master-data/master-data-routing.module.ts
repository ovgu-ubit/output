import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginGuard } from '../security/login.guard';
import { InstitutionsComponent } from './pages/institutions/institutions.component';
import { ContractsComponent } from './pages/contracts/contracts.component';
import { GreaterEntitiesComponent } from './pages/greater-entities/greater-entities.component';
import { PublishersComponent } from './pages/publishers/publishers.component';
import { FundersComponent } from './pages/funders/funders.component';
import { PubTypesComponent } from './pages/pub-types/pub-types.component';
import { OaCategoriesComponent } from './pages/oa-categories/oa-categories.component';
import { CostCenterComponent } from './pages/cost-center/cost-center.component';
import { CostTypesComponent } from './pages/cost-types/cost-types.component';
import { RolesComponent } from './pages/roles/roles.component';
import { StatusesComponent } from './pages/statuses/statuses.component';
import { AuthorsComponent } from './pages/authors/authors.component';

const routes: Routes = [
    //{ path: '', component: InstitutionsComponent, canActivate: [LoginGuard], data: { roles: null} },
    { path: 'authors', component: AuthorsComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'institutions', component: InstitutionsComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'contracts', component: ContractsComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'publishers', component: PublishersComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'greater-entities', component: GreaterEntitiesComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'funders', component: FundersComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'pub-types', component: PubTypesComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'oa-categories', component: OaCategoriesComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'cost-centers', component: CostCenterComponent, canActivate: [LoginGuard], data: { roles: null} },
    { path: 'cost-types', component: CostTypesComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'roles', component: RolesComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: 'status', component: StatusesComponent, canActivate: [LoginGuard], data: { roles: null } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MasterDataRoutingModule { }
