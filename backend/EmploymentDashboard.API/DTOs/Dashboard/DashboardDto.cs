namespace EmploymentDashboard.API.DTOs.Dashboard;
 
public class AdminDashboardDto
{
    public int TotalEmployees { get; set; }
    public int ActiveEmployees { get; set; }
    public int InactiveEmployees { get; set; }
    public int TotalDepartments { get; set; }
    public int PendingLeaves { get; set; }
    public int TotalLeaves { get; set; }
    public double AttendancePercentage { get; set; }
    public IEnumerable<DeptEmployeeCountDto> EmployeesByDept { get; set; } = [];
    public IEnumerable<MonthlyAttendanceDto> MonthlyAttendance { get; set; } = [];
    public IEnumerable<LeaveTypeCountDto> LeavesByType { get; set; } = [];
}
 
public record DeptEmployeeCountDto(string Department, int Count);
public record MonthlyAttendanceDto(string Month, int Present, int Absent, int Late);
public record LeaveTypeCountDto(string LeaveType, int Count);