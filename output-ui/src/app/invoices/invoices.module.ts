import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginGuard } from '../security/login.guard';
import { InvoicesComponent } from './pages/invoices/invoices.component';

export const INVOICE_ROUTES: Routes = [{
  path: '', component: InvoicesComponent, canActivate: [LoginGuard],
  data: { roles: ['reader', 'writer', 'admin'] },
}];

@NgModule({
  imports: [InvoicesComponent, RouterModule.forChild(INVOICE_ROUTES)],
})
export class InvoicesModule { }
