namespace EmploymentDashboard.API.Models;

public class Holiday
{
    public int     HolidayId   { get; set; }
    public DateOnly HolidayDate { get; set; }
    public string  Name        { get; set; } = string.Empty;
    // Type: National | Government | Company
    public string  HolidayType { get; set; } = "National";
    public int     Year        { get; set; }
}