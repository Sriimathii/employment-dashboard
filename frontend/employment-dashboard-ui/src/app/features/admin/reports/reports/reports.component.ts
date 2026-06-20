import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

interface Department { departmentId: number; departmentName: string; }

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatExpansionModule, MatDividerModule, MatChipsModule
  ],
  template: `
<div class="page-container">
  <div class="page-header">
    <div><h1>Reports & Exports</h1><p>Filter and download reports in Excel or PDF format</p></div>
  </div>

  <!-- ── Employee Report ───────────────────────────────── -->
  <mat-card class="report-card">
    <div class="report-header">
      <div class="report-icon" style="background:#1a237e"><mat-icon>people</mat-icon></div>
      <div class="report-title-block">
        <h3>Employee Report</h3>
        <p>All employees with department, role, status, salary and joining date.</p>
      </div>
    </div>

    <mat-expansion-panel class="filter-panel">
      <mat-expansion-panel-header>
        <mat-panel-title><mat-icon>filter_list</mat-icon>&nbsp;Filters</mat-panel-title>
        <mat-panel-description *ngIf="hasEmpFilters()">
          <mat-chip-set>
            <mat-chip *ngIf="empFilter.departmentId">Dept: {{ deptName(empFilter.departmentId) }}</mat-chip>
            <mat-chip *ngIf="empFilter.status">Status: {{ empFilter.status }}</mat-chip>
            <mat-chip *ngIf="empFilter.search">Search: {{ empFilter.search }}</mat-chip>
          </mat-chip-set>
        </mat-panel-description>
      </mat-expansion-panel-header>

      <div class="filter-row">
        <mat-form-field appearance="outline">
          <mat-label>Department</mat-label>
          <mat-select [(ngModel)]="empFilter.departmentId">
            <mat-option [value]="null">All Departments</mat-option>
            <mat-option *ngFor="let d of departments()" [value]="d.departmentId">{{ d.departmentName }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="empFilter.status">
            <mat-option value="">All</mat-option>
            <mat-option value="Active">Active</mat-option>
            <mat-option value="Inactive">Inactive</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Search (name / email / code)</mat-label>
          <input matInput [(ngModel)]="empFilter.search" placeholder="e.g. John">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <button mat-stroked-button color="warn" (click)="clearEmpFilters()">
          <mat-icon>clear</mat-icon> Clear
        </button>
      </div>
    </mat-expansion-panel>

    <div class="report-actions">
      <button mat-raised-button color="primary"
              (click)="download('employees', 'excel')"
              [disabled]="downloading()">
        <mat-spinner diameter="16" *ngIf="downloading()"></mat-spinner>
        <mat-icon *ngIf="!downloading()">table_view</mat-icon> Excel
      </button>
      <button mat-stroked-button color="accent"
              (click)="download('employees', 'pdf')"
              [disabled]="downloading()">
        <mat-icon>picture_as_pdf</mat-icon> PDF
      </button>
    </div>
  </mat-card>

  <!-- ── Attendance Report ─────────────────────────────── -->
  <mat-card class="report-card">
    <div class="report-header">
      <div class="report-icon" style="background:#00838f"><mat-icon>schedule</mat-icon></div>
      <div class="report-title-block">
        <h3>Attendance Report</h3>
        <p>Attendance records with check-in/out times and working hours.</p>
      </div>
    </div>

    <mat-expansion-panel class="filter-panel">
      <mat-expansion-panel-header>
        <mat-panel-title><mat-icon>filter_list</mat-icon>&nbsp;Filters</mat-panel-title>
        <mat-panel-description *ngIf="hasAttFilters()">
          <mat-chip-set>
            <mat-chip *ngIf="attFilter.from">From: {{ attFilter.from }}</mat-chip>
            <mat-chip *ngIf="attFilter.to">To: {{ attFilter.to }}</mat-chip>
            <mat-chip *ngIf="attFilter.departmentId">Dept: {{ deptName(attFilter.departmentId) }}</mat-chip>
            <mat-chip *ngIf="attFilter.status">Status: {{ attFilter.status }}</mat-chip>
          </mat-chip-set>
        </mat-panel-description>
      </mat-expansion-panel-header>

      <div class="filter-row">
        <mat-form-field appearance="outline">
          <mat-label>From Date</mat-label>
          <input matInput type="date" [(ngModel)]="attFilter.from">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>To Date</mat-label>
          <input matInput type="date" [(ngModel)]="attFilter.to">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Department</mat-label>
          <mat-select [(ngModel)]="attFilter.departmentId">
            <mat-option [value]="null">All Departments</mat-option>
            <mat-option *ngFor="let d of departments()" [value]="d.departmentId">{{ d.departmentName }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="attFilter.status">
            <mat-option value="">All</mat-option>
            <mat-option value="Present">Present</mat-option>
            <mat-option value="Absent">Absent</mat-option>
            <mat-option value="Late">Late</mat-option>
            <mat-option value="Half Day">Half Day</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button color="warn" (click)="clearAttFilters()">
          <mat-icon>clear</mat-icon> Clear
        </button>
      </div>
    </mat-expansion-panel>

    <div class="report-actions">
      <button mat-raised-button color="primary"
              (click)="download('attendance', 'excel')"
              [disabled]="downloading()">
        <mat-spinner diameter="16" *ngIf="downloading()"></mat-spinner>
        <mat-icon *ngIf="!downloading()">table_view</mat-icon> Excel
      </button>
      <button mat-stroked-button color="accent"
              (click)="download('attendance', 'pdf')"
              [disabled]="downloading()">
        <mat-icon>picture_as_pdf</mat-icon> PDF
      </button>
    </div>
  </mat-card>

  <!-- ── Leave Report ──────────────────────────────────── -->
  <mat-card class="report-card">
    <div class="report-header">
      <div class="report-icon" style="background:#2e7d32"><mat-icon>event_available</mat-icon></div>
      <div class="report-title-block">
        <h3>Leave Report</h3>
        <p>All leave requests grouped by type, status and department.</p>
      </div>
    </div>

    <mat-expansion-panel class="filter-panel">
      <mat-expansion-panel-header>
        <mat-panel-title><mat-icon>filter_list</mat-icon>&nbsp;Filters</mat-panel-title>
        <mat-panel-description *ngIf="hasLeaveFilters()">
          <mat-chip-set>
            <mat-chip *ngIf="leaveFilter.from">From: {{ leaveFilter.from }}</mat-chip>
            <mat-chip *ngIf="leaveFilter.to">To: {{ leaveFilter.to }}</mat-chip>
            <mat-chip *ngIf="leaveFilter.departmentId">Dept: {{ deptName(leaveFilter.departmentId) }}</mat-chip>
            <mat-chip *ngIf="leaveFilter.status">Status: {{ leaveFilter.status }}</mat-chip>
            <mat-chip *ngIf="leaveFilter.leaveType">Type: {{ leaveFilter.leaveType }}</mat-chip>
          </mat-chip-set>
        </mat-panel-description>
      </mat-expansion-panel-header>

      <div class="filter-row">
        <mat-form-field appearance="outline">
          <mat-label>From Date</mat-label>
          <input matInput type="date" [(ngModel)]="leaveFilter.from">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>To Date</mat-label>
          <input matInput type="date" [(ngModel)]="leaveFilter.to">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Department</mat-label>
          <mat-select [(ngModel)]="leaveFilter.departmentId">
            <mat-option [value]="null">All Departments</mat-option>
            <mat-option *ngFor="let d of departments()" [value]="d.departmentId">{{ d.departmentName }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="leaveFilter.status">
            <mat-option value="">All</mat-option>
            <mat-option value="Pending">Pending</mat-option>
            <mat-option value="Approved">Approved</mat-option>
            <mat-option value="Rejected">Rejected</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Leave Type</mat-label>
          <mat-select [(ngModel)]="leaveFilter.leaveType">
            <mat-option value="">All</mat-option>
            <mat-option value="Annual">Annual</mat-option>
            <mat-option value="Sick">Sick</mat-option>
            <mat-option value="Casual">Casual</mat-option>
            <mat-option value="Unpaid">Unpaid</mat-option>
            <mat-option value="Maternity">Maternity</mat-option>
            <mat-option value="Paternity">Paternity</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-stroked-button color="warn" (click)="clearLeaveFilters()">
          <mat-icon>clear</mat-icon> Clear
        </button>
      </div>
    </mat-expansion-panel>

    <div class="report-actions">
      <button mat-raised-button color="primary"
              (click)="download('leave', 'excel')"
              [disabled]="downloading()">
        <mat-spinner diameter="16" *ngIf="downloading()"></mat-spinner>
        <mat-icon *ngIf="!downloading()">table_view</mat-icon> Excel
      </button>
      <button mat-stroked-button color="accent"
              (click)="download('leave', 'pdf')"
              [disabled]="downloading()">
        <mat-icon>picture_as_pdf</mat-icon> PDF
      </button>
    </div>
  </mat-card>
</div>`,
  styles: [`
    .page-container { padding:1.5rem; }
    .page-header h1 { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0 0 .25rem; }
    .page-header p  { color:#666; margin:0 0 1.5rem; font-size:.875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color:#82b1ff; }

    .report-card { border-radius:12px!important; margin-bottom:1.25rem; padding:0!important; overflow:hidden; }

    .report-header { display:flex; align-items:center; gap:1rem; padding:1.25rem 1.5rem 0.75rem; }
    .report-icon { width:52px; height:52px; border-radius:12px; display:flex; align-items:center;
                   justify-content:center; flex-shrink:0; }
    .report-icon mat-icon { color:white; font-size:26px; width:26px; height:26px; }
    .report-title-block h3 { font-size:1.1rem; font-weight:600; margin:0 0 .25rem; }
    .report-title-block p  { color:#666; font-size:.875rem; margin:0; }

    .filter-panel { margin:0 1rem .75rem!important; box-shadow:none!important;
                    border:1px solid #e0e0e0!important; border-radius:8px!important; }
    .filter-row { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; padding:.5rem 0; }
    .filter-row mat-form-field { flex:1; min-width:160px; }

    .report-actions { display:flex; gap:.75rem; flex-wrap:wrap; padding:.75rem 1.5rem 1.25rem; }
  `]
})
export class ReportsComponent implements OnInit {
  downloading  = signal(false);
  departments  = signal<Department[]>([]);

  empFilter   = { departmentId: null as number|null, status: '', search: '' };
  attFilter   = { from: '', to: '', departmentId: null as number|null, status: '' };
  leaveFilter = { from: '', to: '', departmentId: null as number|null, status: '', leaveType: '' };

  constructor(
    private auth:  AuthService,
    private http:  HttpClient,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.http.get<Department[]>(`${environment.apiUrl}/departments`).subscribe({
      next: d => this.departments.set(d)
    });
  }

  deptName(id: number | null): string {
    return this.departments().find(d => d.departmentId === id)?.departmentName ?? '';
  }

  hasEmpFilters()   { return !!(this.empFilter.departmentId || this.empFilter.status || this.empFilter.search); }
  hasAttFilters()   { return !!(this.attFilter.from || this.attFilter.to || this.attFilter.departmentId || this.attFilter.status); }
  hasLeaveFilters() { return !!(this.leaveFilter.from || this.leaveFilter.to || this.leaveFilter.departmentId || this.leaveFilter.status || this.leaveFilter.leaveType); }

  clearEmpFilters()   { this.empFilter   = { departmentId: null, status: '', search: '' }; }
  clearAttFilters()   { this.attFilter   = { from: '', to: '', departmentId: null, status: '' }; }
  clearLeaveFilters() { this.leaveFilter = { from: '', to: '', departmentId: null, status: '', leaveType: '' }; }

