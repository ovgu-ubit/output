import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MasterDataRoutingModule } from './master-data-routing.module';
import { AuthorsComponent } from './pages/authors/authors.component';
import { ContractsComponent } from './pages/contracts/contracts.component';
import { CostCenterComponent } from './pages/cost-center/cost-center.component';
import { CostTypesComponent } from './pages/cost-types/cost-types.component';
import { FundersComponent } from './pages/funders/funders.component';
import { GreaterEntitiesComponent } from './pages/greater-entities/greater-entities.component';
import { InstitutionsComponent } from './pages/institutions/institutions.component';
import { OaCategoriesComponent } from './pages/oa-categories/oa-categories.component';
import { PubTypesComponent } from './pages/pub-types/pub-types.component';
import { PublishersComponent } from './pages/publishers/publishers.component';
import { RolesComponent } from './pages/roles/roles.component';
import { StatusesComponent } from './pages/statuses/statuses.component';
import { TableModule } from '../table/table.module';
import { FormModule } from '../form/form.module';

@NgModule({
  declarations: [
    AuthorsComponent,
    ContractsComponent,
    CostCenterComponent,
    CostTypesComponent,
    FundersComponent,
    GreaterEntitiesComponent,
    InstitutionsComponent,
    OaCategoriesComponent,
    PubTypesComponent,
    PublishersComponent,
    RolesComponent,
    StatusesComponent
  ],
  imports: [
    SharedModule,
    TableModule,
    FormModule,
    MasterDataRoutingModule
  ],
})
export class MasterDataModule {}
