import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LeaveService, LeaveRequest } from '../../../../core/services/leave.service';

@Component({
  selector: 'app-admin-leave',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatTableModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, MatPaginatorModule,
    MatProgressBarModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
<div class="page-container">
  <div class="page-header">
    <div><h1>Leave Management</h1><p>Review and manage all employee leave requests</p></div>
  </div>

  <!-- Status Filter Chips -->
  <div class="chip-row">
    <div class="chip chip-pending"  (click)="setFilter('Pending')">
      <mat-icon>pending</mat-icon> Pending ({{ counts.pending }})
    </div>
    <div class="chip chip-approved" (click)="setFilter('Approved')">
      <mat-icon>check_circle</mat-icon> Approved ({{ counts.approved }})
    </div>
    <div class="chip chip-rejected" (click)="setFilter('Rejected')">
      <mat-icon>cancel</mat-icon> Rejected ({{ counts.rejected }})
    </div>
    <div class="chip chip-all" (click)="setFilter('')">
      <mat-icon>list</mat-icon> All ({{ counts.total }})
    </div>
  </div>

  <mat-progress-bar *ngIf="loading" mode="indeterminate"></mat-progress-bar>

  <!-- Table -->
  <mat-card class="table-card">
    <table mat-table [dataSource]="leaves">

      <ng-container matColumnDef="employee">
        <th mat-header-cell *matHeaderCellDef>EMPLOYEE</th>
        <td mat-cell *matCellDef="let l">
          <strong>{{ l.employeeName }}</strong>
          <span style="display:block;font-size:.75rem;color:#888">{{ l.departmentName }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="type">
        <th mat-header-cell *matHeaderCellDef>TYPE</th>
        <td mat-cell *matCellDef="let l">
          <span class="type-chip">{{ l.leaveType }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="duration">
        <th mat-header-cell *matHeaderCellDef>DURATION</th>
        <td mat-cell *matCellDef="let l">
          <div style="font-size:.875rem">
            {{ l.startDate | date:'mediumDate' }} &rarr; {{ l.endDate | date:'mediumDate' }}
          </div>
          <span class="days-chip">{{ l.totalDays }} day{{ l.totalDays !== 1 ? 's' : '' }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="reason">
        <th mat-header-cell *matHeaderCellDef>REASON</th>
        <td mat-cell *matCellDef="let l" class="reason-cell">{{ l.reason || '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>STATUS</th>
        <td mat-cell *matCellDef="let l">
          <span [style.background]="statusBg(l.status)"
                [style.color]="statusFg(l.status)"
                class="status-chip">{{ l.status }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="appliedOn">
        <th mat-header-cell *matHeaderCellDef>APPLIED ON</th>
        <td mat-cell *matCellDef="let l">{{ l.createdAt | date:'mediumDate' }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>ACTIONS</th>
        <td mat-cell *matCellDef="let l">
          <div *ngIf="l.status === 'Pending'; else viewOnly" style="display:flex;gap:.5rem">
            <button mat-raised-button color="primary" style="min-width:auto;font-size:.8rem"
                    (click)="openDialog(l, 'Approved')">
              <mat-icon>check</mat-icon> Approve
            </button>
            <button mat-raised-button color="warn" style="min-width:auto;font-size:.8rem"
                    (click)="openDialog(l, 'Rejected')">
              <mat-icon>close</mat-icon> Reject
            </button>
          </div>
          <ng-template #viewOnly>
            <span style="font-size:.8rem;color:#888">{{ l.approvedByName ? 'By: '+l.approvedByName : '' }}</span>
          </ng-template>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;" class="table-row"></tr>

      <tr class="mat-row" *matNoDataRow>
        <td [attr.colspan]="cols.length" class="no-data-cell">
          <mat-icon>event_busy</mat-icon>
          <p>No leave requests found</p>
          <small *ngIf="filterStatus">Try clicking "All" to see all requests</small>
        </td>
      </tr>
    </table>

    <mat-paginator [length]="total" [pageSize]="pageSize"
      [pageSizeOptions]="[10,25,50]" (page)="onPage($event)" showFirstLastButtons>
    </mat-paginator>
  </mat-card>

  <!-- Approve/Reject Dialog -->
  <div class="dialog-overlay" *ngIf="dialogLeave" (click)="closeDialog()">
    <div class="dialog-box" (click)="$event.stopPropagation()">

      <div class="dialog-head"
           [style.background]="dialogAction === 'Approved' ? '#e8f5e9' : '#ffebee'"
           [style.color]="dialogAction === 'Approved' ? '#2e7d32' : '#c62828'">
        <mat-icon>{{ dialogAction === 'Approved' ? 'check_circle' : 'cancel' }}</mat-icon>
        <h3>{{ dialogAction === 'Approved' ? 'Approve' : 'Reject' }} Leave Request</h3>
      </div>

      <div class="dialog-body">
        <div class="info-row"><strong>Employee:</strong> {{ dialogLeave.employeeName }}</div>
        <div class="info-row"><strong>Department:</strong> {{ dialogLeave.departmentName }}</div>
        <div class="info-row"><strong>Leave Type:</strong> {{ dialogLeave.leaveType }}</div>
        <div class="info-row">
          <strong>Duration:</strong>
          {{ dialogLeave.startDate | date:'mediumDate' }} to {{ dialogLeave.endDate | date:'mediumDate' }}
          ({{ dialogLeave.totalDays }} day{{ dialogLeave.totalDays !== 1 ? 's' : '' }})
        </div>
        <div class="info-row" *ngIf="dialogLeave.reason">
          <strong>Reason:</strong> {{ dialogLeave.reason }}
        </div>

        <mat-form-field appearance="outline" style="width:100%;margin-top:1rem">
          <mat-label>Remarks (optional)</mat-label>
          <textarea matInput [(ngModel)]="dialogRemarks" rows="3"
                    placeholder="Add your decision remarks..."></textarea>
        </mat-form-field>
      </div>

      <div class="dialog-foot">
        <button mat-stroked-button (click)="closeDialog()">Cancel</button>
        <button mat-raised-button
                [color]="dialogAction === 'Approved' ? 'primary' : 'warn'"
                (click)="submitDecision()" [disabled]="deciding">
          <mat-spinner diameter="18" *ngIf="deciding" style="display:inline-block;margin-right:.35rem"></mat-spinner>
          {{ deciding ? 'Processing...' : 'Confirm ' + dialogAction }}
        </button>
      </div>
    </div>
  </div>
</div>`,
  styles: [`
    .page-container { padding:1.5rem; }
    .page-header { margin-bottom:1rem; }
    .page-header h1 { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0; }
    .page-header p  { color:#666; margin:.25rem 0 0; font-size:.875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color:#82b1ff; }

    .chip-row { display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1.25rem; }
    .chip { display:flex; align-items:center; gap:.5rem; padding:.55rem 1.1rem; border-radius:24px;
            font-size:.875rem; font-weight:600; cursor:pointer; user-select:none; transition:transform .15s; }
    .chip:hover { transform:translateY(-1px); }
    .chip mat-icon { font-size:18px; width:18px; height:18px; }
    .chip-pending  { background:#fff8e1; color:#f57f17; }
    .chip-approved { background:#e8f5e9; color:#2e7d32; }
    .chip-rejected { background:#ffebee; color:#c62828; }
    .chip-all      { background:#e3f2fd; color:#1565c0; }

    .table-card { border-radius:12px!important; overflow:hidden; }
    .table-row:hover { background:rgba(26,35,126,.04)!important; }
    .type-chip  { background:#ede7f6; color:#512da8; padding:3px 10px; border-radius:12px; font-size:.78rem; font-weight:600; white-space:nowrap; }
    .days-chip  { background:#e3f2fd; color:#1565c0; padding:1px 7px; border-radius:10px; font-size:.75rem; }
    .status-chip{ padding:3px 10px; border-radius:12px; font-size:.78rem; font-weight:600; white-space:nowrap; }
    .reason-cell{ max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:.875rem; color:#555; }
    .no-data-cell { text-align:center!important; padding:3rem!important; color:#bbb; }
    .no-data-cell mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto .5rem; }
    .no-data-cell p { font-size:1rem; margin:0 0 .25rem; }

    .dialog-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .dialog-box { background:white; border-radius:16px; width:90%; max-width:500px; overflow:hidden; box-shadow:0 24px 48px rgba(0,0,0,.25); }
    :host-context([data-theme='dark']) .dialog-box { background:#1e1e2e; }
    .dialog-head { display:flex; align-items:center; gap:.75rem; padding:1.25rem 1.5rem; }
    .dialog-head h3 { margin:0; font-size:1.1rem; font-weight:700; }
    .dialog-head mat-icon { font-size:28px; width:28px; height:28px; }
    .dialog-body { padding:1.25rem 1.5rem; }
    .info-row { margin:.4rem 0; font-size:.9rem; }
    .dialog-foot { display:flex; justify-content:flex-end; gap:.75rem; padding:1rem 1.5rem; border-top:1px solid #eee; }
  `]
})
export class AdminLeaveComponent implements OnInit {
  // Plain properties - NO signals
  leaves:       LeaveRequest[] = [];
  total         = 0;
  loading       = false;
  deciding      = false;
  filterStatus  = '';
  page          = 1;
  pageSize      = 10;
  counts        = { pending: 0, approved: 0, rejected: 0, total: 0 };
  cols          = ['employee','type','duration','reason','status','appliedOn','actions'];

  dialogLeave:   LeaveRequest | null = null;
  dialogAction:  'Approved' | 'Rejected' = 'Approved';
  dialogRemarks  = '';

  constructor(private svc: LeaveService, private snack: MatSnackBar) {}

  ngOnInit() { this.load(); this.loadCounts(); }

  load() {
    this.loading = true;
    this.svc.getAll(this.filterStatus || undefined, this.page, this.pageSize).subscribe({
      next: r => { this.leaves = r.data; this.total = r.total; },
      error: e => {
        console.error('Leave load error:', e);
        this.snack.open('Failed to load leave requests: ' + (e.error?.message || e.status), '×', { duration: 4000 });
        this.loading = false;
      },
      complete: () => this.loading = false
    });
  }

  loadCounts() {
    this.svc.getAll(undefined, 1, 1000).subscribe({
      next: r => {
        this.counts.total    = r.total;
        this.counts.pending  = r.data.filter(l => l.status === 'Pending').length;
        this.counts.approved = r.data.filter(l => l.status === 'Approved').length;
        this.counts.rejected = r.data.filter(l => l.status === 'Rejected').length;
      },
      error: e => console.error('Count load error:', e)
    });
  }

  setFilter(s: string) { this.filterStatus = s; this.page = 1; this.load(); }
  onPage(e: PageEvent)  { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.load(); }

  openDialog(leave: LeaveRequest, action: 'Approved' | 'Rejected') {
    this.dialogLeave   = leave;
    this.dialogAction  = action;
    this.dialogRemarks = '';
  }
  closeDialog() { this.dialogLeave = null; }

  submitDecision() {
    if (!this.dialogLeave) return;
    this.deciding = true;
    this.svc.approve(this.dialogLeave.leaveId, this.dialogAction, this.dialogRemarks).subscribe({
      next: () => {
        this.snack.open(
          `Leave ${this.dialogAction.toLowerCase()} successfully`,
          '×', { duration: 3000 }
        );
        this.closeDialog();
        this.load();
        this.loadCounts();
      },
      error: e => {
        this.snack.open(e.error?.message ?? 'Action failed', '×', { duration: 3000 });
        this.deciding = false;
      },
      complete: () => this.deciding = false
    });
  }

  statusBg(s: string) { return s==='Approved'?'#e8f5e9':s==='Rejected'?'#ffebee':'#fff8e1'; }
  statusFg(s: string) { return s==='Approved'?'#2e7d32':s==='Rejected'?'#c62828':'#f57f17'; }
}