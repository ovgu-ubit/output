import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginGuard } from '../security/login.guard';
import { PublicationImportComponent } from './pages/publication-import/publication-import.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'import', },
  { path: 'publication_import', component: PublicationImportComponent, canActivate: [LoginGuard], data: { roles: ['admin'] }, },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkflowRoutingModule { }
