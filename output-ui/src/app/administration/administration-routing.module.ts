import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginGuard } from '../security/login.guard';
import { DuplicatesComponent } from './pages/duplicates/duplicates.component';
import { EnrichComponent } from './pages/enrich/enrich.component';
import { ExportComponent } from './pages/export/export.component';
import { ImportComponent } from './pages/import/import.component';
import { PlausibilityComponent } from './pages/plausibility/plausibility.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'export',
  },
  {
    path: 'plausibility',
    component: PlausibilityComponent,
    canActivate: [LoginGuard],
    data: { roles: ['writer', 'admin'] },
  },
  {
    path: 'duplicates',
    component: DuplicatesComponent,
    canActivate: [LoginGuard],
    data: { roles: ['writer', 'admin'] },
  },
  {
    path: 'import',
    component: ImportComponent,
    canActivate: [LoginGuard],
    data: { roles: ['admin'] },
  },
  {
    path: 'enrich',
    component: EnrichComponent,
    canActivate: [LoginGuard],
    data: { roles: ['admin'] },
  },
  {
    path: 'export',
    component: ExportComponent,
    canActivate: [LoginGuard],
    data: { roles: ['reader', 'writer', 'admin'] },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdministrationRoutingModule {}
