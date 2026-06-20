namespace EmploymentDashboard.API.Models;

public class Employee
{
    public int       EmployeeId   { get; set; }
    public string    EmployeeCode { get; set; } = string.Empty;
    public string    FullName     { get; set; } = string.Empty;
    public string?   PhoneNumber  { get; set; }
    public string    Email        { get; set; } = string.Empty;
    public decimal?  Salary       { get; set; }
    public int?      DepartmentId { get; set; }
    public Department? Department { get; set; }
    public int?      RoleId       { get; set; }
    public Role?     Role         { get; set; }
    public string    Status       { get; set; } = "Active";
    public DateOnly  JoiningDate  { get; set; }
    public string?   ProfileImage { get; set; }
    public string?   Address      { get; set; }

    // Soft delete
    public bool      IsDeleted    { get; set; } = false;
    public DateTime? DeletedAt    { get; set; }

    // Inactive mode — read-only login
    public bool      IsInactive   { get; set; } = false;

    // FEATURE 1: Monthly leave balance (3 per month default)
    public int       MonthlyLeaveBalance { get; set; } = 3;

    public ICollection<Attendance>   Attendances   { get; set; } = [];
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = [];
}