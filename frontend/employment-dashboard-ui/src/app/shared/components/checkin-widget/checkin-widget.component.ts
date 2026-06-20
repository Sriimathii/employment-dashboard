import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AttendanceService, GeoSettings } from '../../../core/services/attendance.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-checkin-widget',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressBarModule, MatTooltipModule
  ],
  template: `
<div class="widget-card"
     [class.sunday]="isSunday"
     [class.on-leave]="todayStatus === 'On Leave'"
     [class.absent]="todayStatus === 'Absent'">

  <!-- INACTIVE / READ-ONLY BANNER -->
  <div class="info-banner inactive-banner" *ngIf="isReadOnly">
    <mat-icon>lock</mat-icon>
    <div>
      <strong>Read-Only Mode</strong>
      <span>Your account is inactive — Check-In and Check-Out are disabled.</span>
    </div>
  </div>

  <!-- SUNDAY BANNER -->
  <div class="info-banner sunday-banner" *ngIf="isSunday && !isReadOnly">
    <mat-icon>celebration</mat-icon>
    <span>Today is Sunday — Public Holiday. Enjoy your day off! 🎉</span>
  </div>

  <!-- MAIN WIDGET BODY -->
  <div class="widget-inner" *ngIf="!isSunday || isReadOnly">

    <!-- Status area -->
    <div class="status-section">
      <div class="status-circle"
           [class.circle-present]="todayStatus === 'Present'"
           [class.circle-late]="todayStatus === 'Late'"
           [class.circle-on-leave]="todayStatus === 'On Leave'"
           [class.circle-absent]="todayStatus === 'Absent'">
        <mat-icon>{{ statusIcon }}</mat-icon>
      </div>

      <div class="status-info">
        <div class="status-label">{{ statusLabel }}</div>
        <div class="status-date">{{ today | date:'EEEE, MMMM d, yyyy' }}</div>

        <div class="time-row" *ngIf="checkInTime">
          <span class="t-item"><mat-icon>login</mat-icon> In: <strong>{{ checkInTime }}</strong></span>
          <span class="t-item" *ngIf="checkOutTime"><mat-icon>logout</mat-icon> Out: <strong>{{ checkOutTime }}</strong></span>
          <span class="t-item worked" *ngIf="checkInTime && checkOutTime">
            <mat-icon>schedule</mat-icon><strong>{{ calcWorkingHours() }}</strong> worked
          </span>
        </div>

        <!-- Status-specific hints -->
        <div class="hint late"     *ngIf="todayStatus === 'Late'">
          <mat-icon>warning_amber</mat-icon> Checked in after 10:00 AM — Marked as Late
        </div>
        <div class="hint absent"   *ngIf="todayStatus === 'Absent'">
          <mat-icon>event_busy</mat-icon> Marked as Absent for today
        </div>
        <div class="hint on-leave" *ngIf="todayStatus === 'On Leave'">
          <mat-icon>beach_access</mat-icon> You are on approved leave today
        </div>
        <div class="hint geo-off" *ngIf="!checkedInToday && todayStatus !== 'Absent' && !isReadOnly && geoEnabled">
          <mat-icon>location_on</mat-icon>
          GPS location required for check-in
        </div>
        <div class="hint idle" *ngIf="!checkedInToday && todayStatus !== 'Absent' && !isReadOnly && !geoEnabled">
          <mat-icon>info</mat-icon>
          Check in before 10:00 AM is marked Present. After 10:00 AM is marked Late.
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons" *ngIf="!isReadOnly">
      <button mat-raised-button class="btn-in"
              [disabled]="checkedInToday || todayStatus === 'On Leave' || marking"
              (click)="doCheckIn()">
        <mat-icon>fingerprint</mat-icon>
        {{ marking && !checkedInToday ? 'Verifying...' : 'Check In' }}
      </button>

      <button mat-raised-button class="btn-out"
              [disabled]="!checkedInToday || !!checkOutTime || todayStatus === 'On Leave' || marking"
              (click)="doCheckOut()">
        <mat-icon>logout</mat-icon>
        {{ marking && checkedInToday && !checkOutTime ? 'Processing...' : 'Check Out' }}
      </button>
    </div>

    <!-- Read-only notice -->
    <div class="readonly-badge" *ngIf="isReadOnly">
      <mat-icon>visibility</mat-icon> View Only
    </div>

  </div>

  <mat-progress-bar *ngIf="loading" mode="indeterminate" class="loader"></mat-progress-bar>
</div>`,
  styles: [`
    /* Card shell */
    .widget-card {
      border-radius: 16px;
      background: linear-gradient(135deg, #1a237e 0%, #1565c0 100%);
      position: relative; overflow: hidden; margin-bottom: 1.5rem;
    }
    .widget-card.sunday   { background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%); }
    .widget-card.on-leave { background: linear-gradient(135deg, #0277bd 0%, #01579b 100%); }
    .widget-card.absent   { background: linear-gradient(135deg, #b71c1c 0%, #c62828 100%); }

    /* Banners */
    .info-banner {
      display: flex; align-items: center; gap: .75rem;
      padding: 1.1rem 2rem; color: white; font-size: .9rem;
    }
    .inactive-banner { background: rgba(0,0,0,.3); }
    .inactive-banner div { display: flex; flex-direction: column; gap: 2px; }
    .inactive-banner strong { font-size: 1rem; }
    .inactive-banner span   { font-size: .8rem; opacity: .85; }
    .info-banner mat-icon { font-size: 26px; width: 26px; height: 26px; flex-shrink: 0; }

    /* Body */
    .widget-inner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.5rem 2rem; flex-wrap: wrap; gap: 1.5rem;
    }

    /* Status section */
    .status-section { display: flex; align-items: flex-start; gap: 1.25rem; flex: 1; }

    .status-circle {
      width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,.12); transition: all .3s;
    }
    .status-circle mat-icon { font-size: 32px; width: 32px; height: 32px; color: rgba(255,255,255,.5); }
    .circle-present  mat-icon { color: #69f0ae !important; }
    .circle-present  { background: rgba(105,240,174,.2) !important; }
    .circle-late     mat-icon { color: #ffb74d !important; }
    .circle-late     { background: rgba(255,183,77,.2) !important; }
    .circle-on-leave mat-icon { color: #4fc3f7 !important; }
    .circle-on-leave { background: rgba(79,195,247,.2) !important; }
    .circle-absent   mat-icon { color: #ef9a9a !important; }
    .circle-absent   { background: rgba(239,83,80,.2) !important; }

    .status-info { flex: 1; }
    .status-label { font-size: 1.35rem; font-weight: 700; color: white; }
    .status-date  { font-size: .8rem; color: rgba(255,255,255,.65); margin-top: .2rem; }

    .time-row { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: .6rem; }
    .t-item {
      display: flex; align-items: center; gap: .3rem;
      color: rgba(255,255,255,.85); font-size: .83rem;
    }
    .t-item mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .t-item strong { color: white; }
    .worked { color: #a5d6a7 !important; }
    .worked strong { color: #a5d6a7 !important; }

    /* Hints */
    .hint {
      display: flex; align-items: center; gap: .35rem;
      font-size: .78rem; margin-top: .45rem;
    }
    .hint mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .hint.late      { color: #ffb74d; }
    .hint.absent    { color: #ef9a9a; }
    .hint.on-leave  { color: #4fc3f7; }
    .hint.geo-off   { color: #80cbc4; }
    .hint.idle      { color: rgba(255,255,255,.5); }

    /* Buttons */
    .action-buttons { display: flex; gap: .75rem; flex-wrap: wrap; }

    .btn-in {
      background: #69f0ae !important; color: #1b5e20 !important;
      font-weight: 700 !important; border-radius: 10px !important;
      padding: 0 1.25rem !important; height: 46px !important;
    }
    .btn-in:disabled  { background: rgba(255,255,255,.12) !important; color: rgba(255,255,255,.3) !important; }
    .btn-out {
      background: rgba(255,255,255,.14) !important; color: white !important;
      font-weight: 700 !important; border-radius: 10px !important;
      padding: 0 1.25rem !important; height: 46px !important;
      border: 1px solid rgba(255,255,255,.2) !important;
    }
    .btn-out:disabled { background: rgba(255,255,255,.06) !important; color: rgba(255,255,255,.25) !important; border-color: transparent !important; }
    .btn-in mat-icon, .btn-out mat-icon { font-size: 20px; width: 20px; height: 20px; margin-right: 4px; }

    .readonly-badge {
      color: rgba(255,255,255,.45); display: flex; align-items: center; gap: .4rem; font-size: .8rem;
    }
    .readonly-badge mat-icon { font-size: 16px; }

    .loader { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 0; }

    @media (max-width: 600px) {
      .widget-inner { flex-direction: column; padding: 1.25rem; }
      .action-buttons { width: 100%; }
      .btn-in, .btn-out { flex: 1; }
    }
  `]
})
export class CheckinWidgetComponent implements OnInit {
  @Input() role: 'admin' | 'manager' | 'employee' = 'employee';

