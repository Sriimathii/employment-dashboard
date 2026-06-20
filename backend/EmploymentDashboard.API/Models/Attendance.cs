namespace EmploymentDashboard.API.Models;

public class Attendance
{
    public int       AttendanceId         { get; set; }
    public int       EmployeeId           { get; set; }
    public Employee  Employee             { get; set; } = null!;
    public DateOnly  AttendanceDate       { get; set; }
    public TimeOnly? CheckInTime          { get; set; }
    public TimeOnly? CheckOutTime         { get; set; }
    // Status: Present | Late | On Leave | Absent
    public string    Status               { get; set; } = "Present";

    // Geo-fencing — check-in coordinates + which location was matched
    public double?   CheckInLatitude      { get; set; }
    public double?   CheckInLongitude     { get; set; }
    public string?   CheckInLocationName  { get; set; }  // e.g. "Main Office", "Branch Office"

    // Check-out coordinates (stored for audit, not validated)
    public double?   CheckOutLatitude     { get; set; }
    public double?   CheckOutLongitude    { get; set; }
}