import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
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
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { LeaveService, LeaveRequest, LeaveBalance } from '../../../../core/services/leave.service';
import { AuthService } from '../../../../core/services/auth.service';
import type { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-manager-leave',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTabsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatSnackBarModule, MatProgressBarModule, MatDividerModule,
    MatBadgeModule, MatDialogModule, CommonModule,
  FormsModule
  ],
  template: `
<div class="page-container">

  <!-- Page Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Leave Management</h1>
      <p class="page-sub">Manage your personal leave and review your team's requests</p>
    </div>
    <div class="header-badges">
      <div class="badge-pill personal">
        <mat-icon>person</mat-icon>
        <span>My Leave</span>
      </div>
      <div class="badge-pill team" *ngIf="pendingTeamCount > 0">
        <mat-icon>groups</mat-icon>
        <span>{{ pendingTeamCount }} Pending</span>
      </div>
    </div>
  </div>

  <!-- Two-tab layout -->
  <mat-tab-group animationDuration="200ms" class="leave-tabs"
                 (selectedIndexChange)="onTabChange($event)">

    <!-- ══════════════════════════════════════════════════════
         TAB 1 — MY LEAVE (Personal Apply + History)
    ══════════════════════════════════════════════════════ -->
    <mat-tab>
      <ng-template mat-tab-label>
        <mat-icon style="margin-right:6px">person</mat-icon>
        My Leave
      </ng-template>

      <div class="tab-body">

        <!-- Read-only banner -->
        <div class="alert-banner readonly" *ngIf="isReadOnly">
          <mat-icon>lock</mat-icon>
          <span>Your account is inactive — read-only mode. You cannot apply for leave.</span>
        </div>

        <!-- Admin-only approval notice -->
        <div class="alert-banner info" *ngIf="!isReadOnly">
          <mat-icon>admin_panel_settings</mat-icon>
          <span>As a Manager, your personal leave requests are reviewed and approved by the
            <strong>Admin</strong> only — not visible to other managers.</span>
        </div>

        <!-- Leave Balance Card -->
        <mat-card class="balance-card" *ngIf="myBalance">
          <div class="balance-row">
            <div class="bal-item">
              <span class="bal-num">{{ myBalance()?.monthlyLimit ?? 0 }}</span>
              <span class="bal-lbl">Monthly Limit</span>
            </div>
            <mat-divider [vertical]="true" style="height:48px"></mat-divider>
            <div class="bal-item">
              <span class="bal-num used">{{ myBalance()?.usedThisMonth ?? 0 }}</span>
              <span class="bal-lbl">Used This Month</span>
            </div>
            <mat-divider [vertical]="true" style="height:48px"></mat-divider>
            <div class="bal-item">
             <span class="bal-num"
      [class.ok]="(myBalance()?.remainingBalance ?? 0) > 0"
      [class.zero]="(myBalance()?.remainingBalance ?? 0) === 0">
  {{ myBalance()?.remainingBalance }}
</span>
              <span class="bal-lbl">Remaining</span>
            </div>
            <div class="bal-month">
              <mat-icon>calendar_month</mat-icon>
              {{ monthName(myBalance()?.month ?? 1) }} {{ myBalance()?.year }}
            </div>
          </div>
          <div class="bal-progress-track">
            <div class="bal-progress-fill"
                 [style.width.%]="
  ((myBalance()?.usedThisMonth ?? 0) /
  (myBalance()?.monthlyLimit ?? 1)) * 100
"
                 [class.full]="myBalance()?.remainingBalance === 0"></div>
          </div>
        </mat-card>

        <!-- Apply + History grid -->
        <div class="my-leave-grid">

          <!-- Apply Form -->
          <mat-card class="apply-card" *ngIf="!isReadOnly">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>add_circle</mat-icon> Apply for Leave
              </mat-card-title>
              <mat-card-subtitle *ngIf="myBalance">
                {{ myBalance()?.remainingBalance }} day(s) remaining this month
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <form [formGroup]="applyForm" class="form-stack">

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
                    <mat-error>Required</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>End Date *</mat-label>
                    <input matInput [matDatepicker]="ep" formControlName="endDate"
                           [min]="applyForm.get('startDate')?.value || minDate" placeholder="DD/MM/YYYY">
                    <mat-datepicker-toggle matIconSuffix [for]="ep"></mat-datepicker-toggle>
                    <mat-datepicker #ep></mat-datepicker>
                    <mat-error>Required</mat-error>
                  </mat-form-field>
                </div>

                <div class="duration-hint" *ngIf="durationDays > 0">
                  <mat-icon>event_note</mat-icon>
                  <span>Duration: <strong>{{ durationDays }} day{{ durationDays !== 1 ? 's' : '' }}</strong></span>
                  <span class="over-limit" *ngIf="myBalance() && durationDays > (myBalance()?.remainingBalance ?? 0)">
                    ⚠️ Exceeds monthly limit
                  </span>
                </div>

                <mat-form-field appearance="outline" class="full">
                  <mat-label>Reason (optional)</mat-label>
                  <textarea matInput formControlName="reason" rows="3"
                            placeholder="Briefly describe your reason..."></textarea>
                </mat-form-field>

                <button mat-raised-button color="primary" (click)="applyLeave()"
                        [disabled]="applyForm.invalid || submitting()" class="submit-btn">
                  <mat-icon>send</mat-icon>
                  {{ submitting() ? 'Submitting...' : 'Submit Leave Request' }}
                </button>
              </form>
            </mat-card-content>
          </mat-card>

          <!-- My Leave History -->
          <div class="history-col">
            <div class="history-hdr">
              <h2>My Leave History</h2>
              <button mat-icon-button (click)="loadMyLeaves()" matTooltip="Refresh">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
            <mat-progress-bar *ngIf="myLoading()" mode="indeterminate"></mat-progress-bar>

            <div class="leave-list">
              <mat-card class="leave-card" *ngFor="let l of myLeaves()">
                <div class="lc-header">
                  <span class="type-chip">{{ l.leaveType }}</span>
                  <span class="status-chip" [ngClass]="'s-' + l.status.toLowerCase().replace(' ','-')">
                    <mat-icon>{{ statusIcon(l.status) }}</mat-icon>
                    {{ l.status }}
                  </span>
                </div>
                <div class="lc-dates">
                  <mat-icon>date_range</mat-icon>
                  {{ l.startDate | date:'mediumDate' }}
                  <span class="arrow">→</span>
                  {{ l.endDate | date:'mediumDate' }}
                  <span class="days-pill">{{ l.totalDays }}d</span>
                </div>
                <p class="lc-reason" *ngIf="l.reason">{{ l.reason }}</p>
                <div class="lc-approved" *ngIf="l.approvedByName">
                  <mat-icon>admin_panel_settings</mat-icon>
                  <span>Reviewed by: <strong>{{ l.approvedByName }}</strong></span>
                </div>
                <p class="lc-remarks" *ngIf="l.remarks">
                  <mat-icon>comment</mat-icon>{{ l.remarks }}
                </p>
                <div class="lc-footer">
                  <span class="lc-date">Applied {{ l.createdAt | date:'mediumDate' }}</span>
                  <button mat-stroked-button color="warn" class="cancel-btn"
                          *ngIf="l.status === 'Pending' && !isReadOnly"
                          [disabled]="cancellingId() === l.leaveId"
                          (click)="cancelMyLeave(l)">
                    <mat-icon>cancel</mat-icon>
                    {{ cancellingId() === l.leaveId ? '...' : 'Cancel' }}
                  </button>
                </div>
              </mat-card>

              <div class="empty-state" *ngIf="!myLoading() && myLeaves().length === 0">
                <mat-icon>beach_access</mat-icon>
                <p>No leave requests yet</p>
                <small>Use the form on the left to apply</small>
              </div>
            </div>
          </div>
        </div>

      </div>
    </mat-tab>

    <!-- ══════════════════════════════════════════════════════
         TAB 2 — TEAM LEAVE REQUESTS (Approve / Reject)
    ══════════════════════════════════════════════════════ -->
    <mat-tab>
      <ng-template mat-tab-label>
        <mat-icon style="margin-right:6px">groups</mat-icon>
        Team Leave Requests
        <span class="tab-badge" *ngIf="pendingTeamCount > 0">{{ pendingTeamCount }}</span>
      </ng-template>

      <div class="tab-body">

        <!-- Filter bar -->
        <div class="filter-row">
          <div class="filter-chips">
            <button class="filter-chip" [class.active]="teamFilter() === ''"
                    (click)="setTeamFilter('')">
              All <span class="fc-count">{{ teamLeaves().length }}</span>
            </button>
            <button class="filter-chip pending" [class.active]="teamFilter() === 'Pending'"
                    (click)="setTeamFilter('Pending')">
              Pending <span class="fc-count">{{ countByStatus('Pending') }}</span>
            </button>
            <button class="filter-chip approved" [class.active]="teamFilter() === 'Approved'"
                    (click)="setTeamFilter('Approved')">
              Approved <span class="fc-count">{{ countByStatus('Approved') }}</span>
            </button>
            <button class="filter-chip rejected" [class.active]="teamFilter() === 'Rejected'"
                    (click)="setTeamFilter('Rejected')">
              Rejected <span class="fc-count">{{ countByStatus('Rejected') }}</span>
            </button>
          </div>
          <button mat-icon-button (click)="loadTeamLeaves()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>

        <mat-progress-bar *ngIf="teamLoading()" mode="indeterminate" style="margin-bottom:1rem;border-radius:4px"></mat-progress-bar>

        <!-- Remarks input (shown when approving/rejecting) -->
        <mat-card class="remarks-card" *ngIf="actionLeaveId()">
          <mat-card-content>
            <div class="remarks-hdr">
              <mat-icon>{{ pendingAction() === 'Approved' ? 'check_circle' : 'cancel' }}</mat-icon>
              <span>{{ pendingAction() === 'Approved' ? 'Approving' : 'Rejecting' }}
                leave request for <strong>{{ actionLeaveName() }}</strong></span>
            </div>
            <mat-form-field appearance="outline" style="width:100%;margin-top:.75rem">
              <mat-label>Remarks (optional)</mat-label>
              <textarea matInput [(ngModel)]="remarksText" rows="2"
                        placeholder="Add a note for the employee..."></textarea>
            </mat-form-field>
            <div class="remarks-actions">
              <button mat-raised-button [color]="pendingAction() === 'Approved' ? 'primary' : 'warn'"
                      [disabled]="approvingId() !== null"
                      (click)="confirmAction()">
                <mat-icon>{{ pendingAction() === 'Approved' ? 'check' : 'close' }}</mat-icon>
                {{ approvingId() !== null ? 'Processing...' : 'Confirm ' + pendingAction() }}
              </button>
              <button mat-stroked-button (click)="cancelAction()">Cancel</button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Team leave cards -->
        <div class="team-list">
          <mat-card class="team-leave-card"
                    *ngFor="let l of filteredTeamLeaves()"
                    [class.card-pending]="l.status === 'Pending'"
                    [class.card-approved]="l.status === 'Approved'"
                    [class.card-rejected]="l.status === 'Rejected'">

            <!-- Employee info row -->
            <div class="tlc-header">
              <div class="emp-avatar">{{ initials(l.employeeName) }}</div>
              <div class="emp-info">
                <span class="emp-name">{{ l.employeeName }}</span>
                <span class="emp-dept">{{ l.departmentName }}</span>
              </div>
              <span class="status-chip" [ngClass]="'s-' + l.status.toLowerCase().replace(' ','-')">
                <mat-icon>{{ statusIcon(l.status) }}</mat-icon>
                {{ l.status }}
              </span>
            </div>

            <!-- Leave details -->
            <div class="tlc-body">
              <div class="tlc-type-row">
                <span class="type-chip">{{ l.leaveType }}</span>
                <span class="days-pill">{{ l.totalDays }} day{{ l.totalDays !== 1 ? 's' : '' }}</span>
              </div>
              <div class="tlc-dates">
                <mat-icon>date_range</mat-icon>
                <strong>{{ l.startDate | date:'mediumDate' }}</strong>
                <span class="arrow">→</span>
                <strong>{{ l.endDate | date:'mediumDate' }}</strong>
              </div>
              <p class="tlc-reason" *ngIf="l.reason">
                <mat-icon>notes</mat-icon> {{ l.reason }}
              </p>
              <p class="tlc-remarks" *ngIf="l.remarks">
                <mat-icon>comment</mat-icon> <strong>Your remarks:</strong> {{ l.remarks }}
              </p>
              <div class="tlc-meta">
                <mat-icon>schedule</mat-icon>
                <span>Applied {{ l.createdAt | date:'mediumDate' }}</span>
              </div>
            </div>

            <!-- Action buttons (only for Pending) -->
            <div class="tlc-actions" *ngIf="l.status === 'Pending' && !isReadOnly">
              <button mat-raised-button class="approve-btn"
                      [disabled]="approvingId() !== null || actionLeaveId() !== null"
                      (click)="startAction(l, 'Approved')">
                <mat-icon>check_circle</mat-icon> Approve
              </button>
              <button mat-raised-button class="reject-btn"
                      [disabled]="approvingId() !== null || actionLeaveId() !== null"
                      (click)="startAction(l, 'Rejected')">
                <mat-icon>cancel</mat-icon> Reject
              </button>
            </div>

          </mat-card>

          <div class="empty-state" *ngIf="!teamLoading() && filteredTeamLeaves().length === 0">
            <mat-icon>event_available</mat-icon>
            <p>{{ teamFilter() ? 'No ' + teamFilter().toLowerCase() + ' requests' : 'No team leave requests' }}</p>
            <small *ngIf="!teamFilter()">Your team members' leave requests will appear here</small>
          </div>
        </div>

      </div>
    </mat-tab>

  </mat-tab-group>

</div>`,
  styles: [`
    /* ── Layout ──────────────────────────────────────────── */
    .page-container { padding: 1.5rem; }
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
    }
    .page-title { font-size: 1.75rem; font-weight: 700; color: #1a237e; margin: 0; }
    .page-sub   { color: #777; margin: .3rem 0 0; font-size: .875rem; }
    :host-context([data-theme='dark']) .page-title { color: #82b1ff; }
    :host-context([data-theme='dark']) .page-sub   { color: rgba(255,255,255,.5); }

    .header-badges { display: flex; gap: .6rem; }
    .badge-pill {
      display: flex; align-items: center; gap: .4rem;
      padding: .4rem 1rem; border-radius: 20px; font-size: .8rem; font-weight: 600;
    }
    .badge-pill mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .badge-pill.personal { background: #e8eaf6; color: #3949ab; }
    .badge-pill.team     { background: #fff3e0; color: #e65100; }

    /* ── Tabs ─────────────────────────────────────────────── */
    .leave-tabs { background: transparent; }
    .tab-badge {
      display: inline-flex; align-items: center; justify-content: center;
      background: #e53935; color: white;
      border-radius: 10px; padding: 1px 7px; font-size: .68rem; font-weight: 700;
      margin-left: 6px; min-width: 20px;
    }
    .tab-body { padding: 1.5rem 0; }

    /* ── Alert Banners ────────────────────────────────────── */
    .alert-banner {
      display: flex; align-items: center; gap: .75rem;
      padding: .75rem 1rem; border-radius: 10px; margin-bottom: 1.25rem;
      font-size: .875rem;
    }
    .alert-banner mat-icon { flex-shrink: 0; font-size: 20px; }
    .alert-banner.readonly { background: #fff3e0; color: #e65100; font-weight: 600; }
    .alert-banner.info     { background: #e8eaf6; color: #283593; }
    :host-context([data-theme='dark']) .alert-banner.info { background: rgba(130,177,255,.12); color: #82b1ff; }

    /* ── Balance Card ─────────────────────────────────────── */
    .balance-card { border-radius: 12px !important; padding: 1rem 1.5rem !important; margin-bottom: 1.5rem; }
    .balance-row { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
    .bal-item { display: flex; flex-direction: column; align-items: center; min-width: 72px; }
    .bal-num  { font-size: 1.9rem; font-weight: 800; color: #1a237e; line-height: 1.1; }
    .bal-num.used { color: #e65100; }
    .bal-num.ok   { color: #2e7d32; }
    .bal-num.zero { color: #c62828; }
    .bal-lbl  { font-size: .72rem; color: #888; text-align: center; margin-top: 2px; }
    .bal-month { display: flex; align-items: center; gap: .3rem; color: #666; font-size: .85rem; margin-left: auto; }
    .bal-month mat-icon { font-size: 18px; color: #1565c0; }
    .bal-progress-track { margin-top: .75rem; height: 5px; background: #e0e0e0; border-radius: 3px; overflow: hidden; }
    .bal-progress-fill  { height: 100%; background: #1565c0; border-radius: 3px; transition: width .4s ease; }
    .bal-progress-fill.full { background: #c62828; }
    :host-context([data-theme='dark']) .balance-card { background: #1e1e35 !important; }
    :host-context([data-theme='dark']) .bal-num { color: #82b1ff !important; }

    /* ── My Leave Grid ────────────────────────────────────── */
    .my-leave-grid { display: grid; grid-template-columns: 380px 1fr; gap: 1.5rem; }
    @media (max-width: 900px) { .my-leave-grid { grid-template-columns: 1fr; } }

    .apply-card { border-radius: 12px !important; }
    mat-card-title { display: flex; align-items: center; gap: .5rem; font-size: 1rem !important; }
    mat-card-title mat-icon { color: #1565c0; font-size: 20px; }
    .form-stack { display: flex; flex-direction: column; gap: .75rem; margin-top: 1rem; }
    .full       { width: 100%; }
    .date-row   { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .duration-hint {
      display: flex; align-items: center; gap: .4rem;
      background: #e3f2fd; color: #1565c0; padding: .5rem .75rem;
      border-radius: 8px; font-size: .875rem;
    }
    .duration-hint mat-icon { font-size: 18px; }
    .over-limit { color: #c62828; font-size: .8rem; margin-left: auto; }
    .submit-btn { height: 48px; font-size: 1rem; font-weight: 600; width: 100%; }

    /* ── History Column ───────────────────────────────────── */
    .history-col { display: flex; flex-direction: column; }
    .history-hdr {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: .75rem;
    }
    .history-hdr h2 { font-size: 1rem; font-weight: 700; color: #1a237e; margin: 0; }
    :host-context([data-theme='dark']) .history-hdr h2 { color: #82b1ff; }

    /* ── Shared Leave Card ────────────────────────────────── */
    .leave-list  { display: flex; flex-direction: column; gap: .75rem; }
    .leave-card  {
      border-radius: 12px !important; padding: 1rem !important;
      transition: box-shadow .2s ease;
    }
    .leave-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1) !important; }

    .lc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .6rem; }
    .lc-dates  { display: flex; align-items: center; gap: .4rem; font-size: .875rem; margin-bottom: .4rem; }
    .lc-dates mat-icon { font-size: 17px; color: #1565c0; }
    .arrow { color: #aaa; font-size: .75rem; }
    .lc-reason  { font-size: .85rem; color: #666; margin: .25rem 0; }
    .lc-approved { display: flex; align-items: center; gap: .35rem; font-size: .8rem; color: #283593; margin: .25rem 0; }
    .lc-approved mat-icon { font-size: 14px; }
    .lc-remarks  { display: flex; align-items: center; gap: .35rem; font-size: .8rem; color: #777; margin: .25rem 0; }
    .lc-remarks mat-icon { font-size: 14px; }
    .lc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: .5rem; }
    .lc-date   { font-size: .75rem; color: #bbb; }
    .cancel-btn { font-size: .75rem !important; height: 28px !important; padding: 0 8px !important; }
    .cancel-btn mat-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; }
    :host-context([data-theme='dark']) .lc-reason { color: rgba(255,255,255,.55); }

    /* ── Status chips (shared) ────────────────────────────── */
    .type-chip {
      background: #ede7f6; color: #512da8;
      padding: 3px 12px; border-radius: 20px;
      font-size: .78rem; font-weight: 700;
    }
    .days-pill {
      background: #e3f2fd; color: #1565c0;
      padding: 2px 10px; border-radius: 20px;
      font-size: .75rem; font-weight: 600;
    }
    .status-chip {
      display: flex; align-items: center; gap: 3px;
      padding: 3px 10px; border-radius: 20px;
      font-size: .78rem; font-weight: 700;
    }
    .status-chip mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .s-pending   { background: #fff8e1; color: #f57f17; }
    .s-approved  { background: #e8f5e9; color: #2e7d32; }
    .s-rejected  { background: #ffebee; color: #c62828; }
    .s-cancelled { background: #f5f5f5; color: #757575; }
    .s-on-leave  { background: #e3f2fd; color: #1565c0; }

    /* ── Filter Row (Team tab) ────────────────────────────── */
    .filter-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1.25rem; flex-wrap: wrap; gap: .5rem;
    }
    .filter-chips { display: flex; gap: .4rem; flex-wrap: wrap; }
    .filter-chip {
      display: flex; align-items: center; gap: .3rem;
      padding: .35rem 1rem; border-radius: 20px;
      border: 2px solid #e0e0e0; background: white;
      font-size: .8rem; font-weight: 600; cursor: pointer;
      transition: all .2s ease; color: #555;
    }
    .filter-chip:hover { border-color: #1a237e; color: #1a237e; }
    .filter-chip.active { background: #1a237e; color: white; border-color: #1a237e; }
    .filter-chip.pending.active  { background: #f57f17; border-color: #f57f17; }
    .filter-chip.approved.active { background: #2e7d32; border-color: #2e7d32; }
    .filter-chip.rejected.active { background: #c62828; border-color: #c62828; }
    .fc-count {
      background: rgba(0,0,0,.1); padding: 1px 6px;
      border-radius: 10px; font-size: .7rem;
    }
    .filter-chip.active .fc-count { background: rgba(255,255,255,.25); }
    :host-context([data-theme='dark']) .filter-chip { background: #1e293b; border-color: rgba(255,255,255,.12); color: rgba(255,255,255,.7); }

    /* ── Remarks card ─────────────────────────────────────── */
    .remarks-card {
      border-radius: 12px !important; margin-bottom: 1.25rem;
      border: 2px solid #1a237e !important;
      animation: slideDown .25s ease;
    }
    @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
    .remarks-hdr { display: flex; align-items: center; gap: .6rem; font-size: .95rem; font-weight: 600; }
    .remarks-hdr mat-icon { font-size: 22px; color: #1565c0; }
    .remarks-actions { display: flex; gap: .75rem; margin-top: .5rem; }

    /* ── Team Leave Cards ─────────────────────────────────── */
    .team-list { display: flex; flex-direction: column; gap: 1rem; }
    .team-leave-card {
      border-radius: 14px !important; padding: 1.25rem !important;
      border-left: 4px solid #e0e0e0 !important;
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .team-leave-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.1) !important; }
    .card-pending  { border-left-color: #f57f17 !important; }
    .card-approved { border-left-color: #2e7d32 !important; }
    .card-rejected { border-left-color: #c62828 !important; }

    .tlc-header {
      display: flex; align-items: center; gap: .85rem; margin-bottom: .85rem;
    }
    .emp-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #1a237e, #1565c0);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: .875rem; font-weight: 700; flex-shrink: 0;
    }
    .emp-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .emp-name { font-size: .95rem; font-weight: 700; color: #1a237e; }
    .emp-dept { font-size: .75rem; color: #888; }
    :host-context([data-theme='dark']) .emp-name { color: #82b1ff; }

    .tlc-body { margin-bottom: .85rem; }
    .tlc-type-row { display: flex; align-items: center; gap: .5rem; margin-bottom: .6rem; }
    .tlc-dates {
      display: flex; align-items: center; gap: .4rem;
      font-size: .875rem; color: #555; margin-bottom: .4rem;
    }
    .tlc-dates mat-icon { font-size: 17px; color: #1565c0; }
    .tlc-reason, .tlc-remarks {
      display: flex; align-items: center; gap: .4rem;
      font-size: .82rem; color: #666; margin: .3rem 0;
    }
    .tlc-reason mat-icon, .tlc-remarks mat-icon { font-size: 15px; width: 15px; height: 15px; color: #aaa; }
    .tlc-meta { display: flex; align-items: center; gap: .35rem; font-size: .78rem; color: #aaa; margin-top: .25rem; }
    .tlc-meta mat-icon { font-size: 14px; width: 14px; height: 14px; }
    :host-context([data-theme='dark']) .tlc-dates, :host-context([data-theme='dark']) .tlc-reason { color: rgba(255,255,255,.55); }

    .tlc-actions { display: flex; gap: .75rem; flex-wrap: wrap; }
    .approve-btn {
      background: #e8f5e9 !important; color: #2e7d32 !important;
      font-weight: 700 !important; border-radius: 10px !important;
      transition: all .2s ease !important;
    }
    .approve-btn:hover { background: #2e7d32 !important; color: white !important; }
    .approve-btn:not(:disabled):hover { box-shadow: 0 4px 14px rgba(46,125,50,.35) !important; }
    .reject-btn  {
      background: #ffebee !important; color: #c62828 !important;
      font-weight: 700 !important; border-radius: 10px !important;
      transition: all .2s ease !important;
    }
    .reject-btn:hover { background: #c62828 !important; color: white !important; }
    .reject-btn:not(:disabled):hover { box-shadow: 0 4px 14px rgba(198,40,40,.35) !important; }
    .approve-btn mat-icon, .reject-btn mat-icon { font-size: 18px !important; }

    /* ── Empty State ──────────────────────────────────────── */
    .empty-state { text-align: center; padding: 3rem; color: #bbb; }
    .empty-state mat-icon { font-size: 52px; width: 52px; height: 52px; display: block; margin: 0 auto .75rem; }
    .empty-state p { font-size: 1rem; margin: 0 0 .25rem; color: #999; }
    .empty-state small { font-size: .8rem; }
  `]
})
export class ManagerLeaveComponent implements OnInit {

