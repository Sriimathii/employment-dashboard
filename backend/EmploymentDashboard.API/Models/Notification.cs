namespace EmploymentDashboard.API.Models;

public class Notification
{
    public int      NotificationId { get; set; }
    public string   Title          { get; set; } = string.Empty;
    public string   Message        { get; set; } = string.Empty;
    public DateTime CreatedDate    { get; set; } = DateTime.UtcNow;
    public int?     CreatedBy      { get; set; }
    public bool     IsGlobal       { get; set; } = true;
    // FEATURE 2: Soft delete notification
    public bool     IsDeleted      { get; set; } = false;
}
