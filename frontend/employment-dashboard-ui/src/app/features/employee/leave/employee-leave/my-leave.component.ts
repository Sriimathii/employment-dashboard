import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { LeaveService, LeaveRequest, LeaveBalance } from '../../../../core/services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-my-leave',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatSnackBarModule, MatProgressBarModule, MatChipsModule, MatDividerModule
  ],
  template: `
<div class="page-container">
  <h1 class="page-title">My Leave Requests</h1>

  <!-- FEATURE 3: Read-only banner -->
  <div class="readonly-banner" *ngIf="isReadOnly">
    <mat-icon>lock</mat-icon>
    <span>Your account is inactive — read-only mode. You cannot apply for leave.</span>
  </div>

  <!-- Balance Card -->
  <mat-card class="balance-card" *ngIf="balance">
    <div class="balance-row">
      <div class="bal-item">
        <span class="bal-val">{{ balance.monthlyLimit }}</span>
        <span class="bal-lbl">Monthly Limit</span>
      </div>
      <mat-divider [vertical]="true"></mat-divider>
      <div class="bal-item">
        <span class="bal-val used">{{ balance.usedThisMonth }}</span>
        <span class="bal-lbl">Used This Month</span>
      </div>
      <mat-divider [vertical]="true"></mat-divider>
      <div class="bal-item">
        <span class="bal-val" [class.remaining-ok]="balance.remainingBalance > 0" [class.remaining-zero]="balance.remainingBalance === 0">
          {{ balance.remainingBalance }}
        </span>
        <span class="bal-lbl">Remaining</span>
      </div>
      <div class="bal-month">
        <mat-icon>calendar_month</mat-icon>
        {{ monthName(balance.month) }} {{ balance.year }}
      </div>
    </div>
    <div class="balance-progress">
      <div class="progress-bar" [style.width.%]="(balance.usedThisMonth / balance.monthlyLimit) * 100"
           [class.progress-full]="balance.remainingBalance === 0"></div>
    </div>
  </mat-card>

  <div class="leave-layout">

    <!-- Apply Form -->
    <mat-card class="apply-card" *ngIf="!isReadOnly">
      <mat-card-header>
        <mat-card-title>Apply for Leave</mat-card-title>
        <mat-card-subtitle *ngIf="balance">
          {{ balance.remainingBalance }} day(s) remaining this month
        </mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" class="form-stack">

          <mat-form-field appearance="outline" class="full">
            <mat-label>Leave Type *</mat-label>
            <mat-select formControlName="leaveType">
              <mat-option *ngFor="let t of leaveTypes" [value]="t">{{ t }}</mat-option>
            </mat-select>
            <mat-error>Please select a leave type</mat-error>
          </mat-form-field>

          <div class="date-row">
            <mat-form-field appearance="outline">
              <mat-label>Start Date *</mat-label>
              <input matInput [matDatepicker]="sp" formControlName="startDate"
                     [min]="minDate" placeholder="DD/MM/YYYY">
              <mat-datepicker-toggle matIconSuffix [for]="sp"></mat-datepicker-toggle>
              <mat-datepicker #sp></mat-datepicker>
              <mat-error>Start date required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>End Date *</mat-label>
              <input matInput [matDatepicker]="ep" formControlName="endDate"
                     [min]="form.get('startDate')?.value || minDate" placeholder="DD/MM/YYYY">
              <mat-datepicker-toggle matIconSuffix [for]="ep"></mat-datepicker-toggle>
              <mat-datepicker #ep></mat-datepicker>
              <mat-error>End date required</mat-error>
            </mat-form-field>
          </div>

          <div class="duration-preview" *ngIf="durationDays > 0">
            <mat-icon>event_note</mat-icon>
            Duration: <strong>{{ durationDays }} day{{ durationDays !== 1 ? 's' : '' }}</strong>
            <span class="limit-warn" *ngIf="balance && durationDays > balance.remainingBalance">
              ⚠️ Exceeds monthly limit
            </span>
          </div>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Reason (optional)</mat-label>
            <textarea matInput formControlName="reason" rows="3"
                      placeholder="Briefly describe your reason..."></textarea>
          </mat-form-field>

          <button mat-raised-button color="primary" (click)="apply()"
                  [disabled]="form.invalid || submitting" class="submit-btn">
            <mat-icon>send</mat-icon>
            {{ submitting ? 'Submitting...' : 'Apply for Leave' }}
          </button>
        </form>
      </mat-card-content>
    </mat-card>

    <!-- Leave History -->
    <div class="history-col">
      <h2 class="history-title">Leave History</h2>
      <mat-progress-bar *ngIf="historyLoading" mode="indeterminate"></mat-progress-bar>

      <div class="leave-list">
        <mat-card class="leave-item" *ngFor="let l of leaves">
          <div class="li-header">
            <span class="type-chip">{{ l.leaveType }}</span>
            <span class="status-chip" [style.background]="statusBg(l.status)" [style.color]="statusFg(l.status)">
              <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:middle">{{ statusIcon(l.status) }}</mat-icon>
              {{ l.status }}
            </span>
          </div>

          <div class="li-dates">
            <mat-icon>date_range</mat-icon>
            {{ l.startDate | date:'mediumDate' }} → {{ l.endDate | date:'mediumDate' }}
            <span class="days-badge">{{ l.totalDays }} day{{ l.totalDays !== 1 ? 's' : '' }}</span>
          </div>

          <p class="li-reason" *ngIf="l.reason">{{ l.reason }}</p>
          <p class="li-remarks" *ngIf="l.remarks">
            <mat-icon>comment</mat-icon> <strong>Remarks:</strong> {{ l.remarks }}
          </p>
          <div class="li-footer">
            <span class="li-applied">Applied: {{ l.createdAt | date:'mediumDate' }}</span>
            <!-- FEATURE 1: Cancel button for Pending leaves -->
            <button mat-stroked-button color="warn" class="cancel-btn"
                    *ngIf="l.status === 'Pending' && !isReadOnly"
                    [disabled]="cancellingId === l.leaveId"
                    (click)="cancelLeave(l)">
              <mat-icon>cancel</mat-icon>
              {{ cancellingId === l.leaveId ? 'Cancelling...' : 'Cancel' }}
            </button>
          </div>
        </mat-card>

        <div class="empty-state" *ngIf="!historyLoading && leaves.length === 0">
          <mat-icon>beach_access</mat-icon>
          <p>No leave requests yet</p>
          <small>Use the form to apply for your first leave</small>
        </div>
      </div>
    </div>

  </div>
</div>`,
  styles: [`
    .page-container { padding:1.5rem; }
    .page-title { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0 0 1rem; }
    :host-context([data-theme='dark']) .page-title { color:#82b1ff; }

    .readonly-banner {
      display:flex; align-items:center; gap:.75rem;
      background:#fff3e0; color:#e65100;
      padding:.75rem 1rem; border-radius:10px; margin-bottom:1rem;
      font-weight:600; font-size:.875rem;
    }
    .readonly-banner mat-icon { font-size:20px; }

    .balance-card {
      border-radius:12px!important; margin-bottom:1.5rem;
      padding:1rem 1.5rem!important;
    }
    .balance-row {
      display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;
    }
    .bal-item { display:flex; flex-direction:column; align-items:center; min-width:80px; }
    .bal-val  { font-size:2rem; font-weight:800; color:#1a237e; }
    .bal-val.used { color:#e65100; }
    .bal-val.remaining-ok   { color:#2e7d32; }
    .bal-val.remaining-zero { color:#c62828; }
    .bal-lbl  { font-size:.75rem; color:#888; text-align:center; }
    .bal-month{ display:flex; align-items:center; gap:.3rem; color:#666; font-size:.85rem; margin-left:auto; }
    .bal-month mat-icon { font-size:18px; color:#1565c0; }
    .balance-progress {
      margin-top:.75rem; height:6px; background:#e0e0e0;
      border-radius:3px; overflow:hidden;
    }
    .progress-bar {
      height:100%; background:#1565c0; border-radius:3px; transition:width .3s;
    }
    .progress-full { background:#c62828; }

    .leave-layout { display:grid; grid-template-columns:400px 1fr; gap:1.5rem; }
    @media(max-width:900px) { .leave-layout { grid-template-columns:1fr; } }

    .apply-card { border-radius:12px!important; }
    .form-stack { display:flex; flex-direction:column; gap:.75rem; margin-top:1rem; }
    .full { width:100%; }
    .date-row { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }

    .duration-preview {
      display:flex; align-items:center; gap:.4rem;
      background:#e3f2fd; color:#1565c0; padding:.5rem .75rem;
      border-radius:8px; font-size:.875rem;
    }
    .duration-preview mat-icon { font-size:18px; width:18px; height:18px; }
    .limit-warn { color:#c62828; font-size:.8rem; margin-left:auto; }
    .submit-btn { height:48px; font-size:1rem; font-weight:600; }

    .history-col { display:flex; flex-direction:column; }
    .history-title { font-size:1.1rem; font-weight:700; color:#1a237e; margin:0 0 1rem; }
    :host-context([data-theme='dark']) .history-title { color:#82b1ff; }

    .leave-list { display:flex; flex-direction:column; gap:.75rem; }
    .leave-item { border-radius:10px!important; padding:1rem!important; }
    .li-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.75rem; }
    .type-chip   { background:#ede7f6; color:#512da8; padding:3px 12px; border-radius:12px; font-size:.8rem; font-weight:600; }
    .status-chip { padding:3px 10px; border-radius:12px; font-size:.8rem; font-weight:600; display:flex; align-items:center; gap:4px; }
    .li-dates { display:flex; align-items:center; gap:.5rem; font-size:.875rem; margin-bottom:.5rem; }
    .li-dates mat-icon { font-size:18px; color:#1565c0; }
    .days-badge { background:#e3f2fd; color:#1565c0; padding:1px 7px; border-radius:10px; font-size:.75rem; }
    .li-reason  { font-size:.875rem; color:#555; margin:.25rem 0; }
    .li-remarks { font-size:.8rem; color:#777; margin:.25rem 0; display:flex; align-items:center; gap:.3rem; }
    .li-remarks mat-icon { font-size:14px; }
    .li-footer  { display:flex; align-items:center; justify-content:space-between; margin-top:.5rem; }
    .li-applied { font-size:.75rem; color:#aaa; }
    .cancel-btn { font-size:.75rem!important; height:28px!important; padding:0 8px!important; }
    .cancel-btn mat-icon { font-size:14px!important; width:14px!important; height:14px!important; }

    .empty-state { text-align:center; padding:2.5rem; color:#bbb; }
    .empty-state mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto .75rem; }
    .empty-state p { font-size:1rem; margin:0 0 .25rem; }
    .empty-state small { font-size:.8rem; }
  `]
})
export class MyLeaveComponent implements OnInit {
  leaveTypes    = ['Annual','Sick','Casual','Maternity','Paternity','Unpaid','Other'];
  leaves:        LeaveRequest[] = [];
  balance:       LeaveBalance | null = null;
  submitting     = false;
  historyLoading = false;
  cancellingId:  number | null = null;
  minDate        = new Date();

