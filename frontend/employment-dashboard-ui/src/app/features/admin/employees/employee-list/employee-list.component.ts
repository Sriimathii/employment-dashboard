import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmployeeService } from '../../../../core/services/employee.service';
import { Employee, EmployeeFilter, PagedResult } from '../../../../core/models/employee.model';

const DEPARTMENTS = [
  { id:1, name:'Human Resources' },{ id:2, name:'Information Technology' },
  { id:3, name:'Finance' },{ id:4, name:'Marketing' },{ id:5, name:'Sales' },
  { id:6, name:'Operations' },{ id:7, name:'Customer Support' },
  { id:8, name:'Research & Development' },{ id:9, name:'Administration' },
  { id:10, name:'Quality Assurance' },
];

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule,
    MatTooltipModule, MatProgressBarModule, MatCardModule
  ],
  template: `
<div class="page-container">
  <div class="page-header">
    <div>
      <h1>Employee Management</h1>
      <p>{{ totalCount() }} employees found</p>
    </div>
    <button mat-raised-button color="primary" routerLink="new">
      <mat-icon>add</mat-icon> Add Employee
    </button>
  </div>

  <!-- Filters -->
  <mat-card class="filter-card">
    <div class="filter-row">
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Search by Name / Email</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [(ngModel)]="searchText" (ngModelChange)="onSearchChange()" placeholder="e.g. John">
        <button *ngIf="searchText" mat-icon-button matSuffix (click)="searchText=''; onSearchChange()">
          <mat-icon>close</mat-icon>
        </button>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Employee Code</mat-label>
        <input matInput [(ngModel)]="codeText" (ngModelChange)="onSearchChange()" placeholder="e.g. EMP001">
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Department</mat-label>
        <mat-select [(ngModel)]="deptFilter" (ngModelChange)="loadEmployees()">
          <mat-option [value]="0">All Departments</mat-option>
          <mat-option *ngFor="let d of departments" [value]="d.id">{{ d.name }}</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="statusFilter" (ngModelChange)="loadEmployees()">
          <mat-option value="">All Status</mat-option>
          <mat-option value="Active">Active</mat-option>
          <mat-option value="Inactive">Inactive</mat-option>
        </mat-select>
      </mat-form-field>

      <button mat-stroked-button (click)="resetFilters()">
        <mat-icon>clear</mat-icon> Reset
      </button>
    </div>
  </mat-card>

  <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>

  <!-- Employee Table -->
  <mat-card class="table-card">
    <table mat-table [dataSource]="employees()" class="full-width-table">

      <!-- Avatar -->
      <ng-container matColumnDef="avatar">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let e">
          <div class="emp-avatar" *ngIf="!e.profileImage">{{ initials(e.fullName) }}</div>
          <img *ngIf="e.profileImage" [src]="e.profileImage" class="emp-avatar-img" [alt]="e.fullName">
        </td>
      </ng-container>

      <!-- Employee Code -->
      <ng-container matColumnDef="employeeCode">
        <th mat-header-cell *matHeaderCellDef>Code</th>
        <td mat-cell *matCellDef="let e">
          <span class="emp-code">{{ e.employeeCode }}</span>
        </td>
      </ng-container>

      <!-- Full Name + Email -->
      <ng-container matColumnDef="fullName">
        <th mat-header-cell *matHeaderCellDef>Employee</th>
        <td mat-cell *matCellDef="let e">
          <strong class="emp-name">{{ e.fullName }}</strong>
          <span class="emp-email">{{ e.email }}</span>
        </td>
      </ng-container>

      <!-- Phone -->
      <ng-container matColumnDef="phone">
        <th mat-header-cell *matHeaderCellDef>Phone</th>
        <td mat-cell *matCellDef="let e">{{ e.phoneNumber || '—' }}</td>
      </ng-container>

      <!-- Department -->
      <ng-container matColumnDef="department">
        <th mat-header-cell *matHeaderCellDef>Department</th>
        <td mat-cell *matCellDef="let e">
          <span class="dept-badge">{{ e.departmentName || '—' }}</span>
        </td>
      </ng-container>

      <!-- Role -->
      <ng-container matColumnDef="role">
        <th mat-header-cell *matHeaderCellDef>Role</th>
        <td mat-cell *matCellDef="let e">
          <span class="role-badge" [class]="'role-' + (e.roleName?.toLowerCase() || 'employee')">
            {{ e.roleName || '—' }}
          </span>
        </td>
      </ng-container>

      <!-- Salary -->
      <ng-container matColumnDef="salary">
        <th mat-header-cell *matHeaderCellDef>Salary</th>
        <td mat-cell *matCellDef="let e">
          {{ e.salary ? ('₹' + (e.salary | number:'1.0-0')) : '—' }}
        </td>
      </ng-container>

      <!-- Joining Date -->
      <ng-container matColumnDef="joiningDate">
        <th mat-header-cell *matHeaderCellDef>Joined</th>
        <td mat-cell *matCellDef="let e">{{ e.joiningDate | date:'mediumDate' }}</td>
      </ng-container>

      <!-- Status -->
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let e">
          <span [class]="e.status === 'Active' ? 'badge-active' : 'badge-inactive'">
            {{ e.status }}
          </span>
        </td>
      </ng-container>

      <!-- Actions -->
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let e">
          <div class="action-btns">
            <button mat-icon-button color="primary"
                    [routerLink]="['/admin/employees', e.employeeId, 'edit']"
                    matTooltip="Edit Employee">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn"
                    (click)="confirmDelete(e)"
                    matTooltip="Delete Employee">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="emp-row"></tr>

      <!-- No data row -->
      <tr class="mat-row" *matNoDataRow>
        <td class="mat-cell no-data-cell" [attr.colspan]="displayedColumns.length">
          <mat-icon>people_outline</mat-icon>
          <p>No employees found</p>
          <small>Try adjusting your search or filters</small>
        </td>
      </tr>
    </table>

    <mat-paginator
      [length]="totalCount()"
      [pageSize]="filter.pageSize"
      [pageSizeOptions]="[10, 25, 50, 100]"
      (page)="onPageChange($event)"
      showFirstLastButtons>
    </mat-paginator>
  </mat-card>

  <!-- Delete Confirmation Dialog -->
  <div class="confirm-overlay" *ngIf="deleteTarget()" (click)="deleteTarget.set(null)">
    <div class="confirm-dialog" (click)="$event.stopPropagation()">
      <div class="warn-icon-wrap">
        <mat-icon class="warn-icon">warning_amber</mat-icon>
      </div>
      <h3>Delete Employee</h3>
      <p>Are you sure you want to delete <strong>{{ deleteTarget()?.fullName }}</strong>?<br>
         This will also remove their login account. This action cannot be undone.</p>
      <div class="dialog-actions">
        <button mat-stroked-button (click)="deleteTarget.set(null)">Cancel</button>
        <button mat-raised-button color="warn" (click)="doDelete()" [disabled]="deleting()">
          <mat-icon>delete_forever</mat-icon>
          {{ deleting() ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </div>
  </div>
</div>`,
  styles: [`
    .page-container { padding:1.5rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
    .page-header h1 { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0; }
    .page-header p  { color:#666; margin:.25rem 0 0; font-size:.875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color:#82b1ff; }
    :host-context([data-theme='dark']) .page-header p  { color:#aaa; }

    .filter-card { padding:1rem!important; margin-bottom:1rem; border-radius:12px!important; }
    .filter-row  { display:flex; flex-wrap:wrap; gap:.75rem; align-items:flex-start; }
    .filter-field { flex:1; min-width:180px; }

    .table-card { border-radius:12px!important; overflow:hidden; }
    .full-width-table { width:100%; }

    .emp-avatar {
      width:38px; height:38px; border-radius:50%; background:#1a237e; color:white;
      display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; flex-shrink:0;
    }
    .emp-avatar-img { width:38px; height:38px; border-radius:50%; object-fit:cover; }

    .emp-code { background:#e8eaf6; color:#1a237e; padding:2px 8px; border-radius:6px; font-size:.8rem; font-family:monospace; font-weight:600; }
    :host-context([data-theme='dark']) .emp-code { background:#283593; color:#82b1ff; }

    .emp-name  { display:block; font-size:.9rem; font-weight:600; }
    .emp-email { display:block; font-size:.75rem; color:#888; margin-top:1px; }

    .dept-badge { background:#e3f2fd; color:#1565c0; padding:3px 10px; border-radius:12px; font-size:.78rem; font-weight:500; white-space:nowrap; }

    .role-badge { padding:3px 10px; border-radius:12px; font-size:.78rem; font-weight:600; white-space:nowrap; }
    .role-admin    { background:#f3e5f5; color:#7b1fa2; }
    .role-manager  { background:#e0f7fa; color:#00838f; }
    .role-employee { background:#e8f5e9; color:#2e7d32; }

    .badge-active   { background:#e8f5e9; color:#2e7d32; padding:3px 10px; border-radius:12px; font-size:.78rem; font-weight:600; }
    .badge-inactive { background:#ffebee; color:#c62828; padding:3px 10px; border-radius:12px; font-size:.78rem; font-weight:600; }

    .action-btns { display:flex; }
    .emp-row { transition:background .15s; }
    .emp-row:hover { background:rgba(26,35,126,.04)!important; }
    :host-context([data-theme='dark']) .emp-row:hover { background:rgba(130,177,255,.06)!important; }

    .no-data-cell { text-align:center!important; padding:3rem!important; color:#bbb; }
    .no-data-cell mat-icon { font-size:56px; width:56px; height:56px; display:block; margin:0 auto .75rem; }
    .no-data-cell p { font-size:1rem; margin:0 0 .25rem; }
    .no-data-cell small { font-size:.8rem; }

    .confirm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .confirm-dialog  { background:white; border-radius:16px; padding:2rem; max-width:440px; width:90%; text-align:center; box-shadow:0 24px 48px rgba(0,0,0,.2); }
    :host-context([data-theme='dark']) .confirm-dialog { background:#1e1e2e; }
    .warn-icon-wrap  { margin-bottom:.75rem; }
    .warn-icon       { font-size:56px; width:56px; height:56px; color:#e53935; }
    .confirm-dialog h3 { font-size:1.25rem; font-weight:700; margin:0 0 .75rem; }
    .confirm-dialog p  { color:#666; margin:0 0 1.5rem; line-height:1.6; }
    .dialog-actions { display:flex; justify-content:center; gap:1rem; }
  `]
})
export class EmployeeListComponent implements OnInit {
  employees    = signal<Employee[]>([]);
  totalCount   = signal(0);
  loading      = signal(false);
  deleteTarget = signal<Employee | null>(null);
  deleting     = signal(false);

