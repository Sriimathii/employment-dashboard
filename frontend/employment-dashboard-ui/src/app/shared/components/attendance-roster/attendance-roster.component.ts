import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { AttendanceService, RosterResponse, RosterEmployee, Holiday } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';

const CODE_META: Record<string, { label: string; bg: string; color: string; darkBg: string; darkColor: string; desc: string }> = {
  P:  { label:'P',  bg:'#dcfce7', color:'#15803d', darkBg:'#14532d', darkColor:'#86efac', desc:'Present'        },
  L:  { label:'L',  bg:'#ffedd5', color:'#c2410c', darkBg:'#7c2d12', darkColor:'#fed7aa', desc:'Late'           },
  OD: { label:'OD', bg:'#cffafe', color:'#0e7490', darkBg:'#164e63', darkColor:'#67e8f9', desc:'On Duty'        },
  HD: { label:'HD', bg:'#f3e8ff', color:'#7c3aed', darkBg:'#4c1d95', darkColor:'#c4b5fd', desc:'Half Day'       },
  OT: { label:'OT', bg:'#fce7f3', color:'#be185d', darkBg:'#831843', darkColor:'#f9a8d4', desc:'Overtime'       },
  A:  { label:'A',  bg:'#fee2e2', color:'#dc2626', darkBg:'#7f1d1d', darkColor:'#fca5a5', desc:'Absent'         },
  CL: { label:'CL', bg:'#fef9c3', color:'#ca8a04', darkBg:'#713f12', darkColor:'#fde047', desc:'Casual Leave'   },
  ML: { label:'ML', bg:'#fce7f3', color:'#be185d', darkBg:'#831843', darkColor:'#f9a8d4', desc:'Maternity Leave' },
  PL: { label:'PL', bg:'#dcfce7', color:'#15803d', darkBg:'#14532d', darkColor:'#86efac', desc:'Paternity Leave' },
  UL: { label:'UL', bg:'#fee2e2', color:'#dc2626', darkBg:'#7f1d1d', darkColor:'#fca5a5', desc:'Unpaid Leave'   },
  AL: { label:'AL', bg:'#dbeafe', color:'#1d4ed8', darkBg:'#1e3a8a', darkColor:'#93c5fd', desc:'Annual Leave'   },
  SL: { label:'SL', bg:'#ecfccb', color:'#4d7c0f', darkBg:'#365314', darkColor:'#bef264', desc:'Sick Leave'     },
  OL: { label:'OL', bg:'#f1f5f9', color:'#475569', darkBg:'#1e293b', darkColor:'#94a3b8', desc:'Other Leave'    },
  WO: { label:'WO', bg:'#e2e8f0', color:'#64748b', darkBg:'#0f172a', darkColor:'#94a3b8', desc:'Weekly Off'     },
  H:  { label:'H',  bg:'#e0e7ff', color:'#4338ca', darkBg:'#1e1b4b', darkColor:'#a5b4fc', desc:'Holiday'       },
  '': { label:'—',  bg:'transparent', color:'#cbd5e1', darkBg:'transparent', darkColor:'#334155', desc:'No Record' },
};

