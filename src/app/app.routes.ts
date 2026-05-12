import { Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard-page.component';
import { PatientsPageComponent } from './pages/patients-page.component';
import { PatientDetailPageComponent } from './pages/patient-detail-page.component';
import { AppointmentsPageComponent } from './pages/appointments-page.component';
import { PaymentsPageComponent } from './pages/payments-page.component';
import { ExpensesPageComponent } from './pages/expenses-page.component';
import { ReportsPageComponent } from './pages/reports-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPageComponent },
  { path: 'patients', component: PatientsPageComponent },
  { path: 'patients/:id', component: PatientDetailPageComponent },
  { path: 'appointments', component: AppointmentsPageComponent },
  { path: 'payments', component: PaymentsPageComponent },
  { path: 'expenses', component: ExpensesPageComponent },
  { path: 'reports', component: ReportsPageComponent },
  { path: '**', redirectTo: 'dashboard' }
];
