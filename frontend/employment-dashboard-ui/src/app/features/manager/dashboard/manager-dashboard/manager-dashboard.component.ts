import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { LeaveService } from '../../../../core/services/leave.service';
import { CheckinWidgetComponent } from '../../../../shared/components/checkin-widget/checkin-widget.component';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    RouterModule,
    CheckinWidgetComponent   // ← Manager check-in widget
  ],
  template: `
<div class="page-container">

  <!-- Header -->
  <div class="page-header">
    <div>
      <h1>Manager Dashboard</h1>
      <p>Welcome back, {{ firstName }} &nbsp;·&nbsp; {{ today | date:'fullDate' }}</p>
    </div>
  </div>

  <!-- ── CHECK-IN / CHECK-OUT WIDGET ──────────────────────── -->
  <app-checkin-widget></app-checkin-widget>

  <mat-progress-bar *ngIf="loading" mode="indeterminate" style="margin-bottom:1rem;border-radius:4px"></mat-progress-bar>

  <!-- ── Stat Cards ──────────────────────────────────────── -->
  <div class="stat-grid">

    <mat-card class="stat-card">
      <div class="s-icon" style="background:#f9a825">
        <mat-icon>pending_actions</mat-icon>
      </div>
      <div class="s-info">
        <span class="s-val">{{ pendingLeaves }}</span>
        <span class="s-lbl">Pending Leaves</span>
      </div>
    </mat-card>

    <mat-card class="stat-card">
      <div class="s-icon" style="background:#1a237e">
        <mat-icon>group</mat-icon>
      </div>
      <div class="s-info">
        <span class="s-val">{{ totalTeam }}</span>
        <span class="s-lbl">Team Members</span>
      </div>
    </mat-card>

    <mat-card class="stat-card">
      <div class="s-icon" style="background:#2e7d32">
        <mat-icon>how_to_reg</mat-icon>
      </div>
      <div class="s-info">
        <span class="s-val">{{ presentToday }}</span>
        <span class="s-lbl">Present Today</span>
      </div>
    </mat-card>

    <mat-card class="stat-card">
      <div class="s-icon" style="background:#c62828">
        <mat-icon>person_off</mat-icon>
      </div>
      <div class="s-info">
        <span class="s-val">{{ absentToday }}</span>
        <span class="s-lbl">Absent Today</span>
      </div>
    </mat-card>

  </div>
  <!-- ── Attendance bar ────────────────────────────────── -->
  <mat-card class="overview-card" *ngIf="!loading && totalTeam > 0" style="margin-top:1.5rem">
    <mat-card-header>
      <mat-card-title>Today's Team Overview</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      <div class="overview-row">
        <div class="ov-item">
          <span class="ov-num" style="color:#2e7d32">{{ presentToday }}</span>
          <span class="ov-lbl">Present</span>
        </div>
        <div class="ov-div"></div>
        <div class="ov-item">
          <span class="ov-num" style="color:#c62828">{{ absentToday }}</span>
          <span class="ov-lbl">Absent</span>
        </div>
        <div class="ov-div"></div>
        <div class="ov-item">
          <span class="ov-num" style="color:#f57f17">{{ pendingLeaves }}</span>
          <span class="ov-lbl">Pending Leaves</span>
        </div>
        <div class="ov-div"></div>
        <div class="ov-item">
          <span class="ov-num" style="color:#1a237e">{{ totalTeam }}</span>
          <span class="ov-lbl">Total Team</span>
        </div>
      </div>

      <!-- Attendance % bar -->
      <div style="margin-top:1rem">
        <div style="display:flex;justify-content:space-between;font-size:.85rem;color:#666;margin-bottom:.4rem">
          <span>Team Attendance Rate</span>
          <strong>{{ attendanceRate }}%</strong>
        </div>
        <div style="background:#f0f0f0;border-radius:10px;height:10px;overflow:hidden">
          <div style="height:100%;background:linear-gradient(90deg,#43a047,#66bb6a);border-radius:10px;transition:width .6s ease"
               [style.width]="attendanceRate + '%'">
          </div>
        </div>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- ── Quick Actions ──────────────────────────────────── -->
  <div class="section-title">Quick Actions</div>
  <div class="action-grid">

    <mat-card class="action-card" routerLink="/manager/leave">
      <div class="ac-icon" style="background:#fff3e0">
        <mat-icon style="color:#f57f17">event_available</mat-icon>
      </div>
      <span class="ac-label">Review Leave Requests</span>
      <span class="ac-badge" *ngIf="pendingLeaves > 0">{{ pendingLeaves }}</span>
    </mat-card>

    <mat-card class="action-card" routerLink="/manager/team">
      <div class="ac-icon" style="background:#e3f2fd">
        <mat-icon style="color:#1565c0">group</mat-icon>
      </div>
      <span class="ac-label">View My Team</span>
    </mat-card>

    <mat-card class="action-card" routerLink="/manager/attendance">
      <div class="ac-icon" style="background:#e8f5e9">
        <mat-icon style="color:#2e7d32">schedule</mat-icon>
      </div>
      <span class="ac-label">Team Attendance</span>
    </mat-card>

    <mat-card class="action-card" routerLink="/manager/notifications">
      <div class="ac-icon" style="background:#f3e5f5">
        <mat-icon style="color:#7b1fa2">notifications</mat-icon>
      </div>
      <span class="ac-label">Notifications</span>
    </mat-card>

  </div>

  

</div>`,
  styles: [`
    .page-container { padding:1.5rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
    .page-header h1 { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0; }
    .page-header p  { color:#666; margin:.3rem 0 0; font-size:.875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color:#82b1ff; }
    :host-context([data-theme='dark']) .page-header p  { color:#9e9e9e; }

    /* Stat grid */
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(175px,1fr)); gap:1rem; margin-bottom:1.5rem; }
    .stat-card { border-radius:12px!important; padding:1.1rem!important; display:flex!important; align-items:center; gap:.9rem; box-shadow:0 2px 10px rgba(0,0,0,.07)!important; transition:transform .15s; }
    .stat-card:hover { transform:translateY(-2px); }
    :host-context([data-theme='dark']) .stat-card { background:#1a1a2e!important; }
    .s-icon { width:50px; height:50px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .s-icon mat-icon { color:white; font-size:24px; width:24px; height:24px; }
    .s-val  { display:block; font-size:1.65rem; font-weight:700; line-height:1.1; }
    .s-lbl  { display:block; font-size:.7rem; color:#888; margin-top:.25rem; text-transform:uppercase; letter-spacing:.4px; }

    /* Section */
    .section-title { font-size:1.05rem; font-weight:700; color:#1a237e; margin:0 0 1rem; }
    :host-context([data-theme='dark']) .section-title { color:#82b1ff; }

    /* Action grid */
    .action-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:1rem; }
    .action-card { border-radius:12px!important; padding:1.15rem!important; display:flex!important; align-items:center; gap:.85rem; cursor:pointer; transition:all .2s; position:relative; box-shadow:0 2px 8px rgba(0,0,0,.06)!important; }
    .action-card:hover { transform:translateY(-3px); box-shadow:0 6px 20px rgba(0,0,0,.12)!important; }
    :host-context([data-theme='dark']) .action-card { background:#1a1a2e!important; }
    .ac-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .ac-icon mat-icon { font-size:22px; width:22px; height:22px; }
    .ac-label { font-size:.9rem; font-weight:600; flex:1; }
    .ac-badge { background:#e53935; color:white; border-radius:12px; padding:2px 8px; font-size:.75rem; font-weight:700; }

    /* Overview */
    .overview-card { border-radius:12px!important; }
    :host-context([data-theme='dark']) .overview-card { background:#1a1a2e!important; }
    .overview-row { display:flex; align-items:center; justify-content:space-around; padding:.75rem 0; flex-wrap:wrap; gap:1rem; }
    .ov-item { text-align:center; }
    .ov-num  { display:block; font-size:2rem; font-weight:800; line-height:1; }
    .ov-lbl  { display:block; font-size:.72rem; color:#888; margin-top:.3rem; text-transform:uppercase; letter-spacing:.5px; }
    .ov-div  { width:1px; height:48px; background:#eee; }
    :host-context([data-theme='dark']) .ov-div { background:rgba(255,255,255,0.08); }
  `]
})
export class ManagerDashboardComponent implements OnInit {
  loading        = false;
  today          = new Date();
  firstName      = '';
  pendingLeaves  = 0;
  totalTeam      = 0;
  presentToday   = 0;
  absentToday    = 0;
  attendanceRate = 0;

  constructor(
    private auth:     AuthService,
    private dashSvc:  DashboardService,
    private leaveSvc: LeaveService
  ) {}

  ngOnInit(): void {
    this.firstName = (this.auth.currentUser()?.fullName ?? 'Manager').split(' ')[0];
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.dashSvc.getManagerStats().subscribe({
      next: (d: any) => {
        this.totalTeam     = d.totalTeam    ?? 0;
        this.presentToday  = d.presentToday ?? 0;
        this.absentToday   = Math.max(0, this.totalTeam - this.presentToday);
        this.attendanceRate = this.totalTeam > 0
          ? Math.round((this.presentToday / this.totalTeam) * 100) : 0;
      },
      error: () => { this.loading = false; },
      complete: () => { this.loading = false; }
    });

    this.leaveSvc.getAll('Pending', 1, 100).subscribe({
      next: r => { this.pendingLeaves = r.total; },
      error: () => {}
    });
  }
}