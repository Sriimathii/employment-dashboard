export interface LeaveRequest {
  leaveId: number; employeeId: number; employeeName: string;
  departmentName: string; leaveType: string;
  startDate: string; endDate: string; totalDays: number;
  reason?: string; status: string;
  approvedByName?: string; remarks?: string; createdAt: string;
}
 
export interface CreateLeaveDto {
  leaveType: string; startDate: string; endDate: string; reason?: string;
}