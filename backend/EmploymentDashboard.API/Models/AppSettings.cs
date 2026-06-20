namespace EmploymentDashboard.API.Models;

/// <summary>Key-value settings store for admin-configurable values.</summary>
public class AppSetting
{
    public int    SettingId { get; set; }
    public string Key       { get; set; } = string.Empty;
    public string Value     { get; set; } = string.Empty;
}