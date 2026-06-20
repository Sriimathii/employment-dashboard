namespace EmploymentDashboard.API.DTOs.Leave;

public class LeaveRequestDto
{
    public int      LeaveId        { get; set; }
    public int      EmployeeId     { get; set; }
    public string   EmployeeName   { get; set; } = string.Empty;
    public string   DepartmentName { get; set; } = string.Empty;
    public string   LeaveType      { get; set; } = string.Empty;
    public DateOnly StartDate      { get; set; }
    public DateOnly EndDate        { get; set; }
    public int      TotalDays      => (EndDate.DayNumber - StartDate.DayNumber) + 1;
    public string?  Reason         { get; set; }
    public string   Status         { get; set; } = "Pending";
    public string?  ApprovedByName { get; set; }
    public string?  Remarks        { get; set; }
    public DateTime CreatedAt      { get; set; }
}

public class CreateLeaveDto
{
    public string   LeaveType  { get; set; } = string.Empty;
    public DateOnly StartDate  { get; set; }
    public DateOnly EndDate    { get; set; }
    public string?  Reason     { get; set; }
}

public class ApproveLeaveDto
{
    public string  Status  { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

public class LeaveBalanceDto
{
    public int MonthlyLimit     { get; set; } = 3;
    public int UsedThisMonth    { get; set; }
    public int RemainingBalance { get; set; }
    public int Year             { get; set; }
    public int Month            { get; set; }
}