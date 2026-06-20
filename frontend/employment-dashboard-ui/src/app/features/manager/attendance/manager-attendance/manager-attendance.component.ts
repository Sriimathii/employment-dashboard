import { Component } from '@angular/core';
import { AttendanceRosterComponent } from '../../../../shared/components/attendance-roster/attendance-roster.component';

@Component({
  selector: 'app-manager-attendance',
  standalone: true,
  imports: [AttendanceRosterComponent],
  template: `<app-attendance-roster [isAdmin]="false"></app-attendance-roster>`
})
export class ManagerAttendanceComponent {}