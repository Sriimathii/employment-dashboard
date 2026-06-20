namespace EmploymentDashboard.API.Models;

public class AuditLog
{
    public int      LogId      { get; set; }
    public string   Action     { get; set; } = string.Empty;
    public int?     UserId     { get; set; }
    public User?    User       { get; set; }
    public string?  EntityType { get; set; }
    public int?     EntityId   { get; set; }
    public string?  OldValues  { get; set; }
    public string?  NewValues  { get; set; }
    public string?  IpAddress  { get; set; }
    public DateTime ActionDate { get; set; } = DateTime.UtcNow;
}