@Component({
  selector: 'app-attendance-roster',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule,
    MatProgressBarModule, MatSnackBarModule, MatTooltipModule, MatDialogModule
  ],
  template: `
<div class="roster-wrap">

  <!-- ── Page Header ─────────────────────────────────────── -->
  <div class="page-header">
    <div class="header-left">
      <h1 class="page-title">
        <span class="title-icon">📋</span>
        Attendance
      </h1>
      <p class="page-sub" *ngIf="roster() as r">
        {{ r.monthName }} &mdash; <strong>{{ r.employees.length }}</strong> employee(s)
      </p>
    </div>
    <div class="header-actions">
      <button class="btn-glass" (click)="exportCSV()" *ngIf="activeTab === 0">
        <mat-icon>download</mat-icon>
        <span>Export CSV</span>
      </button>
      <button class="btn-primary" (click)="showHolidays = !showHolidays" *ngIf="isAdmin">
        <mat-icon>calendar_month</mat-icon>
        <span>Manage Holidays</span>
      </button>
    </div>
  </div>

  <!-- ── Holiday Manager ─────────────────────────────────── -->
  <div class="glass-card holiday-panel" *ngIf="showHolidays && isAdmin">
    <div class="panel-header">
      <mat-icon>event</mat-icon>
      <h3>Holiday Calendar — {{ selectedYear }}</h3>
      <button class="btn-close" (click)="showHolidays = false"><mat-icon>close</mat-icon></button>
    </div>
    <div class="holiday-add-row">
      <mat-form-field appearance="outline" class="hf-name">
        <mat-label>Holiday Name</mat-label>
        <input matInput [(ngModel)]="newHolidayName" placeholder="e.g. Republic Day">
        <mat-icon matPrefix>celebration</mat-icon>
      </mat-form-field>
      <mat-form-field appearance="outline" class="hf-date">
        <mat-label>Date</mat-label>
        <input matInput type="date" [(ngModel)]="newHolidayDate">
        <mat-icon matPrefix>calendar_today</mat-icon>
      </mat-form-field>
      <mat-form-field appearance="outline" class="hf-type">
        <mat-label>Type</mat-label>
        <mat-select [(ngModel)]="newHolidayType">
          <mat-option value="National">🇮🇳 National</mat-option>
          <mat-option value="Government">🏛️ Government</mat-option>
          <mat-option value="Company">🏢 Company</mat-option>
        </mat-select>
      </mat-form-field>
      <button class="btn-primary" (click)="addHoliday()" [disabled]="addingHoliday">
        <mat-icon>add</mat-icon> Add Holiday
      </button>
    </div>
    <div class="holiday-list">
      <div class="holiday-item" *ngFor="let h of holidays()">
        <div class="h-badge" [class.nat]="h.holidayType==='National'"
             [class.gov]="h.holidayType==='Government'" [class.co]="h.holidayType==='Company'">
          <mat-icon>event</mat-icon>
        </div>
        <div class="h-info">
          <span class="h-name">{{ h.name }}</span>
          <span class="h-date">{{ h.holidayDate | date:'EEE, d MMM yyyy' }}</span>
        </div>
        <span class="h-type-chip" [class.nat]="h.holidayType==='National'"
              [class.gov]="h.holidayType==='Government'" [class.co]="h.holidayType==='Company'">
          {{ h.holidayType }}
        </span>
        <button class="btn-icon-danger" (click)="deleteHoliday(h)">
          <mat-icon>delete_outline</mat-icon>
        </button>
      </div>
      <div class="empty-note" *ngIf="holidays().length === 0">
        <mat-icon>event_busy</mat-icon>
        <p>No holidays configured for {{ selectedYear }}</p>
      </div>
    </div>
  </div>

  <!-- ── Filter Bar ──────────────────────────────────────── -->
  <div class="filter-glass">
    <mat-form-field appearance="outline" class="f-year">
      <mat-label>Year</mat-label>
      <mat-select [(ngModel)]="selectedYear" (ngModelChange)="onFilterChange()">
        <mat-option *ngFor="let y of years" [value]="y">{{ y }}</mat-option>
      </mat-select>
    </mat-form-field>
    <mat-form-field appearance="outline" class="f-month">
      <mat-label>Month</mat-label>
      <mat-select [(ngModel)]="selectedMonth" (ngModelChange)="onFilterChange()">
        <mat-option *ngFor="let m of months; let i = index" [value]="i+1">{{ m }}</mat-option>
      </mat-select>
    </mat-form-field>
    <mat-form-field appearance="outline" class="f-dept" *ngIf="isAdmin">
      <mat-label>Department</mat-label>
      <mat-select [(ngModel)]="selectedDept" (ngModelChange)="onFilterChange()">
        <mat-option [value]="0">All Departments</mat-option>
        <mat-option *ngFor="let d of departments" [value]="d.id">{{ d.name }}</mat-option>
      </mat-select>
    </mat-form-field>
    <mat-form-field appearance="outline" class="f-search">
      <mat-label>Search Employee</mat-label>
      <input matInput [(ngModel)]="searchQuery" (input)="onSearch()" placeholder="Name or code">
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>
  </div>

  <!-- ── Loading Bar ─────────────────────────────────────── -->
  <div class="loading-bar" *ngIf="loading()">
    <div class="loading-fill"></div>
  </div>

  <!-- ── Tabs ───────────────────────────────────────────── -->
  <div class="tab-header">
    <button class="tab-btn" [class.active]="activeTab===0" (click)="activeTab=0">
      <mat-icon>calendar_view_month</mat-icon>
      <span>Monthly Roster</span>
    </button>
    <button class="tab-btn" [class.active]="activeTab===1" (click)="activeTab=1">
      <mat-icon>bar_chart</mat-icon>
      <span>Attendance Summary</span>
    </button>
  </div>

  <!-- ══ TAB 1: Monthly Roster ════════════════════════════ -->
  <div class="tab-content" *ngIf="activeTab===0">

    <!-- Legend -->
    <div class="legend-wrap">
      <div class="legend-item" *ngFor="let k of legendKeys">
        <span class="code-pill" [class]="'code-'+k.toLowerCase().replace(' ','-')">{{ k || '—' }}</span>
        <span class="legend-label">{{ meta(k).desc }}</span>
      </div>
    </div>

    <!-- Roster Table -->
    <div class="table-outer" *ngIf="roster() && !loading()">
      <div class="table-scroll">
        <table class="roster-table" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <th class="th-fixed th-no">#</th>
              <th class="th-fixed th-emp">Employee</th>
              <th class="th-fixed th-dept">Department</th>
              <th class="th-fixed th-desg">Designation</th>
              <th *ngFor="let dh of roster()?.dayHeaders"
                  class="th-day"
                  [class.th-sunday]="dh.isSunday"
                  [class.th-holiday]="dh.isHoliday"
                  [matTooltip]="dh.dayName + (dh.isSunday?' — Weekly Off':'') + (dh.isHoliday?' — Holiday':'')">
                <div class="dh-num">{{ dh.day }}</div>
                <div class="dh-name">{{ dh.dayName.slice(0,3) }}</div>
              </th>
              <th class="th-sum">Work<br>Days</th>
              <th class="th-sum th-present">P</th>
              <th class="th-sum th-absent">A</th>
              <th class="th-sum th-late">L</th>
              <th class="th-sum">Hrs</th>
              <th class="th-sum th-att">Att%</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let emp of filteredEmps(); let i = index" class="data-row">
              <td class="td-fixed td-no">{{ i + 1 }}</td>
              <td class="td-fixed td-emp">
                <div class="emp-cell">
                  <div class="emp-avatar" [style.background]="avatarColor(emp.employeeName)">
                    {{ initials(emp.employeeName) }}
                  </div>
                  <div class="emp-text">
                    <div class="emp-name">{{ emp.employeeName }}</div>
                    <div class="emp-code">{{ emp.employeeCode }}</div>
                  </div>
                </div>
              </td>
              <td class="td-fixed td-dept">{{ emp.departmentName }}</td>
              <td class="td-fixed td-desg">{{ emp.designation }}</td>
              <td *ngFor="let dh of roster()?.dayHeaders"
                  class="td-day"
                  [class.td-sunday]="dh.isSunday"
                  [class.td-holiday]="dh.isHoliday">
                <span class="code-pill" [class]="'code-'+(emp.days[dh.day]||'').toLowerCase()"
                      [matTooltip]="meta(emp.days[dh.day] || '').desc">
                  {{ emp.days[dh.day] || '—' }}
                </span>
              </td>
              <td class="td-sum">{{ emp.summary.workingDays }}</td>
              <td class="td-sum td-present">{{ emp.summary.present }}</td>
              <td class="td-sum td-absent">{{ emp.summary.absent }}</td>
              <td class="td-sum td-late">{{ emp.summary.late }}</td>
              <td class="td-sum">{{ emp.summary.totalWorkingHours }}h</td>
              <td class="td-sum">
                <span class="pct-badge"
                      [class.pct-good]="emp.summary.attendancePercentage >= 75"
                      [class.pct-warn]="emp.summary.attendancePercentage >= 50 && emp.summary.attendancePercentage < 75"
                      [class.pct-bad]="emp.summary.attendancePercentage < 50">
                  {{ emp.summary.attendancePercentage }}%
                </span>
              </td>
            </tr>
            <tr *ngIf="filteredEmps().length === 0">
              <td [colSpan]="4 + (roster()?.daysInMonth || 0) + 6" class="td-empty">
                <mat-icon>search_off</mat-icon>
                <p>No employees found</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="empty-state" *ngIf="!loading() && !roster()">
      <div class="empty-icon">📅</div>
      <p>Select a month to view the attendance roster</p>
    </div>
  </div>

  <!-- ══ TAB 2: Attendance Summary ════════════════════════ -->
  <div class="tab-content" *ngIf="activeTab===1">
    <div class="table-outer" *ngIf="roster() && !loading()">
      <div class="table-scroll">
        <table class="summary-table" cellspacing="0" cellpadding="0">
          <thead>
            <tr>
              <th class="th-fixed th-no">#</th>
              <th class="th-fixed th-emp">Employee</th>
              <th class="th-fixed th-dept">Department</th>
              <th class="th-fixed th-desg">Role</th>
              <th class="th-sum th-present" matTooltip="Present">P</th>
              <th class="th-sum th-absent"  matTooltip="Absent">A</th>
              <th class="th-sum th-late"    matTooltip="Late">L</th>
              <th class="th-sum th-od"      matTooltip="On Duty">OD</th>
              <th class="th-sum th-hd"      matTooltip="Half Day">HD</th>
              <th class="th-sum th-ot"      matTooltip="Overtime">OT</th>
              <th class="th-sum th-cl"      matTooltip="Casual Leave">CL</th>
              <th class="th-sum th-ml"      matTooltip="Maternity Leave">ML</th>
              <th class="th-sum th-pl"      matTooltip="Paternity Leave">PL</th>
              <th class="th-sum th-ul"      matTooltip="Unpaid Leave">UL</th>
              <th class="th-sum th-ol"      matTooltip="Other Leave">OL</th>
              <th class="th-sum th-wo"      matTooltip="Weekly Off">WO</th>
              <th class="th-sum th-h"       matTooltip="Holiday">H</th>
              <th class="th-sum"            matTooltip="Work Days">Days</th>
              <th class="th-sum"            matTooltip="Working Hours">Hrs</th>
              <th class="th-sum th-att"     matTooltip="Attendance %">Att%</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let emp of filteredEmps(); let i = index" class="data-row">
              <td class="td-fixed td-no">{{ i + 1 }}</td>
              <td class="td-fixed td-emp">
                <div class="emp-cell">
                  <div class="emp-avatar" [style.background]="avatarColor(emp.employeeName)">
                    {{ initials(emp.employeeName) }}
                  </div>
                  <div class="emp-text">
                    <div class="emp-name">{{ emp.employeeName }}</div>
                    <div class="emp-code">{{ emp.employeeCode }}</div>
                  </div>
                </div>
              </td>
              <td class="td-fixed td-dept">{{ emp.departmentName }}</td>
              <td class="td-fixed td-desg">{{ emp.designation }}</td>
              <td class="td-num td-present">{{ emp.summary.present }}</td>
              <td class="td-num td-absent">{{ emp.summary.absent }}</td>
              <td class="td-num td-late">{{ emp.summary.late }}</td>
              <td class="td-num td-od">{{ emp.summary.od }}</td>
              <td class="td-num td-hd">{{ emp.summary.hd }}</td>
              <td class="td-num td-ot">{{ emp.summary.ot }}</td>
              <td class="td-num td-cl">{{ emp.summary.cl }}</td>
              <td class="td-num td-ml">{{ emp.summary.ml }}</td>
              <td class="td-num td-pl">{{ emp.summary.pl }}</td>
              <td class="td-num td-ul">{{ emp.summary.ul }}</td>
              <td class="td-num td-ol">{{ emp.summary.ol }}</td>
              <td class="td-num td-wo">{{ emp.summary.wo }}</td>
              <td class="td-num td-h">{{ emp.summary.holiday }}</td>
              <td class="td-num">{{ emp.summary.workingDays }}</td>
              <td class="td-num">{{ emp.summary.totalWorkingHours }}h</td>
              <td class="td-num">
                <span class="pct-badge"
                      [class.pct-good]="emp.summary.attendancePercentage >= 75"
                      [class.pct-warn]="emp.summary.attendancePercentage >= 50 && emp.summary.attendancePercentage < 75"
                      [class.pct-bad]="emp.summary.attendancePercentage < 50">
                  {{ emp.summary.attendancePercentage }}%
                </span>
              </td>
            </tr>
            <tr *ngIf="filteredEmps().length === 0">
              <td colspan="20" class="td-empty">
                <mat-icon>search_off</mat-icon>
                <p>No employees found</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="empty-state" *ngIf="!loading() && !roster()">
      <div class="empty-icon">📊</div>
      <p>Select a month to view the attendance summary</p>
    </div>
  </div>

</div>`,
  styleUrls: ['./attendance-roster.component.scss']
})
export class AttendanceRosterComponent implements OnInit {
  @Input() isAdmin   = false;
  @Input() defaultTab = 0;

