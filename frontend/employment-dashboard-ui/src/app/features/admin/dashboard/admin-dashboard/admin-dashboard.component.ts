import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { ChartService } from '../../../../core/services/chart.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CheckinWidgetComponent } from '../../../../shared/components/checkin-widget/checkin-widget.component';
import { Chart } from 'chart.js';

const COLORS = [
  '#1a237e','#1565c0','#0288d1','#00838f',
  '#2e7d32','#558b2f','#f9a825','#e65100','#c62828','#6a1b9a'
];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatButtonModule, CheckinWidgetComponent],
  template: `
<div class="dash-wrap">

  <div class="dash-header">
    <div>
      <h1 class="dash-title">Admin Dashboard</h1>
      <p class="dash-sub">Welcome, {{ userName }}&nbsp;&nbsp;·&nbsp;&nbsp;{{ today | date:'fullDate' }}</p>
    </div>
    <button mat-stroked-button (click)="refresh()">
      <mat-icon>refresh</mat-icon> Refresh
    </button>
  </div>

  <app-checkin-widget></app-checkin-widget>

  <mat-progress-bar *ngIf="loading" mode="indeterminate" style="margin-bottom:1rem;border-radius:4px"></mat-progress-bar>

  <!-- Stat Cards -->
  <div class="stat-grid" *ngIf="!loading">
    <div class="stat-card" *ngFor="let s of statCards; let i = index" [style.animation-delay]="(i*0.06)+'s'">
      <div class="s-icon" [style.background]="s.bg">
        <mat-icon>{{ s.icon }}</mat-icon>
      </div>
      <div class="s-info">
        <span class="s-val">{{ s.value }}</span>
        <span class="s-lbl">{{ s.label }}</span>
      </div>
    </div>
  </div>
  <!-- Charts — always in DOM so ViewChild static:true works -->
  <div [class.charts-hidden]="loading">
   <!-- Row 3: Today's Attendance Summary -->
    <mat-card class="today-summary-card" *ngIf="!loading">
      <mat-card-header>
        <mat-card-title>📍 Today's Attendance Snapshot — {{ today | date:'MMMM d, yyyy' }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="today-snap">
          <div class="snap-item present">
            <mat-icon>check_circle</mat-icon>
            <span class="snap-val">{{ presentToday }}</span>
            <span class="snap-lbl">Present</span>
          </div>
          <div class="snap-item absent">
            <mat-icon>event_busy</mat-icon>
            <span class="snap-val">{{ absentToday }}</span>
            <span class="snap-lbl">Absent</span>
          </div>
          <div class="snap-item leave">
            <mat-icon>beach_access</mat-icon>
            <span class="snap-val">{{ onLeaveToday }}</span>
            <span class="snap-lbl">On Leave</span>
          </div>
          <div class="snap-item rate">
            <mat-icon>show_chart</mat-icon>
            <span class="snap-val">{{ attPct }}%</span>
            <span class="snap-lbl">Attendance Rate</span>
          </div>
        </div>
        <div class="att-bar-wrap">
          <div class="att-bar" [style.width.%]="attPct"
               [style.background]="attPct >= 75 ? '#43a047' : attPct >= 50 ? '#fb8c00' : '#e53935'">
          </div>
        </div>
      </mat-card-content>
    </mat-card>

  </div>

  

    <!-- Row 1: Daily Attendance Chart (current month) + Dept Pie -->
    <div class="chart-row-grid">

      <mat-card class="chart-card">
        <mat-card-header>
          <mat-card-title>📅 Daily Attendance — {{ currentMonth }}</mat-card-title>
          <mat-card-subtitle>Stacked daily view — Present · Late · Absent · Leave types</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div style="position:relative;height:340px;width:100%;padding-top:.5rem">
            <canvas #dailyCanvas></canvas>
          </div>
          <p class="empty-note" *ngIf="!loading && noDaily">
            No attendance recorded yet this month
          </p>
        </mat-card-content>
      </mat-card>

      <mat-card class="chart-card">
        <mat-card-header>
          <mat-card-title>🥧 Employees by Department</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div style="position:relative;height:280px;width:100%;padding-top:.5rem">
            <canvas #pieCanvas></canvas>
          </div>
          <p class="empty-note" *ngIf="!loading && noPie">No employees assigned to departments</p>
        </mat-card-content>
      </mat-card>

    </div>

    <!-- Row 2: Donut (Active vs Inactive) + Leave Types -->
    <div class="chart-row-grid">

      <mat-card class="chart-card">
        <mat-card-header>
          <mat-card-title>🍩 Active vs Inactive Employees</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div style="position:relative;height:230px;width:100%;padding-top:.5rem">
            <canvas #donutCanvas></canvas>
          </div>
          <div class="donut-legend" *ngIf="!loading">
            <span><span class="dot" style="background:#43a047"></span> Active ({{ activeEmp }})</span>
            <span><span class="dot" style="background:#e53935"></span> Inactive ({{ inactiveEmp }})</span>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="chart-card">
        <mat-card-header>
          <mat-card-title>📋 Leave Requests by Type</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div style="position:relative;height:260px;width:100%;padding-top:.5rem">
            <canvas #hbarCanvas></canvas>
          </div>
          <p class="empty-note" *ngIf="!loading && noLeave">No leave requests submitted yet</p>
        </mat-card-content>
      </mat-card>

    </div>

   
</div>`,
 styles: [`
  /* ==========================================
     DASHBOARD LAYOUT
  ========================================== */

  .dash-wrap {
    padding: 1.75rem;
    animation: fadeIn .45s ease;
  }

  .dash-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .dash-title {
    margin: 0;
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -.5px;

    background: linear-gradient(
      135deg,
      #1a237e,
      #3949ab,
      #5c6bc0
    );

    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .dash-sub {
    margin: .35rem 0 0;
    color: #64748b;
    font-size: .95rem;
    font-weight: 500;
  }

  :host-context([data-theme='dark']) .dash-title {
    background: linear-gradient(
      135deg,
      #82b1ff,
      #64b5f6,
      #90caf9
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :host-context([data-theme='dark']) .dash-sub {
    color: #94a3b8;
  }

  /* ==========================================
     KPI STAT CARDS
  ========================================== */

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    position: relative;
    overflow: hidden;

    display: flex;
    align-items: center;
    gap: 1rem;

    padding: 1.25rem;
    border-radius: 24px;

    background: rgba(255,255,255,.75);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);

    border: 1px solid rgba(255,255,255,.3);

    box-shadow:
      0 10px 30px rgba(15,23,42,.08),
      0 4px 12px rgba(15,23,42,.05);

    transition: all .35s ease;

    animation: fadeUp .5s ease both;
  }

  .stat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        135deg,
        rgba(255,255,255,.25),
        transparent
      );
    pointer-events: none;
  }

  .stat-card:hover {
    transform: translateY(-6px);
    box-shadow:
      0 24px 40px rgba(15,23,42,.12),
      0 12px 20px rgba(15,23,42,.08);
  }

  :host-context([data-theme='dark']) .stat-card {
    background: rgba(15,23,42,.75);
    border: 1px solid rgba(255,255,255,.08);

    box-shadow:
      0 16px 40px rgba(0,0,0,.4),
      inset 0 1px 0 rgba(255,255,255,.05);
  }

  /* ==========================================
     KPI ICONS
  ========================================== */

  .s-icon {
    width: 58px;
    height: 58px;
    border-radius: 18px;

    display: flex;
    align-items: center;
    justify-content: center;

    flex-shrink: 0;

    background:
      linear-gradient(
        135deg,
        #4f46e5,
        #3b82f6
      );

    box-shadow:
      0 10px 20px rgba(79,70,229,.35);
  }

  .s-icon mat-icon {
    color: white;
    font-size: 28px;
    width: 28px;
    height: 28px;
  }

  .s-val {
    display: block;
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
    color: #0f172a;
  }

  .s-lbl {
    display: block;
    margin-top: .4rem;

    font-size: .72rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;

    color: #64748b;
  }

  :host-context([data-theme='dark']) .s-val {
    color: #f8fafc;
  }

  :host-context([data-theme='dark']) .s-lbl {
    color: #94a3b8;
  }

  /* ==========================================
     CHARTS
  ========================================== */

  .charts-hidden {
    opacity: 0;
    pointer-events: none;
  }

  .chart-row-grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  @media(max-width:900px) {
    .chart-row-grid {
      grid-template-columns: 1fr;
    }
  }

  .chart-card {
    border-radius: 24px !important;

    background: rgba(255,255,255,.78);
    backdrop-filter: blur(18px);

    border: 1px solid rgba(255,255,255,.25);

    box-shadow:
      0 12px 30px rgba(15,23,42,.08);

    transition: all .3s ease;
  }

  .chart-card:hover {
    transform: translateY(-4px);
  }

  :host-context([data-theme='dark']) .chart-card {
    background: rgba(15,23,42,.75);
    border: 1px solid rgba(255,255,255,.08);
  }

  .chart-card mat-card-title {
    font-size: 1rem !important;
    font-weight: 700 !important;
  }

  .chart-card mat-card-subtitle {
    font-size: .82rem !important;
    color: #94a3b8 !important;
  }

  .empty-note {
    text-align: center;
    color: #94a3b8;
    font-size: .85rem;
    padding: .75rem;
  }

  /* ==========================================
     DONUT LEGEND
  ========================================== */

  .donut-legend {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin-top: 1rem;
    font-size: .9rem;
  }

  .donut-legend span {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-weight: 600;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  /* ==========================================
     TODAY SUMMARY
  ========================================== */

  .today-summary-card {
    border-radius: 24px !important;
    margin-bottom: 1.5rem;

    background: rgba(255,255,255,.78);
    backdrop-filter: blur(18px);
  }

  :host-context([data-theme='dark']) .today-summary-card {
    background: rgba(15,23,42,.75);
  }

  .today-snap {
    display: grid;
    grid-template-columns: repeat(4,1fr);
    gap: 1rem;
    padding: .75rem 0;
  }

  @media(max-width:600px) {
    .today-snap {
      grid-template-columns: repeat(2,1fr);
    }
  }

  .snap-item {
    border-radius: 18px;

    display: flex;
    flex-direction: column;
    align-items: center;

    gap: .4rem;
    padding: 1rem;

    transition: all .3s ease;
  }

  .snap-item:hover {
    transform: translateY(-5px) scale(1.02);
  }

  .snap-item mat-icon {
    width: 30px;
    height: 30px;
    font-size: 30px;
  }

  .snap-val {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
  }

  .snap-lbl {
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* Premium Status Colors */

  .snap-item.present {
    background: rgba(16,185,129,.12);
    color: #10b981;
    border: 1px solid rgba(16,185,129,.2);
  }

  .snap-item.absent {
    background: rgba(239,68,68,.12);
    color: #ef4444;
    border: 1px solid rgba(239,68,68,.2);
  }

  .snap-item.leave {
    background: rgba(59,130,246,.12);
    color: #3b82f6;
    border: 1px solid rgba(59,130,246,.2);
  }

  .snap-item.rate {
    background: rgba(168,85,247,.12);
    color: #a855f7;
    border: 1px solid rgba(168,85,247,.2);
  }

  /* ==========================================
     ATTENDANCE BAR
  ========================================== */

  .att-bar-wrap {
    height: 10px;
    border-radius: 999px;
    overflow: hidden;

    background: rgba(148,163,184,.18);
    margin-top: .75rem;
  }

  .att-bar {
    height: 100%;
    border-radius: inherit;

    background:
      linear-gradient(
        90deg,
        #4f46e5,
        #06b6d4
      );

    transition: width .9s ease;
  }

  /* ==========================================
     ANIMATIONS
  ========================================== */

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from { opacity:0; }
    to { opacity:1; }
  }

  /* ==========================================
     LEAVE TYPE BREAKDOWN
  ========================================== */

  .leave-type-divider {
    display: flex;
    align-items: center;
    gap: .75rem;
    margin: 1.25rem 0 .75rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(148,163,184,.2);
  }

  .leave-type-heading {
    font-size: .82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .8px;
    color: #64748b;
  }

  :host-context([data-theme='dark']) .leave-type-heading {
    color: #94a3b8;
  }

  .leave-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: .75rem;
  }

  .leave-chip {
    border-radius: 16px;
    padding: .85rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .2rem;
    background: rgba(148,163,184,.08);
    border: 1.5px solid rgba(148,163,184,.18);
    transition: all .25s ease;
  }

  .leave-chip.active-leave {
    background: rgba(79,70,229,.1);
    border-color: rgba(79,70,229,.3);
  }

  .leave-chip:hover {
    transform: translateY(-3px);
  }

  .leave-code {
    font-size: 1.1rem;
    font-weight: 800;
    color: #4f46e5;
    line-height: 1;
  }

  .leave-chip:not(.active-leave) .leave-code {
    color: #94a3b8;
  }

  .leave-count {
    font-size: 1.6rem;
    font-weight: 800;
    line-height: 1;
    color: #0f172a;
  }

  :host-context([data-theme='dark']) .leave-count {
    color: #f8fafc;
  }

  .leave-chip:not(.active-leave) .leave-count {
    color: #94a3b8;
  }

  .leave-name {
    font-size: .65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: #64748b;
    text-align: center;
  }

  .snap-item.late {
    background: rgba(251,140,0,.12);
    color: #fb8c00;
    border: 1px solid rgba(251,140,0,.2);
  }

  @media(max-width:600px) {
    .leave-type-grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
  }
`]
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('dailyCanvas', { static: true }) dailyRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas',   { static: true }) pieRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas', { static: true }) donutRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('hbarCanvas',  { static: true }) hbarRef!:   ElementRef<HTMLCanvasElement>;

  loading      = true;
  today        = new Date();
  userName     = '';
  currentMonth = '';
  statCards:   any[] = [];
  activeEmp    = 0;
  inactiveEmp  = 0;
  presentToday = 0;
  absentToday  = 0;
  onLeaveToday = 0;
  attPct       = 0;
  noDaily      = false;
  noPie        = false;
  noLeave      = false;
  todayLeaveBreakdown: { leaveType: string; shortCode: string; count: number }[] = [];
  private charts: Chart[] = [];

  constructor(
    public  auth:     AuthService,
    private dashSvc:  DashboardService,
    private chartSvc: ChartService
  ) {}

  ngOnInit()         { this.userName = this.auth.currentUser()?.fullName ?? ''; this.fetchData(); }
  ngAfterViewInit()  {}
  refresh()          { this.charts.forEach(c => this.chartSvc.destroy(c)); this.charts = []; this.fetchData(); }

  fetchData(): void {
    this.loading = true;
    this.dashSvc.getAdminStats().subscribe({
      next: (d: any) => {
        this.activeEmp   = d.activeEmployees   ?? 0;
        this.inactiveEmp = d.inactiveEmployees ?? 0;
        this.presentToday= d.presentToday      ?? 0;
        this.absentToday = d.absentToday       ?? 0;
        this.onLeaveToday= d.onLeaveToday      ?? 0;
        this.attPct      = d.attendancePercentage ?? 0;
        this.currentMonth= d.currentMonth ?? '';
        this.todayLeaveBreakdown = d.todayLeaveBreakdown ?? [];
        this.statCards   = [
          { label:'Total Employees', value: d.totalEmployees,                   icon:'people',          bg:'#1a237e' },
          { label:'Active',          value: d.activeEmployees   ?? 0,           icon:'how_to_reg',      bg:'#2e7d32' },
          { label:'Inactive',        value: d.inactiveEmployees ?? 0,           icon:'person_off',      bg:'#c62828' },
          { label:'Departments',     value: d.totalDepartments  ?? 0,           icon:'business',        bg:'#e65100' },
          { label:'Pending Leaves',  value: d.pendingLeaves     ?? 0,           icon:'event_available', bg:'#f9a825' },
          { label:'Today Attendance',value: (d.attendancePercentage ?? 0) + '%',icon:'schedule',        bg:'#00838f' },
        ];
        this.loading = false;
        this.drawCharts(d);
      },
      error: () => { this.loading = false; }
    });
  }

  private drawCharts(d: any): void {
    this.charts.forEach(c => this.chartSvc.destroy(c));
    this.charts = [];

    // FIX 4: Daily attendance chart — per-day for current month
    const dailyData: any[] = d.dailyAttendance ?? [];
    this.noDaily = dailyData.length === 0;
    if (!this.noDaily && this.dailyRef?.nativeElement) {
      // Labels = day numbers (1, 2, 3...)
      const labels   = dailyData.map((x: any) => `${x.day}`);
        const c = this.chartSvc.bar(
        this.dailyRef.nativeElement,
        labels,
        [
          { label: 'Present',           data: dailyData.map((x: any) => x.present ?? 0), backgroundColor: '#22c55e' },
          { label: 'Late',              data: dailyData.map((x: any) => x.late    ?? 0), backgroundColor: '#f97316' },
          { label: 'Absent',            data: dailyData.map((x: any) => x.absent  ?? 0), backgroundColor: '#ef4444' },
          { label: 'Sick Leave (SL)',   data: dailyData.map((x: any) => x.sl ?? 0),      backgroundColor: '#8b5cf6' },
          { label: 'Casual Leave (CL)', data: dailyData.map((x: any) => x.cl ?? 0),      backgroundColor: '#ec4899' },
          { label: 'Annual Leave (AL)', data: dailyData.map((x: any) => x.al ?? 0),      backgroundColor: '#3b82f6' },
          { label: 'Unpaid Leave (UL)', data: dailyData.map((x: any) => x.ul ?? 0),      backgroundColor: '#94a3b8' },
          { label: 'Maternity (ML)',    data: dailyData.map((x: any) => x.ml ?? 0),      backgroundColor: '#f43f5e' },
          { label: 'Paternity (PL)',    data: dailyData.map((x: any) => x.pl ?? 0),      backgroundColor: '#06b6d4' },
          { label: 'Other Leave (OL)',  data: dailyData.map((x: any) => x.ol ?? 0),      backgroundColor: '#a16207' },
        ],
        { stacked: true, legendPosition: 'bottom' }
      );
      if (c) this.charts.push(c);
    }

    // Pie — Employees by Department
    const deptData: any[] = d.employeesByDept ?? [];
    this.noPie = deptData.length === 0;
    if (!this.noPie && this.pieRef?.nativeElement) {
      const c = this.chartSvc.pie(this.pieRef.nativeElement,
        deptData.map((e: any) => e.department ?? ''),
        deptData.map((e: any) => e.count ?? 0), COLORS);
      if (c) this.charts.push(c);
    }

    // Doughnut — Active vs Inactive
    if (this.donutRef?.nativeElement) {
      const c = this.chartSvc.doughnut(this.donutRef.nativeElement,
        ['Active', 'Inactive'], [this.activeEmp, this.inactiveEmp], ['#43a047', '#e53935']);
      if (c) this.charts.push(c);
    }

    // Horizontal Bar — Leave Types
    const leaveData: any[] = d.leavesByType ?? [];
    this.noLeave = leaveData.length === 0;
    if (!this.noLeave && this.hbarRef?.nativeElement) {
      const c = this.chartSvc.horizontalBar(this.hbarRef.nativeElement,
        leaveData.map((l: any) => l.leaveType ?? ''),
        leaveData.map((l: any) => l.count ?? 0), COLORS);
      if (c) this.charts.push(c);
    }
  }

  ngOnDestroy(): void { this.charts.forEach(c => this.chartSvc.destroy(c)); }
}