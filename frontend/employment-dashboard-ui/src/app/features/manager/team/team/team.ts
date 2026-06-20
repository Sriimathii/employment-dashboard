import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { EmployeeService } from '../../../../core/services/employee.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import type { Employee } from '../../../../core/models/employee.model';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatChipsModule, MatInputModule, MatFormFieldModule, MatDividerModule
  ],
  template: `
<div class="page-container">

  <div class="page-header">
    <div>
      <h1>My Team</h1>
      <p *ngIf="teamDept">Department: <strong>{{ teamDept }}</strong> &nbsp;·&nbsp; {{ total() }} members</p>
      <p *ngIf="!teamDept">{{ total() }} team members</p>
    </div>
    <mat-form-field appearance="outline" class="search-field">
      <mat-label>Search team member</mat-label>
      <input matInput [(ngModel)]="searchQuery" (ngModelChange)="filterEmployees()" placeholder="Name or email">
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>
  </div>

  <!-- Team stats row -->
  <div class="team-stats" *ngIf="total() > 0">
    <div class="ts-item">
      <span class="ts-val">{{ activeCount }}</span>
      <span class="ts-lbl">Active</span>
    </div>
    <div class="ts-item inactive">
      <span class="ts-val">{{ total() - activeCount }}</span>
      <span class="ts-lbl">Inactive</span>
    </div>
  </div>

  <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>

  <div class="team-grid">
    <mat-card class="team-card" *ngFor="let e of filtered()">
      <div class="card-top" [class.inactive-card]="e.isInactive">
        <div class="team-avatar" [style.background]="avatarColor(e.fullName)">
          {{ initials(e.fullName) }}
        </div>
        <span class="status-badge" [class.active]="e.status === 'Active'" [class.inactive]="e.status !== 'Active'">
          {{ e.status }}
        </span>
      </div>

      <h3>{{ e.fullName }}</h3>
      <p class="code">{{ e.employeeCode }}</p>
      <p class="dept">{{ e.departmentName || '—' }}</p>
      <p class="role" *ngIf="e.roleName">{{ e.roleName }}</p>

      <mat-divider style="margin:.75rem 0"></mat-divider>

      <div class="contact-row">
        <mat-icon>email</mat-icon>
        <a [href]="'mailto:' + e.email">{{ e.email }}</a>
      </div>
      <div class="contact-row" *ngIf="e.phoneNumber">
        <mat-icon>phone</mat-icon>
        <a [href]="'tel:' + e.phoneNumber">{{ e.phoneNumber }}</a>
      </div>
      <div class="contact-row" *ngIf="e.joiningDate">
        <mat-icon>event</mat-icon>
        <span>Joined {{ e.joiningDate | date:'mediumDate' }}</span>
      </div>

      <div class="inactive-notice" *ngIf="e.isInactive">
        <mat-icon>lock</mat-icon> Read-Only Account
      </div>
    </mat-card>

    <div class="empty-state" *ngIf="!loading() && filtered().length === 0">
      <mat-icon>group_off</mat-icon>
      <p *ngIf="searchQuery">No team members match "{{ searchQuery }}"</p>
      <p *ngIf="!searchQuery">No team members assigned to your department yet.</p>
      <small *ngIf="!searchQuery">Contact your Admin to assign employees to your team.</small>
    </div>
  </div>
</div>`,
  styles: [`
    .page-container { padding: 1.5rem; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
    .page-header h1 { font-size: 1.75rem; font-weight: 700; color: #1a237e; margin: 0; }
    .page-header p  { color: #666; margin: .25rem 0 0; font-size: .875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color: #82b1ff; }
    .search-field { min-width: 240px; }

    .team-stats { display: flex; gap: 1rem; margin-bottom: 1.25rem; }
    .ts-item { background: #e8f5e9; color: #2e7d32; padding: .5rem 1.25rem; border-radius: 20px; display: flex; align-items: center; gap: .4rem; }
    .ts-item.inactive { background: #ffebee; color: #c62828; }
    .ts-val { font-size: 1.1rem; font-weight: 800; }
    .ts-lbl { font-size: .8rem; font-weight: 500; }

    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
    .team-card { border-radius: 14px !important; padding: 1.25rem !important; transition: transform .2s, box-shadow .2s; }
    .team-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.1) !important; }

    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: .75rem; }
    .inactive-card .team-avatar { opacity: .55; }
    .team-avatar { width: 56px; height: 56px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; }
    .status-badge { padding: 3px 9px; border-radius: 12px; font-size: .72rem; font-weight: 600; }
    .status-badge.active   { background: #e8f5e9; color: #2e7d32; }
    .status-badge.inactive { background: #ffebee; color: #c62828; }

    .team-card h3  { font-size: 1rem; font-weight: 700; margin: 0 0 .2rem; color: #1a237e; }
    :host-context([data-theme='dark']) .team-card h3 { color: #82b1ff; }
    .code { color: #888; font-size: .75rem; margin: 0; font-family: monospace; }
    .dept { color: #555; font-size: .8rem; margin: .15rem 0 0; }
    .role { color: #7b1fa2; font-size: .78rem; margin: .15rem 0 0; font-weight: 600; }
    :host-context([data-theme='dark']) .dept { color: rgba(255,255,255,.55); }

    .contact-row { display: flex; align-items: center; gap: .4rem; font-size: .8rem; color: #555; margin-top: .3rem; }
    .contact-row mat-icon { font-size: 15px; width: 15px; height: 15px; color: #1565c0; flex-shrink: 0; }
    .contact-row a { color: inherit; text-decoration: none; }
    .contact-row a:hover { color: #1a237e; text-decoration: underline; }
    :host-context([data-theme='dark']) .contact-row { color: rgba(255,255,255,.55); }

    .inactive-notice { display: flex; align-items: center; gap: .3rem; background: #fff3e0; color: #e65100; border-radius: 6px; padding: .35rem .6rem; font-size: .75rem; font-weight: 600; margin-top: .75rem; }
    .inactive-notice mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .empty-state { grid-column: 1/-1; text-align: center; padding: 3rem; color: #bbb; }
    .empty-state mat-icon { font-size: 56px; width: 56px; height: 56px; display: block; margin: 0 auto .75rem; }
    .empty-state p { font-size: 1rem; margin: 0 0 .25rem; color: #999; }
    .empty-state small { font-size: .8rem; color: #bbb; }
  `]
})
export class TeamComponent implements OnInit {
  employees = signal<Employee[]>([]);
  filtered  = signal<Employee[]>([]);
  total     = signal(0);
  loading   = signal(false);
  searchQuery = '';
  teamDept    = '';

  get activeCount(): number { return this.employees().filter(e => e.status === 'Active').length; }

  constructor(
    private empSvc:  EmployeeService,
    private dashSvc: DashboardService
  ) {}

  ngOnInit() {
    this.loading.set(true);
    // Backend auto-filters employees to manager's department — no extra param needed
    this.empSvc.getAll({ page: 1, pageSize: 200 }).subscribe({
      next: r => {
        this.employees.set(r.data);
        this.filtered.set(r.data);
        this.total.set(r.totalCount);
        if (r.data.length > 0) this.teamDept = r.data[0].departmentName ?? '';
      },
      complete: () => this.loading.set(false)
    });
  }

  filterEmployees() {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered.set(q
      ? this.employees().filter(e =>
          e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
      : this.employees()
    );
  }

  initials(name: string): string { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }

  avatarColor(name: string): string {
    const colors = ['#1a237e','#4527a0','#283593','#00695c','#2e7d32','#6a1b9a','#c62828','#e65100','#00838f'];
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
    return colors[Math.abs(h)];
  }
}