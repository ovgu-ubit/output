import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicationsComponent } from './pages/publications/publications.component';
import { LoginGuard } from '../security/login.guard';

const routes: Routes = [
  {
    path: '',
    component: PublicationsComponent,
    canActivate: [LoginGuard],
    data: { roles: null },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicationsRoutingModule {}
