import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [

  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },

  // ── Admin ──────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin'] },
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'employees',
        loadComponent: () => import('./features/admin/employees/employee-list/employee-list.component').then(m => m.EmployeeListComponent) },
      { path: 'employees/new',
        loadComponent: () => import('./features/admin/employees/employee-form/employee-form.component').then(m => m.EmployeeFormComponent) },
      { path: 'employees/:id/edit',
        loadComponent: () => import('./features/admin/employees/employee-form/employee-form.component').then(m => m.EmployeeFormComponent) },
      // Attendance — Monthly Roster (default tab 0)
      { path: 'attendance',
        loadComponent: () => import('./features/admin/attendance/attendance/attendance.component').then(m => m.AdminAttendanceComponent) },
      // Attendance — Summary (tab 1)
      { path: 'attendance/summary',
        loadComponent: () => import('./features/admin/attendance/attendance-summary/attendance-summary.component').then(m => m.AdminAttendanceSummaryComponent) },
      { path: 'leave',
        loadComponent: () => import('./features/admin/leave/leave/leave.component').then(m => m.AdminLeaveComponent) },
      { path: 'reports',
        loadComponent: () => import('./features/admin/reports/reports/reports.component').then(m => m.ReportsComponent) },
      { path: 'notifications',
        loadComponent: () => import('./features/admin/notifications/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'audit-logs',
        loadComponent: () => import('./features/admin/audit-logs/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent) },
      { path: 'users',
        loadComponent: () => import('./features/admin/user-management/user-management/user-management.component').then(m => m.UserManagementComponent) },
      { path: 'geo-settings',
        loadComponent: () => import('./features/admin/geo-settings/geo-settings.component').then(m => m.GeoSettingsComponent) },
      { path: 'profile',
        loadComponent: () => import('./features/employee/profile/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'settings',
        loadComponent: () => import('./features/shared/settings/settings.component').then(m => m.SettingsComponent) },
    ]
  },

  // ── Manager ────────────────────────────────────────────────
  {
    path: 'manager',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Manager'] },
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',
        loadComponent: () => import('./features/manager/dashboard/manager-dashboard/manager-dashboard.component').then(m => m.ManagerDashboardComponent) },
      { path: 'team',
        loadComponent: () => import('./features/manager/team/team/team').then(m => m.TeamComponent) },
      // Attendance — Monthly Roster (default tab 0)
      { path: 'attendance',
        loadComponent: () => import('./features/manager/attendance/manager-attendance/manager-attendance.component').then(m => m.ManagerAttendanceComponent) },
      // Attendance — Summary (tab 1)
      { path: 'attendance/summary',
        loadComponent: () => import('./features/manager/attendance/attendance-summary/attendance-summary.component').then(m => m.ManagerAttendanceSummaryComponent) },
      { path: 'leave',
        loadComponent: () => import('./features/manager/leave/manager-leave/manager-leave.component').then(m => m.ManagerLeaveComponent) },
      { path: 'notifications',
        loadComponent: () => import('./features/shared/notifications/notifications-view/notifications-view.component').then(m => m.NotificationsViewComponent) },
      { path: 'profile',
        loadComponent: () => import('./features/employee/profile/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'settings',
        loadComponent: () => import('./features/shared/settings/settings.component').then(m => m.SettingsComponent) },
    ]
  },

  // ── Employee ───────────────────────────────────────────────
  {
    path: 'employee',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Employee'] },
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',
        loadComponent: () => import('./features/employee/dashboard/employee-dashboard/employee-dashboard.component').then(m => m.EmployeeDashboardComponent) },
      { path: 'profile',
        loadComponent: () => import('./features/employee/profile/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'attendance',
        loadComponent: () => import('./features/employee/attendance/employee-attendance/my-attendance.component').then(m => m.MyAttendanceComponent) },
      { path: 'leave',
        loadComponent: () => import('./features/employee/leave/employee-leave/my-leave.component').then(m => m.MyLeaveComponent) },
      { path: 'notifications',
        loadComponent: () => import('./features/shared/notifications/notifications-view/notifications-view.component').then(m => m.NotificationsViewComponent) },
      { path: 'settings',
        loadComponent: () => import('./features/shared/settings/settings.component').then(m => m.SettingsComponent) },
    ]
  },

  {
    path: 'unauthorized',
    loadComponent: () => import('./features/shared/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  { path: '**', redirectTo: 'login' }
];