  today    = new Date();
  isSunday = this.today.getDay() === 0;
  loading  = false;
  marking  = false;

  checkedInToday = false;
  checkInTime    = '';
  checkOutTime   = '';
  todayStatus    = '';
  geoEnabled     = false;

  get isReadOnly(): boolean { return this.auth.isReadOnly(); }

  get statusIcon(): string {
    const m: Record<string, string> = {
      'Present': 'check_circle', 'Late': 'watch_later',
      'On Leave': 'beach_access', 'Absent': 'event_busy'
    };
    return m[this.todayStatus] ?? 'radio_button_unchecked';
  }

  get statusLabel(): string {
    if (this.isSunday)                          return 'Sunday Holiday 🌟';
    if (this.todayStatus === 'Present')         return '✅ Present';
    if (this.todayStatus === 'Late')            return '⚠️ Late Arrival';
    if (this.todayStatus === 'On Leave')        return '🏖 On Leave Today';
    if (this.todayStatus === 'Absent')          return '❌ Absent';
    if (this.checkedInToday && this.checkOutTime) return '👋 Checked Out';
    return 'Not Checked In';
  }

  constructor(
    private attSvc:  AttendanceService,
    private dashSvc: DashboardService,
    public  auth:    AuthService,
    private snack:   MatSnackBar
  ) {}