  download(type: 'employees' | 'attendance' | 'leave', format: 'excel' | 'pdf') {
    const token = this.auth.getToken();
    if (!token) { this.snack.open('Not authenticated', 'Close', { duration: 3000 }); return; }

    const params = new URLSearchParams({ format });

    if (type === 'employees') {
      if (this.empFilter.departmentId) params.set('departmentId', String(this.empFilter.departmentId));
      if (this.empFilter.status)       params.set('status', this.empFilter.status);
      if (this.empFilter.search)       params.set('search', this.empFilter.search);
    }
    if (type === 'attendance') {
      if (this.attFilter.from)         params.set('from', this.attFilter.from);
      if (this.attFilter.to)           params.set('to',   this.attFilter.to);
      if (this.attFilter.departmentId) params.set('departmentId', String(this.attFilter.departmentId));
      if (this.attFilter.status)       params.set('status', this.attFilter.status);
    }
    if (type === 'leave') {
      if (this.leaveFilter.from)         params.set('from', this.leaveFilter.from);
      if (this.leaveFilter.to)           params.set('to',   this.leaveFilter.to);
      if (this.leaveFilter.departmentId) params.set('departmentId', String(this.leaveFilter.departmentId));
      if (this.leaveFilter.status)       params.set('status', this.leaveFilter.status);
      if (this.leaveFilter.leaveType)    params.set('leaveType', this.leaveFilter.leaveType);
    }

    const ext      = format === 'excel' ? 'xlsx' : 'pdf';
    const label    = type.charAt(0).toUpperCase() + type.slice(1);
    const filename = `${label}_Report_${new Date().toISOString().slice(0,10)}.${ext}`;
    const url      = `${environment.apiUrl}/reports/export/${type}?${params.toString()}`;

    this.downloading.set(true);

    fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.blob(); })
    .then(blob => {
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      this.snack.open('Download started!', 'Close', { duration: 2000 });
    })
    .catch(err => this.snack.open('Download failed: ' + err.message, 'Close', { duration: 4000 }))
    .finally(()  => this.downloading.set(false));
  }
}