  readonly leaveTypes = ['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other'];
  readonly minDate    = new Date();

  // ── Signals ───────────────────────────────────────────────
  myLeaves     = signal<LeaveRequest[]>([]);
  teamLeaves   = signal<LeaveRequest[]>([]);
  myBalance    = signal<LeaveBalance | null>(null);
  myLoading    = signal(false);
  teamLoading  = signal(false);
  submitting   = signal(false);
  cancellingId = signal<number | null>(null);
  approvingId  = signal<number | null>(null);
  teamFilter   = signal('');
  actionLeaveId   = signal<number | null>(null);
  actionLeaveName = signal('');
  pendingAction   = signal<'Approved' | 'Rejected'>('Approved');
  remarksText     = '';

  applyForm: FormGroup;

  // ── Computed ──────────────────────────────────────────────
  get pendingTeamCount(): number {
    return this.teamLeaves().filter(l => l.status === 'Pending').length;
  }

  filteredTeamLeaves(): LeaveRequest[] {
    const f = this.teamFilter();
    return f ? this.teamLeaves().filter(l => l.status === f) : this.teamLeaves();
  }

  countByStatus(status: string): number {
    return this.teamLeaves().filter(l => l.status === status).length;
  }

  get isReadOnly(): boolean { return this.auth.isReadOnly(); }

