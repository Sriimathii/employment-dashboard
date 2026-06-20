import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AttendanceService, Attendance } from '../../../../core/services/attendance.service';

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatTableModule,
    MatIconModule, MatPaginatorModule, MatProgressBarModule
  ],
  template: `
<div class="page-container">
  <div class="page-header">
    <div>
      <h1>My Attendance History</h1>
      <p>{{ total() }} total records</p>
    </div>
  </div>

  <!-- Summary Row -->
  <div class="stat-grid" style="margin-bottom:1.5rem">
    <div class="stat-card">
      <div class="stat-icon" style="background:#2e7d32"><mat-icon>check_circle</mat-icon></div>
      <div class="stat-info"><span class="stat-value">{{ presentCount() }}</span><span class="stat-label">Present</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#e65100"><mat-icon>watch_later</mat-icon></div>
      <div class="stat-info"><span class="stat-value">{{ lateCount() }}</span><span class="stat-label">Late</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#c62828"><mat-icon>cancel</mat-icon></div>
      <div class="stat-info"><span class="stat-value">{{ absentCount() }}</span><span class="stat-label">Absent</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#1a237e"><mat-icon>timer</mat-icon></div>
      <div class="stat-info"><span class="stat-value">{{ avgHours() }}h</span><span class="stat-label">Avg Hours</span></div>
    </div>
  </div>

  <mat-progress-bar mode="indeterminate" *ngIf="loading()"></mat-progress-bar>

  <mat-card class="table-card">
    <table mat-table [dataSource]="records()">

      <ng-container matColumnDef="date">
        <th mat-header-cell *matHeaderCellDef>Date</th>
        <td mat-cell *matCellDef="let r">
          <strong>{{ r.attendanceDate | date:'mediumDate' }}</strong>
          <span style="display:block;font-size:.75rem;color:#888">{{ r.attendanceDate | date:'EEEE' }}</span>
        </td>
      </ng-container>

      <ng-container matColumnDef="checkIn">
        <th mat-header-cell *matHeaderCellDef>Check In</th>
        <td mat-cell *matCellDef="let r">{{ r.checkInTime ?? '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="checkOut">
        <th mat-header-cell *matHeaderCellDef>Check Out</th>
        <td mat-cell *matCellDef="let r">{{ r.checkOutTime ?? '—' }}</td>
      </ng-container>

      <ng-container matColumnDef="hours">
        <th mat-header-cell *matHeaderCellDef>Working Hours</th>
        <td mat-cell *matCellDef="let r">
          {{ r.workingHours != null ? (r.workingHours | number:'1.1-1') + ' hrs' : '—' }}
        </td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let r">
          <span [style.background]="sbg(r.status)" [style.color]="sfg(r.status)"
                style="padding:3px 10px;border-radius:12px;font-size:.8rem;font-weight:600;white-space:nowrap">
            {{ r.status }}
          </span>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;" class="mat-mdc-row"></tr>
      <tr class="mat-row" *matNoDataRow>
        <td colspan="5" style="text-align:center;padding:3rem;color:#bbb">
          <mat-icon style="font-size:48px;width:48px;height:48px;display:block;margin:0 auto .5rem">fingerprint</mat-icon>
          No attendance records yet. Use Check In on your dashboard.
        </td>
      </tr>
    </table>

    <mat-paginator
      [length]="total()"
      [pageSize]="pageSize"
      [pageSizeOptions]="[15,30,60]"
      (page)="onPage($event)"
      showFirstLastButtons>
    </mat-paginator>
  </mat-card>
</div>`,
  styles: [`
    .page-container { padding:1.5rem; }
    .page-header h1 { font-size:1.75rem; font-weight:700; color:#1a237e; margin:0; }
    .page-header p  { color:#888; margin:.25rem 0 1.25rem; font-size:.875rem; }
    :host-context([data-theme='dark']) .page-header h1 { color:#82b1ff; }
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:1rem; }
    .stat-card { background:white; border-radius:12px; padding:1rem; display:flex; align-items:center; gap:.9rem; box-shadow:0 2px 8px rgba(0,0,0,.06); }
    :host-context([data-theme='dark']) .stat-card { background:#1a1a2e; }
    .stat-icon { width:46px; height:46px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .stat-icon mat-icon { color:white; }
    .stat-value { display:block; font-size:1.6rem; font-weight:700; }
    .stat-label { display:block; font-size:.7rem; color:#888; text-transform:uppercase; letter-spacing:.4px; }
    .table-card { border-radius:12px!important; overflow:hidden; }
    .mat-mdc-row:hover { background:rgba(26,35,126,.04)!important; }
  `]
})
export class MyAttendanceComponent implements OnInit {
  records      = signal<Attendance[]>([]);
  total        = signal(0);
  loading      = signal(false);
  presentCount = signal(0);
  lateCount    = signal(0);
  absentCount  = signal(0);
  avgHours     = signal(0);
  page = 1; pageSize = 15;
  cols = ['date','checkIn','checkOut','hours','status'];

  constructor(private svc: AttendanceService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    // getMy() uses the JWT token — backend filters by the logged-in employee automatically
    this.svc.getMy(this.page, this.pageSize).subscribe({
      next: r => {
        this.records.set(r.data);
        this.total.set(r.total);
        this.presentCount.set(r.data.filter(a => a.status === 'Present').length);
        this.lateCount.set(r.data.filter(a => a.status === 'Late').length);
        this.absentCount.set(r.data.filter(a => a.status === 'Absent').length);
        const hrs = r.data.filter(a => a.workingHours != null).map(a => a.workingHours!);
        this.avgHours.set(hrs.length ? +( hrs.reduce((a,b) => a+b, 0) / hrs.length ).toFixed(1) : 0);
      },
      complete: () => this.loading.set(false)
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.pageSize = e.pageSize; this.load(); }

  sbg(s: string) {
    const m: any = { Present:'#e8f5e9', Late:'#fff3e0', Absent:'#ffebee', 'Half Day':'#f3e5f5', 'On Leave':'#e3f2fd' };
    return m[s] ?? '#f5f5f5';
  }
  sfg(s: string) {
    const m: any = { Present:'#2e7d32', Late:'#e65100', Absent:'#c62828', 'Half Day':'#6a1b9a', 'On Leave':'#1565c0' };
    return m[s] ?? '#333';
  }
}