  form = this.fb.group({
    leaveType: ['', Validators.required],
    startDate: [null as Date | null, Validators.required],
    endDate:   [null as Date | null, Validators.required],
    reason:    ['']
  });

  get durationDays(): number {
    const s = this.form.get('startDate')?.value as Date | null;
    const e = this.form.get('endDate')?.value   as Date | null;
    if (!s || !e || e < s) return 0;
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
  }

  get isReadOnly(): boolean { return this.auth.isReadOnly(); }

  constructor(
    private fb:       FormBuilder,
    private leaveSvc: LeaveService,
    private auth:     AuthService,
    private snack:    MatSnackBar
  ) {}

  ngOnInit() {
    this.loadHistory();
    this.loadBalance();
  }

  loadBalance() {
    this.leaveSvc.getBalance().subscribe({
      next: b => this.balance = b,
      error: () => {}
    });
  }

  loadHistory() {
    this.historyLoading = true;
    this.leaveSvc.getMy().subscribe({
      next:     r => { this.leaves = r; },
      complete: () => this.historyLoading = false,
      error:    () => this.historyLoading = false
    });
  }

  apply() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v         = this.form.value;
    const startDate = this.formatDate(v.startDate as Date);
    const endDate   = this.formatDate(v.endDate   as Date);
    if (!startDate || !endDate) {
      this.snack.open('Invalid dates.', '×', { duration: 3000 }); return;
    }
    this.submitting = true;
    this.leaveSvc.apply({ leaveType: v.leaveType!, startDate, endDate, reason: v.reason || undefined })
      .subscribe({
        next: () => {
          this.snack.open('Leave request submitted! Pending approval.', '×', { duration: 4000 });
          this.form.reset();
          this.loadHistory();
          this.loadBalance();
        },
        error: e => {
          this.snack.open(e.error?.message ?? 'Failed to submit.', '×', { duration: 5000 });
          this.submitting = false;
        },
        complete: () => this.submitting = false
      });
  }

  cancelLeave(l: LeaveRequest) {
    if (!confirm(`Cancel your ${l.leaveType} leave request (${l.startDate})?`)) return;
    this.cancellingId = l.leaveId;
    this.leaveSvc.cancel(l.leaveId).subscribe({
      next: r => {
        this.snack.open(r.message, '×', { duration: 4000 });
        this.loadHistory();
        this.loadBalance();
      },
      error: e => this.snack.open(e.error?.message ?? 'Failed to cancel.', '×', { duration: 4000 }),
      complete: () => this.cancellingId = null
    });
  }

  monthName(m: number): string {
    return new Date(2000, m - 1).toLocaleString('default', { month: 'long' });
  }

  private formatDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  statusBg(s: string) {
    const m: Record<string,string> = {
      'Approved':'#e8f5e9','Rejected':'#ffebee','Cancelled':'#f5f5f5','Pending':'#fff8e1','On Leave':'#e3f2fd'
    };
    return m[s] ?? '#f5f5f5';
  }
  statusFg(s: string) {
    const m: Record<string,string> = {
      'Approved':'#2e7d32','Rejected':'#c62828','Cancelled':'#757575','Pending':'#f57f17','On Leave':'#1565c0'
    };
    return m[s] ?? '#333';
  }
  statusIcon(s: string): string {
    const m: Record<string,string> = {
      'Approved':'check_circle','Rejected':'cancel','Cancelled':'block','Pending':'hourglass_empty','On Leave':'beach_access'
    };
    return m[s] ?? 'info';
  }
}