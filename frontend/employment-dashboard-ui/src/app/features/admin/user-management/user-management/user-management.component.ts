import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSnackBarModule, MatProgressBarModule, MatDialogModule,
    MatMenuModule, MatChipsModule, MatTooltipModule, MatDividerModule
  ],
  template: `
<div class="page-container">
  <div class="page-header">
    <div>
      <h1>User Management</h1>
      <p>Manage system users, roles and access control</p>
    </div>
    <button mat-raised-button color="primary" (click)="showCreateForm = !showCreateForm">
      <mat-icon>person_add</mat-icon> Add User
    </button>
  </div>

  <!-- Create User Form -->
  <mat-card class="create-form" *ngIf="showCreateForm">
    <mat-card-header><mat-card-title>Create New User</mat-card-title></mat-card-header>
    <mat-card-content>
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput [(ngModel)]="newUser.username">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput type="password" [(ngModel)]="newUser.password">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Role</mat-label>
          <mat-select [(ngModel)]="newUser.roleId">
            <mat-option [value]="1">Admin</mat-option>
            <mat-option [value]="2">Manager</mat-option>
            <mat-option [value]="3">Employee</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="createUser()" [disabled]="creating">
          <mat-icon>save</mat-icon> {{ creating ? 'Creating...' : 'Create' }}
        </button>
        <button mat-stroked-button (click)="showCreateForm = false"><mat-icon>close</mat-icon></button>
      </div>
    </mat-card-content>
  </mat-card>

  <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>

  <!-- Reset Password Dialog -->
  <mat-card class="reset-form" *ngIf="resetUserId">
    <mat-card-content>
      <div class="form-row">
        <span style="font-weight:600">Reset password for <strong>{{ resetUsername }}</strong>:</span>
        <mat-form-field appearance="outline">
          <mat-label>New Password</mat-label>
          <input matInput type="password" [(ngModel)]="newPassword">
        </mat-form-field>
        <button mat-raised-button color="warn" (click)="confirmResetPassword()" [disabled]="resetting">
          {{ resetting ? 'Resetting...' : 'Reset' }}
        </button>
        <button mat-stroked-button (click)="resetUserId = null"><mat-icon>close</mat-icon></button>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- Change Role dialog -->
  <mat-card class="reset-form" *ngIf="roleChangeUserId">
    <mat-card-content>
      <div class="form-row">
        <span style="font-weight:600">Change role for <strong>{{ roleChangeUsername }}</strong>:</span>
        <mat-form-field appearance="outline">
          <mat-label>New Role</mat-label>
          <mat-select [(ngModel)]="newRoleId">
            <mat-option [value]="1">Admin</mat-option>
            <mat-option [value]="2">Manager</mat-option>
            <mat-option [value]="3">Employee</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="confirmRoleChange()" [disabled]="changingRole">
          {{ changingRole ? 'Saving...' : 'Change Role' }}
        </button>
        <button mat-stroked-button (click)="roleChangeUserId = null"><mat-icon>close</mat-icon></button>
      </div>
    </mat-card-content>
  </mat-card>

  <mat-card class="table-card">
    <table mat-table [dataSource]="users()">

      <ng-container matColumnDef="username">
        <th mat-header-cell *matHeaderCellDef>Username</th>
        <td mat-cell *matCellDef="let u">
          <div class="user-cell">
            <div class="user-avatar">{{ initials(u.employee?.fullName || u.username) }}</div>
            <div>
              <strong>{{ u.username }}</strong>
              <span style="display:block;font-size:.75rem;color:#888">{{ u.employee?.fullName || '—' }}</span>
            </div>
          </div>
        </td>
      </ng-container>

      <ng-container matColumnDef="department">
        <th mat-header-cell *matHeaderCellDef>Department</th>
        <td mat-cell *matCellDef="let u">{{ u.employee?.departmentName || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="role">
        <th mat-header-cell *matHeaderCellDef>Role</th>
        <td mat-cell *matCellDef="let u">
          <span class="role-chip" [class]="'role-'+u.role?.roleName?.toLowerCase()">{{ u.role?.roleName }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let u">
          <span [ngSwitch]="getStatus(u)">
            <span *ngSwitchCase="'inactive'" class="badge-inactive">Inactive</span>
            <span *ngSwitchDefault               class="badge-active">Active</span>
          </span>
        </td>
      </ng-container>

      <ng-container matColumnDef="created">
        <th mat-header-cell *matHeaderCellDef>Created</th>
        <td mat-cell *matCellDef="let u">{{ u.createdAt | date:'mediumDate' }}</td>
      </ng-container>

      <!-- Actions -->
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let u">
          <button mat-icon-button [matMenuTriggerFor]="menu" matTooltip="Actions"
                  [disabled]="getStatus(u) === 'deleted'">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #menu="matMenu">
            <button mat-menu-item (click)="openRoleChange(u)">
              <mat-icon color="accent">manage_accounts</mat-icon> Change Role
            </button>
            <button mat-menu-item (click)="toggleStatus(u)">
              <mat-icon [color]="u.isActive ? 'warn' : 'primary'">
                {{ u.isActive ? 'person_off' : 'person' }}
              </mat-icon>
              {{ u.isActive ? 'Deactivate (Read-Only)' : 'Activate' }}
            </button>
          </mat-menu>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let r; columns: cols;"
          class="table-row"
          [class.deleted-row]="getStatus(r) === 'deleted'"></tr>
    </table>
    <div class="empty" *ngIf="!loading() && users().length === 0">
      No users found.
    </div>
  </mat-card>
</div>`,
  styles: [`
    .page-container { padding:1.5rem; }
    .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; }
    .page-header h1 { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0 0 .25rem; }
    .page-header p  { color:#666; margin:0; font-size:.875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color:#82b1ff; }

    .create-form,.reset-form { border-radius:12px!important; margin-bottom:1rem; }
    .form-row { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; margin-top:.5rem; }
    .form-row mat-form-field { flex:1; min-width:160px; }

    .table-card { border-radius:12px!important; overflow:hidden; }
    .table-row:hover { background:rgba(26,35,126,.04); }

    .user-cell { display:flex; align-items:center; gap:.75rem; }
    .user-avatar {
      width:36px; height:36px; border-radius:50%; background:#1a237e;
      color:white; display:flex; align-items:center; justify-content:center;
      font-size:.8rem; font-weight:700; flex-shrink:0;
    }

    .role-chip { padding:3px 10px; border-radius:12px; font-size:.8rem; font-weight:600; }
    .role-admin    { background:#f3e5f5; color:#6a1b9a; }
    .role-manager  { background:#e0f7fa; color:#00838f; }
    .role-employee { background:#e8f5e9; color:#2e7d32; }

    .badge-active   { padding:3px 10px; border-radius:12px; font-size:.8rem; background:#e8f5e9; color:#2e7d32; }
    .badge-inactive { padding:3px 10px; border-radius:12px; font-size:.8rem; background:#fff3e0; color:#e65100; }
    .badge-deleted  { padding:3px 10px; border-radius:12px; font-size:.8rem; background:#eeeeee; color:#757575;
                      display:inline-flex; align-items:center; gap:3px; }

    .deleted-row td { opacity:.45; }
    .deleted-row:hover { background:rgba(0,0,0,.02)!important; }

    .empty { text-align:center; padding:2rem; color:#aaa; }
  `]
})
export class UserManagementComponent implements OnInit {
  private readonly API = `${environment.apiUrl}/users`;
  users    = signal<any[]>([]); loading = signal(false);
  cols     = ['username','department','role','status','created','actions'];

