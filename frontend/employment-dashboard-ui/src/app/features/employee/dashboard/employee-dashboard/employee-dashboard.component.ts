import {
  Component, OnInit, OnDestroy,
  AfterViewInit, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { AttendanceService } from '../../../../core/services/attendance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChartService } from '../../../../core/services/chart.service';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatSnackBarModule, MatDividerModule
  ],
  template: `
<div class="emp-dash">

  <!-- Header -->
  <div class="dash-header">
    <div>
      <h1 class="dash-title">Welcome back, {{ firstName }} 👋</h1>
      <p class="dash-sub">{{ today | date:'EEEE, MMMM d, yyyy' }}</p>
    </div>
    <div class="holiday-tag" *ngIf="isSunday">
      <mat-icon>celebration</mat-icon> Sunday Holiday
    </div>
  </div>

  <mat-progress-bar *ngIf="loading" mode="indeterminate" class="prog"></mat-progress-bar>

  <!-- Today Card - show even while loading so buttons appear -->
  <mat-card class="today-card">
    <mat-card-content>
      <div class="today-row">
        <!-- Status icon -->
        <div class="status-wrap">
          <div class="s-circle" [class.s-present]="todayStatus==='Present'"
               [class.s-late]="todayStatus==='Late'">
            <mat-icon>{{ statusIcon }}</mat-icon>
          </div>
          <div class="s-text">
            <span class="s-label">{{ todayStatus || 'Not Checked In' }}</span>
            <span class="s-times" *ngIf="checkInTime">
              In: <strong>{{ checkInTime }}</strong>
              <span *ngIf="checkOutTime">&nbsp;· Out: <strong>{{ checkOutTime }}</strong></span>
            </span>
            <span class="s-late-warn" *ngIf="todayStatus === 'Late'">
              <mat-icon>warning_amber</mat-icon> Checked in after 10:00 AM
            </span>
          </div>
        </div>
        <!-- Action buttons -->
        <div class="action-btns">
          <button mat-raised-button class="btn-in"
                  [disabled]="checkedInToday || marking || isSunday"
                  (click)="checkIn()">
            <mat-icon>fingerprint</mat-icon>
            {{ marking && !checkedInToday ? 'Please wait...' : 'Check In' }}
          </button>
          <button mat-raised-button class="btn-out"
                  [disabled]="!checkedInToday || !!checkOutTime || marking"
                  (click)="checkOut()">
            <mat-icon>logout</mat-icon>
            Check Out
          </button>
        </div>
      </div>
    </mat-card-content>
  </mat-card>

  <!-- Stat Cards -->
  <div class="stat-grid" *ngIf="!loading">
    <div class="stat-card">
      <div class="s-icon" style="background:#1a237e"><mat-icon>calendar_today</mat-icon></div>
      <div class="s-info"><span class="s-val">{{ workingDays }}</span><span class="s-lbl">Working Days</span></div>
    </div>
    <div class="stat-card">
      <div class="s-icon" style="background:#2e7d32"><mat-icon>check_circle</mat-icon></div>
      <div class="s-info"><span class="s-val">{{ presentDays }}</span><span class="s-lbl">Present Days</span></div>
    </div>
    <div class="stat-card">
      <div class="s-icon" style="background:#e65100"><mat-icon>watch_later</mat-icon></div>
      <div class="s-info"><span class="s-val">{{ lateDays }}</span><span class="s-lbl">Late Days</span></div>
    </div>
    <div class="stat-card">
      <div class="s-icon" style="background:#00838f"><mat-icon>beach_access</mat-icon></div>
      <div class="s-info"><span class="s-val">{{ leaveBalance }}</span><span class="s-lbl">Leaves Taken</span></div>
    </div>
    <div class="stat-card">
      <div class="s-icon" style="background:#f9a825"><mat-icon>pending_actions</mat-icon></div>
      <div class="s-info"><span class="s-val">{{ pendingLeaves }}</span><span class="s-lbl">Pending Leaves</span></div>
    </div>
  </div>

  <!-- Bottom Row: Chart + Leave Summary - always in DOM, chart canvas always present -->
  <div class="bottom-row" [style.visibility]="loading ? 'hidden' : 'visible'">

    <mat-card class="chart-card">
      <mat-card-header>
        <mat-card-title>🍩 My Attendance Breakdown</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div style="position:relative;height:220px;max-width:320px;margin:1rem auto">
          <canvas #attChart></canvas>
        </div>
        <div class="chart-legend">
          <span><span class="dot" style="background:#43a047"></span> Present ({{ presentDays }})</span>
          <span><span class="dot" style="background:#e53935"></span> Absent ({{ absentDays }})</span>
          <span><span class="dot" style="background:#fb8c00"></span> Late ({{ lateDays }})</span>
        </div>
      </mat-card-content>
    </mat-card>

    <mat-card class="leave-card">
      <mat-card-header>
        <mat-card-title>🏖 Leave Summary</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="leave-grid">
          <div class="leave-stat">
            <span class="l-num" style="color:#f57f17">{{ pendingLeaves }}</span>
            <span class="l-lbl">Pending</span>
          </div>
          <mat-divider vertical style="height:60px"></mat-divider>
          <div class="leave-stat">
            <span class="l-num" style="color:#2e7d32">{{ leaveBalance }}</span>
            <span class="l-lbl">Approved</span>
          </div>
          <mat-divider vertical style="height:60px"></mat-divider>
          <div class="leave-stat">
            <span class="l-num" style="color:#1a237e">{{ workingDays }}</span>
            <span class="l-lbl">Total Days</span>
          </div>
        </div>
      </mat-card-content>
    </mat-card>

  </div>
</div>`,
  styles: [`
    .emp-dash   { padding:1.5rem; }
    .dash-header{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
    .dash-title { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0; }
    .dash-sub   { color:#666; margin:.3rem 0 0; }
    :host-context([data-theme='dark']) .dash-title { color:#82b1ff; }
    .prog       { margin-bottom:1rem; }
    .holiday-tag{ display:flex; align-items:center; gap:.5rem; background:#e8f5e9; color:#2e7d32; padding:.6rem 1.25rem; border-radius:24px; font-weight:600; }

    /* Today card */
    .today-card { border-radius:14px!important; margin-bottom:1.5rem;
                  background:linear-gradient(135deg,#1a237e,#1565c0)!important; }
    .today-row  { display:flex; align-items:center; justify-content:space-between; padding:.5rem; flex-wrap:wrap; gap:1.25rem; }
    .status-wrap{ display:flex; align-items:center; gap:1.25rem; }
    .s-circle   { width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,.12);
                  display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .s-circle mat-icon { font-size:34px; width:34px; height:34px; color:rgba(255,255,255,.5); }
    .s-present  { background:rgba(105,240,174,.2)!important; }
    .s-present mat-icon { color:#69f0ae!important; }
    .s-late     { background:rgba(255,183,77,.2)!important; }
    .s-late mat-icon    { color:#ffb74d!important; }
    .s-label    { display:block; font-size:1.3rem; font-weight:700; color:white; }
    .s-times    { display:flex; gap:1rem; color:rgba(255,255,255,.8); font-size:.85rem; margin-top:.3rem; }
    .s-late-warn{ display:flex; align-items:center; gap:.35rem; color:#ffb74d; font-size:.8rem; margin-top:.35rem; }
    .s-late-warn mat-icon { font-size:16px; width:16px; height:16px; }
    .action-btns{ display:flex; gap:.75rem; }
    .btn-in  { background:#69f0ae!important; color:#1b5e20!important; font-weight:700!important; border-radius:8px!important; }
    .btn-out { background:rgba(255,255,255,.14)!important; color:white!important; font-weight:700!important; border-radius:8px!important; }

    /* Stat grid */
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:1rem; margin-bottom:1.5rem; }
    .stat-card { background:white; border-radius:12px; padding:1rem; display:flex; align-items:center; gap:.9rem; box-shadow:0 2px 8px rgba(0,0,0,.07); }
    :host-context([data-theme='dark']) .stat-card { background:#1a1a2e; }
    .s-icon { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .s-icon mat-icon { color:white; font-size:22px; width:22px; height:22px; }
    .s-val  { display:block; font-size:1.6rem; font-weight:700; line-height:1.1; }
    .s-lbl  { display:block; font-size:.7rem; color:#888; margin-top:.25rem; text-transform:uppercase; letter-spacing:.4px; }

    /* Bottom row */
    .bottom-row { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
    @media(max-width:768px) { .bottom-row { grid-template-columns:1fr; } }
    .chart-card { border-radius:12px!important; }
    .chart-card mat-card-title { font-size:.95rem!important; font-weight:700!important; }
    .chart-legend { display:flex; justify-content:center; gap:1.25rem; margin-top:.75rem; font-size:.8rem; flex-wrap:wrap; }
    .chart-legend span { display:flex; align-items:center; gap:.4rem; }
    .dot { width:10px; height:10px; border-radius:50%; display:inline-block; }

    .leave-card { border-radius:12px!important; }
    .leave-grid { display:flex; align-items:center; justify-content:space-around; padding:1.5rem 0; }
    .leave-stat { text-align:center; flex:1; }
    .l-num { display:block; font-size:2.2rem; font-weight:800; line-height:1; }
    .l-lbl { display:block; font-size:.75rem; color:#888; margin-top:.4rem; text-transform:uppercase; letter-spacing:.4px; }
  `]
})
export class EmployeeDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('attChart') chartRef!: ElementRef<HTMLCanvasElement>;

  // ── Plain properties (NOT signals, NOT arrow functions) ───
  // Arrow function class fields in templates cause infinite change detection loops!
  loading       = true;
  marking       = false;
  isSunday      = new Date().getDay() === 0;
  today         = new Date();
  firstName     = '';

  todayStatus   = '';
  checkInTime   = '';
  checkOutTime  = '';
  checkedInToday = false;

  workingDays   = 0;
  presentDays   = 0;
  lateDays      = 0;
  absentDays    = 0;
  leaveBalance  = 0;
  pendingLeaves = 0;

  get statusIcon(): string {
    if (this.todayStatus === 'Present') return 'check_circle';
    if (this.todayStatus === 'Late')    return 'watch_later';
    return 'radio_button_unchecked';
  }

  private chart:     Chart | null = null;
  private viewReady  = false;
  private dataReady  = false;
  private lastData: any = null;

  constructor(
    private auth:     AuthService,
    private dashSvc:  DashboardService,
    private attSvc:   AttendanceService,
    private chartSvc: ChartService,
    private snack:    MatSnackBar
  ) {}

  ngOnInit() {
    this.firstName = (this.auth.currentUser()?.fullName ?? 'there').split(' ')[0];
    this.loadStats();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    if (this.dataReady && this.lastData) {
      this.drawChart(this.lastData);
    }
  }

  loadStats() {
    this.loading = true;
    this.dashSvc.getEmployeeStats().subscribe({
      next: (d: any) => {
        // Update plain properties — no signals, no arrow functions
        this.workingDays    = d.workingDays    ?? 0;
        this.presentDays    = d.presentDays    ?? 0;
        this.lateDays       = d.lateDays       ?? 0;
        this.leaveBalance   = d.leaveBalance   ?? 0;
        this.pendingLeaves  = d.pendingLeaves  ?? 0;
        this.checkedInToday = d.checkedInToday ?? false;
        this.checkInTime    = d.checkInTime    ?? '';
        this.checkOutTime   = d.checkOutTime   ?? '';
        this.todayStatus    = d.todayStatus    ?? '';
        this.absentDays     = Math.max(0, this.workingDays - this.presentDays - this.lateDays);

        this.loading   = false;
        this.marking   = false;
        this.dataReady = true;
        this.lastData  = d;

        if (this.viewReady) {
          setTimeout(() => this.drawChart(d), 0);
        }
      },
      error: () => { this.loading = false; this.marking = false; }
    });
  }

  private drawChart(d: any) {
    if (!this.chartRef?.nativeElement) return;
    this.chartSvc.destroy(this.chart);
    this.chart = this.chartSvc.doughnut(
      this.chartRef.nativeElement,
      ['Present','Absent','Late'],
      [d.presentDays ?? 0, this.absentDays, d.lateDays ?? 0],
      ['#43a047','#e53935','#fb8c00']
    );
  }

  checkIn() {
  if (this.isSunday) {
    this.snack.open(
      'Today is Sunday — Holiday! No attendance required.',
      '×',
      { duration: 4000 }
    );
    return;
  }

  this.marking = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      console.log('Location:', location);

      this.attSvc.checkIn(location).subscribe({
        next: (res: any) => {
          this.snack.open(
            res.message ?? 'Checked in successfully!',
            '×',
            { duration: 4500 }
          );
          this.loadStats();
        },
        error: (e: any) => {
          console.error(e);
          this.snack.open(
            e.error?.message ?? 'Check-in failed.',
            '×',
            { duration: 4000 }
          );
          this.marking = false;
        }
      });

    },
    (error) => {
      console.error('GPS Error', error);

      this.snack.open(
        'Location permission is required for check-in.',
        '×',
        { duration: 4000 }
      );

      this.marking = false;
    }
  );
}

  checkOut() {
    this.marking = true;
    this.attSvc.checkOut().subscribe({
      next: (res: any) => {
        this.snack.open(res.message ?? 'Checked out successfully!', '×', { duration: 4000 });
        this.loadStats();
      },
      error: (e: any) => {
        this.snack.open(e.error?.message ?? 'Check-out failed. Please try again.', '×', { duration: 4000 });
        this.marking = false;
      }
    });
  }

  ngOnDestroy() {
    this.chartSvc.destroy(this.chart);
  }
}