  roster    = signal<RosterResponse | null>(null);
  holidays  = signal<Holiday[]>([]);
  loading   = signal(false);
  activeTab = 0;

  today         = new Date();
  selectedYear  = this.today.getFullYear();
  selectedMonth = this.today.getMonth() + 1;
  selectedDept  = 0;
  searchQuery   = '';
  showHolidays  = false;

  newHolidayName = '';
  newHolidayDate = '';
  newHolidayType = 'National';
  addingHoliday  = false;

  years  = [this.today.getFullYear() - 1, this.today.getFullYear(), this.today.getFullYear() + 1];
  months = ['January','February','March','April','May','June',
            'July','August','September','October','November','December'];

  departments: { id: number; name: string }[] = [];
  legendKeys = ['P','L','OD','HD','OT','A','CL','ML','PL','UL','OL','WO','H'];
  filteredEmps = signal<RosterEmployee[]>([]);

  private readonly AVATAR_COLORS = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#0ea5e9,#06b6d4)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#ef4444,#dc2626)',
    'linear-gradient(135deg,#ec4899,#db2777)',
    'linear-gradient(135deg,#14b8a6,#0d9488)',
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  ];

  constructor(
    private attSvc: AttendanceService,
    private auth:   AuthService,
    private snack:  MatSnackBar
  ) {}

  ngOnInit(): void {
    this.activeTab = this.defaultTab;
    this.isAdmin = this.auth.getRole() === 'Admin';
    this.load();
    if (this.isAdmin) { this.loadHolidays(); this.loadDepartments(); }
  }

  onFilterChange(): void { this.load(); if (this.isAdmin) this.loadHolidays(); }

  onSearch(): void {
    const r = this.roster();
    if (!r) return;
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredEmps.set(q
      ? r.employees.filter(e =>
          e.employeeName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q))
      : r.employees);
  }

  load(): void {
    this.loading.set(true);
    this.attSvc.getRoster(this.selectedYear, this.selectedMonth,
                          this.selectedDept || undefined, this.searchQuery)
      .subscribe({
        next: r => { this.roster.set(r); this.filteredEmps.set(r.employees); },
        error:    () => this.loading.set(false),
        complete: () => this.loading.set(false)
      });
  }

  loadHolidays(): void {
    this.attSvc.getHolidays(this.selectedYear).subscribe({ next: h => this.holidays.set(h) });
  }

  loadDepartments(): void {
    if (!this.isAdmin) return;
    this.attSvc.getDepartments().subscribe({
      next: d => this.departments = d.map(x => ({ id: x.departmentId, name: x.departmentName }))
    });
  }

  addHoliday(): void {
    if (!this.newHolidayName || !this.newHolidayDate) {
      this.snack.open('Please enter holiday name and date.', '×', { duration: 3000 }); return;
    }
    this.addingHoliday = true;
    this.attSvc.addHoliday({
      name: this.newHolidayName, holidayDate: this.newHolidayDate, holidayType: this.newHolidayType
    }).subscribe({
      next: () => {
        this.snack.open('Holiday added successfully!', '×', { duration: 3000 });
        this.newHolidayName = ''; this.newHolidayDate = '';
        this.loadHolidays(); this.load();
      },
      error: e => this.snack.open(e.error?.message ?? 'Failed.', '×', { duration: 4000 }),
      complete: () => this.addingHoliday = false
    });
  }

  deleteHoliday(h: Holiday): void {
    if (!confirm(`Remove "${h.name}" from holidays?`)) return;
    this.attSvc.deleteHoliday(h.holidayId).subscribe({
      next: () => { this.loadHolidays(); this.load(); },
      error: () => this.snack.open('Delete failed.', '×', { duration: 3000 })
    });
  }

  exportCSV(): void {
    const r = this.roster(); if (!r) return;
    const emps = this.filteredEmps();
    const headers = ['#','Employee','Code','Department','Designation',
      ...r.dayHeaders.map(d => `${d.day}(${d.dayName})`),
      'WorkDays','Present','Absent','Late','OD','HD','OT','CL','ML','PL','UL','OL','WO','H','Hrs','Att%'];
    const rows = emps.map((emp, i) => [
      i+1, emp.employeeName, emp.employeeCode, emp.departmentName, emp.designation,
      ...r.dayHeaders.map(d => emp.days[d.day] || ''),
      emp.summary.workingDays, emp.summary.present, emp.summary.absent,
      emp.summary.late, emp.summary.od, emp.summary.hd, emp.summary.ot,
      emp.summary.cl, emp.summary.ml, emp.summary.pl, emp.summary.ul,
      emp.summary.ol, emp.summary.wo, emp.summary.holiday,
      emp.summary.totalWorkingHours, emp.summary.attendancePercentage + '%'
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Attendance_${r.monthName.replace(' ', '_')}.csv`; a.click();
  }

  meta(code: string) { return CODE_META[code] ?? CODE_META['']; }
  initials(name: string): string { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
  avatarColor(name: string): string {
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return this.AVATAR_COLORS[Math.abs(h) % this.AVATAR_COLORS.length];
  }
}