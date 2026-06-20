namespace EmploymentDashboard.API.Models;

public class LeaveRequest
{
    public int      LeaveId    { get; set; }
    public int      EmployeeId { get; set; }
    public Employee Employee   { get; set; } = null!;
    public string   LeaveType  { get; set; } = string.Empty;
    public DateOnly StartDate  { get; set; }
    public DateOnly EndDate    { get; set; }
    public string?  Reason     { get; set; }
    // FEATURE 4: Status includes Cancelled
    public string   Status     { get; set; } = "Pending";
    public int?     ApprovedBy { get; set; }
    public User?    Approver   { get; set; }
    public string?  Remarks    { get; set; }
    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
}