  get durationDays(): number {
    const s = this.applyForm.get('startDate')?.value as Date | null;
    const e = this.applyForm.get('endDate')?.value   as Date | null;
    if (!s || !e || e < s) return 0;
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
  }

  constructor(
    private fb:       FormBuilder,
    private leaveSvc: LeaveService,
    private auth:     AuthService,
    private snack:    MatSnackBar
  ) {
    this.applyForm = this.fb.group({
      leaveType: ['', Validators.required],
      startDate: [null as Date | null, Validators.required],
      endDate:   [null as Date | null, Validators.required],
      reason:    ['']
    });
  }

  ngOnInit(): void {
    this.loadMyLeaves();
    this.loadMyBalance();
    this.loadTeamLeaves();
  }

  onTabChange(index: number): void {
    if (index === 1) this.loadTeamLeaves();
  }

  // ── MY LEAVE methods ──────────────────────────────────────
  loadMyBalance(): void {
    this.leaveSvc.getBalance().subscribe({
      next:  b => this.myBalance.set(b),
      error: () => {}
    });
  }

  loadMyLeaves(): void {
    this.myLoading.set(true);
    this.leaveSvc.getMy().subscribe({
      next:     r  => this.myLeaves.set(r),
      error:    () => this.myLoading.set(false),
      complete: () => this.myLoading.set(false)
    });
  }

