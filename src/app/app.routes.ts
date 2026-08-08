import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { ScheduleComponent } from './schedule/schedule';
import { TuitionComponent } from './tuition/tuition';
import { ClassesComponent } from './classes/classes';
import { StudentsComponent } from './students/students';
import { ReportsComponent } from './reports/reports';
import { AttendanceComponent } from './attendance/attendance';
import { PenaltiesComponent } from './penalties/penalties';
import { LoginComponent } from './login/login';
import { SubjectsComponent } from './subjects/subjects';
import { AccountsComponent } from './accounts/accounts';
import { authGuard, guestGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'schedule', component: ScheduleComponent },
      { path: 'tuition', component: TuitionComponent },
      { path: 'classes', component: ClassesComponent },
      { path: 'students', component: StudentsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'attendance', component: AttendanceComponent },
      { path: 'penalties', component: PenaltiesComponent },
      { path: 'subjects', component: SubjectsComponent, data: { permission: 'subjects' } },
      { path: 'accounts', component: AccountsComponent, data: { permission: 'accounts' } }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
