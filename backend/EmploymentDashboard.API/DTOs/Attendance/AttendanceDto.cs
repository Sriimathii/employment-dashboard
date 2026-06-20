namespace EmploymentDashboard.API.DTOs.Attendance;

public class AttendanceDto
{
    public int     AttendanceId   { get; set; }
    public int     EmployeeId     { get; set; }
    public string  EmployeeName   { get; set; } = string.Empty;
    public string  EmployeeCode   { get; set; } = string.Empty;
    public string  AttendanceDate { get; set; } = string.Empty;  // "yyyy-MM-dd"
    public string? CheckInTime    { get; set; }   // "HH:mm"
    public string? CheckOutTime   { get; set; }   // "HH:mm"
    public string  Status         { get; set; } = string.Empty;
    public double? WorkingHours   { get; set; }
}

public class MarkAttendanceDto
{
    public int    EmployeeId     { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public string?  CheckInTime  { get; set; }
    public string?  CheckOutTime { get; set; }
    public string   Status       { get; set; } = "Present";
}