  applyLeave(): void {
    if (this.applyForm.invalid) { this.applyForm.markAllAsTouched(); return; }
    const v = this.applyForm.value;
    const startDate = this.fmt(v.startDate);
    const endDate   = this.fmt(v.endDate);
    if (!startDate || !endDate) {
      this.snack.open('Invalid dates.', '×', { duration: 3000 }); return;
    }
    this.submitting.set(true);
    this.leaveSvc.apply({ leaveType: v.leaveType!, startDate, endDate, reason: v.reason || undefined })
      .subscribe({
        next: () => {
          this.snack.open('Leave submitted! Awaiting Admin approval.', '×', { duration: 4000 });
          this.applyForm.reset();
          this.loadMyLeaves();
          this.loadMyBalance();
        },
        error:    e  => { this.snack.open(e.error?.message ?? 'Failed.', '×', { duration: 5000 }); this.submitting.set(false); },
        complete: () => this.submitting.set(false)
      });
  }

  cancelMyLeave(l: LeaveRequest): void {
    if (!confirm(`Cancel your ${l.leaveType} leave request?`)) return;
    this.cancellingId.set(l.leaveId);
    this.leaveSvc.cancel(l.leaveId).subscribe({
      next:     r  => { this.snack.open(r.message, '×', { duration: 4000 }); this.loadMyLeaves(); this.loadMyBalance(); },
      error:    e  => this.snack.open(e.error?.message ?? 'Failed.', '×', { duration: 4000 }),
      complete: () => this.cancellingId.set(null)
    });
  }