  showCreateForm = false;
  creating       = false;
  newUser        = { username:'', password:'', roleId:3, employeeId: null as number|null };

  resetUserId:   number | null = null;
  resetUsername  = '';
  newPassword    = '';
  resetting      = false;

  roleChangeUserId:   number | null = null;
  roleChangeUsername  = '';
  newRoleId           = 3;
  changingRole        = false;

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit() { this.load(); }

  /** Single source of truth for a user's display status */
  getStatus(u: any): 'deleted' | 'inactive' | 'active' {
    if (u.employee?.isDeleted)                    return 'deleted';
    if (!u.isActive || u.employee?.isInactive)    return 'inactive';
    return 'active';
  }

  load() {
    this.loading.set(true);
    this.http.get<any[]>(this.API).subscribe({
      next:     u => this.users.set(u),
      error:    () => this.loading.set(false),
      complete: () => this.loading.set(false)
    });
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  }

  createUser() {
    if (!this.newUser.username || !this.newUser.password) {
      this.snack.open('Username and password are required.', '×', { duration: 3000 }); return;
    }
    this.creating = true;
    this.http.post(this.API, this.newUser).subscribe({
      next: () => {
        this.snack.open('User created successfully.', '×', { duration: 3000 });
        this.newUser = { username:'', password:'', roleId:3, employeeId:null };
        this.showCreateForm = false;
        this.load();
      },
      error: e => this.snack.open(e.error?.message ?? 'Failed to create user.', '×', { duration: 4000 }),
      complete: () => this.creating = false
    });
  }

  openResetPassword(u: any) {
    this.resetUserId   = u.userId;
    this.resetUsername = u.username;
    this.newPassword   = '';
  }

  confirmResetPassword() {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.snack.open('Password must be at least 6 characters.', '×', { duration: 3000 }); return;
    }
    this.resetting = true;
    this.http.put(`${this.API}/${this.resetUserId}/reset-password`, { newPassword: this.newPassword }).subscribe({
      next: () => {
        this.snack.open('Password reset successfully.', '×', { duration: 3000 });
        this.resetUserId = null;
      },
      error: e => this.snack.open(e.error?.message ?? 'Reset failed.', '×', { duration: 4000 }),
      complete: () => this.resetting = false
    });
  }

  openRoleChange(u: any) {
    this.roleChangeUserId   = u.userId;
    this.roleChangeUsername = u.username;
    this.newRoleId          = u.role?.roleId ?? 3;
  }

  confirmRoleChange() {
    this.changingRole = true;
    this.http.put(`${this.API}/${this.roleChangeUserId}/role`, { roleId: this.newRoleId }).subscribe({
      next: () => {
        this.snack.open('Role updated successfully.', '×', { duration: 3000 });
        this.roleChangeUserId = null;
        this.load();
      },
      error: e => this.snack.open(e.error?.message ?? 'Role change failed.', '×', { duration: 4000 }),
      complete: () => this.changingRole = false
    });
  }

  toggleStatus(u: any) {
    const action = u.isActive ? 'deactivate (read-only)' : 'activate';
    if (!confirm(`Are you sure you want to ${action} user "${u.username}"?`)) return;
    this.http.put(`${this.API}/${u.userId}/toggle-status`, {}).subscribe({
      next: (r: any) => {
        this.snack.open(r.message ?? 'Status updated.', '×', { duration: 4000 });
        this.load();
      },
      error: e => this.snack.open(e.error?.message ?? 'Failed.', '×', { duration: 4000 })
    });
  }
}