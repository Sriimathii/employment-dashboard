import { Component } from '@angular/core';
import { AttendanceRosterComponent } from '../../../../shared/components/attendance-roster/attendance-roster.component';

@Component({
  selector: 'app-admin-attendance',
  standalone: true,
  imports: [AttendanceRosterComponent],
  template: `<app-attendance-roster [isAdmin]="true"></app-attendance-roster>`
})
export class AdminAttendanceComponent {}