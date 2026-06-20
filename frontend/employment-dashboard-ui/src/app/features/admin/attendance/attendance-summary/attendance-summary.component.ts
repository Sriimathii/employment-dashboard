import { Component } from '@angular/core';
import { AttendanceRosterComponent } from '../../../../shared/components/attendance-roster/attendance-roster.component';

@Component({
  selector: 'app-admin-attendance-summary',
  standalone: true,
  imports: [AttendanceRosterComponent],
  template: `<app-attendance-roster [isAdmin]="true" [defaultTab]="1"></app-attendance-roster>`
})
export class AdminAttendanceSummaryComponent {}