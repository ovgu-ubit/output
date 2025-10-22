import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginGuard } from '../security/login.guard';
import { StatisticsYearComponent } from './pages/statistics-year/statistics-year.component';
import { StatisticsComponent } from './pages/statistics/statistics.component';

const routes: Routes = [
    { path: '', component: StatisticsComponent, canActivate: [LoginGuard], data: { roles: null } },
    { path: ':year', component: StatisticsYearComponent, canActivate: [LoginGuard], data: { roles: null } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StatisticsRoutingModule { }