  searchText   = '';
  codeText     = '';
  deptFilter   = 0;
  statusFilter = '';
  departments  = DEPARTMENTS;
  displayedColumns = ['avatar','employeeCode','fullName','phone','department','role','salary','joiningDate','status','actions'];

  filter: EmployeeFilter = { page:1, pageSize:10, sortBy:'FullName', sortDir:'asc' };
  private searchTimer: any;

  constructor(private empSvc: EmployeeService, private snack: MatSnackBar) {}

  ngOnInit() { this.loadEmployees(); }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.filter.page = 1;
      this.loadEmployees();
    }, 400);
  }

  loadEmployees() {
    this.loading.set(true);
    this.filter.search       = this.searchText   || undefined;
    this.filter.employeeCode = this.codeText      || undefined;
    this.filter.departmentId = this.deptFilter    || undefined;
    this.filter.status       = this.statusFilter  || undefined;

    this.empSvc.getAll(this.filter).subscribe({
      next: res => {
        this.employees.set(res.data);
        this.totalCount.set(res.totalCount);
      },
      error: () => this.snack.open('Failed to load employees', 'Close', { duration: 3000 }),
      complete: () => this.loading.set(false)
    });
  }

  onPageChange(e: PageEvent) {
    this.filter.page     = e.pageIndex + 1;
    this.filter.pageSize = e.pageSize;
    this.loadEmployees();
  }

  resetFilters() {
    this.searchText = ''; this.codeText = ''; this.deptFilter = 0; this.statusFilter = '';
    this.filter.page = 1;
    this.loadEmployees();
  }

  confirmDelete(e: Employee) { this.deleteTarget.set(e); }

  doDelete() {
    const e = this.deleteTarget();
    if (!e) return;
    this.deleting.set(true);
    this.empSvc.delete(e.employeeId).subscribe({
      next: () => {
        this.snack.open(`${e.fullName} deleted successfully`, 'Close', { duration: 3000 });
        this.deleteTarget.set(null);
        this.loadEmployees();
      },
      error: () => this.snack.open('Delete failed', 'Close', { duration: 3000 }),
      complete: () => this.deleting.set(false)
    });
  }

  initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
