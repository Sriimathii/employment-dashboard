export interface Attendance {
  attendanceId: number; employeeId: number; employeeName: string;
  employeeCode: string; attendanceDate: string;
  checkInTime?: string; checkOutTime?: string;
  status: string; workingHours?: number;
}