  ngOnInit() {
    this.loadStatus();
    // Load geo settings silently — available to all authenticated users now
    this.attSvc.getGeoSettings().subscribe({
      next:  s => this.geoEnabled = s.enabled,
      error: () => this.geoEnabled = false   // geo off if settings not found
    });
  }

  loadStatus() {
    this.loading = true;
    this.dashSvc.getEmployeeStats().subscribe({
      next: (d: any) => {
        this.checkedInToday = d.checkedInToday ?? false;
        this.checkInTime    = d.checkInTime    ?? '';
        this.checkOutTime   = d.checkOutTime   ?? '';
        this.todayStatus    = d.todayStatus    ?? '';
        this.isSunday       = d.isSunday       ?? (new Date().getDay() === 0);
      },
      error:    () => {},
      complete: () => { this.loading = false; this.marking = false; }
    });
  }

  // ── CHECK IN ────────────────────────────────────────────────
  doCheckIn() {
    if (this.isSunday) { this.snack.open('Today is Sunday — Holiday!', '×', { duration: 3000 }); return; }
    this.marking = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => this.performCheckIn({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        _err => {
          if (this.geoEnabled) {
            this.snack.open(
              '📍 Location access is required to check in. Please allow GPS in your browser settings.',
              '×', { duration: 6000 }
            );
            this.marking = false;
          } else {
            // Geo not enabled — proceed without location
            this.performCheckIn(undefined);
          }
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      // Browser doesn't support geolocation
      if (this.geoEnabled) {
        this.snack.open('Your browser does not support GPS location. Check-in blocked.', '×', { duration: 5000 });
        this.marking = false;
      } else {
        this.performCheckIn(undefined);
      }
    }
  }

  private performCheckIn(loc?: { latitude: number; longitude: number }) {
    this.attSvc.checkIn(loc).subscribe({
      next: res => {
        const panel = res.isAbsent ? ['snack-error'] : res.isLate ? ['snack-warn'] : ['snack-success'];
        this.snack.open(res.message ?? 'Checked in!', '×', { duration: 5000, panelClass: panel });
        this.loadStatus();
      },
      error: e => {
        const msg = e.error?.message ?? 'Check-in failed.';
        this.snack.open(msg, '×', { duration: 6000 });
        this.marking = false;
      }
    });
  }

  // ── CHECK OUT ───────────────────────────────────────────────
  doCheckOut() {
    this.marking = true;
    // Try to get location for audit (not required)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => this.performCheckOut({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        _   => this.performCheckOut(undefined),
        { timeout: 5000 }
      );
    } else {
      this.performCheckOut(undefined);
    }
  }

  private performCheckOut(loc?: { latitude: number; longitude: number }) {
    this.attSvc.checkOut(loc).subscribe({
      next: res => {
        this.snack.open(res.message ?? 'Checked out!', '×', { duration: 5000 });
        this.loadStatus();
      },
      error: e => {
        this.snack.open(e.error?.message ?? 'Check-out failed.', '×', { duration: 4000 });
        this.marking = false;
      }
    });
  }

  calcWorkingHours(): string {
    if (!this.checkInTime || !this.checkOutTime) return '';
    const [ih, im]  = this.checkInTime.split(':').map(Number);
    const [oh, om]  = this.checkOutTime.split(':').map(Number);
    const mins  = (oh * 60 + om) - (ih * 60 + im);
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}