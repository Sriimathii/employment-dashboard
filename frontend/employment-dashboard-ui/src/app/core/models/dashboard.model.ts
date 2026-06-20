export interface AdminDashboard {
  totalEmployees: number; activeEmployees: number;
  inactiveEmployees: number; totalDepartments: number;
  pendingLeaves: number; totalLeaves: number;
  attendancePercentage: number;
  employeesByDept: { department: string; count: number }[];
  monthlyAttendance: { month: string; present: number; absent: number; late: number }[];
  leavesByType: { leaveType: string; count: number }[];
}
 
export interface Department { departmentId: number; departmentName: string; }
 