  // ── TEAM LEAVE methods ────────────────────────────────────
  loadTeamLeaves(): void {
    this.teamLoading.set(true);
    // getAll() → backend already filters to manager's department
    this.leaveSvc.getAll(undefined, 1, 100).subscribe({
      next:     r  => this.teamLeaves.set(r.data),
      error:    () => this.teamLoading.set(false),
      complete: () => this.teamLoading.set(false)
    });
  }

  setTeamFilter(f: string): void { this.teamFilter.set(f); }

  startAction(l: LeaveRequest, action: 'Approved' | 'Rejected'): void {
    this.actionLeaveId.set(l.leaveId);
    this.actionLeaveName.set(l.employeeName);
    this.pendingAction.set(action);
    this.remarksText = '';
    // Scroll to remarks card
    setTimeout(() => document.querySelector('.remarks-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  cancelAction(): void {
    this.actionLeaveId.set(null);
    this.remarksText = '';
  }

  confirmAction(): void {
    const id = this.actionLeaveId();
    if (!id) return;
    this.approvingId.set(id);
    this.leaveSvc.approve(id, this.pendingAction(), this.remarksText || undefined)
      .subscribe({
        next: () => {
          const msg = this.pendingAction() === 'Approved'
            ? `✅ Leave approved for ${this.actionLeaveName()}.`
            : `❌ Leave rejected for ${this.actionLeaveName()}.`;
          this.snack.open(msg, '×', { duration: 4000 });
          this.actionLeaveId.set(null);
          this.remarksText = '';
          this.loadTeamLeaves();
        },
        error:    e  => { this.snack.open(e.error?.message ?? 'Failed.', '×', { duration: 4000 }); this.approvingId.set(null); },
        complete: () => this.approvingId.set(null)
      });
  }

  // ── Helpers ───────────────────────────────────────────────
  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  monthName(m: number): string {
    return new Date(2000, m - 1).toLocaleString('default', { month: 'long' });
  }

  statusIcon(s: string): string {
    const m: Record<string, string> = {
      'Approved':  'check_circle',
      'Rejected':  'cancel',
      'Cancelled': 'block',
      'Pending':   'hourglass_empty',
      'On Leave':  'beach_access'
    };
    return m[s] ?? 'info';
  }

  private fmt(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}