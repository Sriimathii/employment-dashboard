namespace EmploymentDashboard.API.Models;

public class User
{
    public int      UserId       { get; set; }
    public string   Username     { get; set; } = string.Empty;
    public string   PasswordHash { get; set; } = string.Empty;
    public int      RoleId       { get; set; }
    public Role     Role         { get; set; } = null!;
    public int?     EmployeeId   { get; set; }
    public Employee? Employee    { get; set; }
    public bool     IsActive     { get; set; } = true;
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;

    // FEATURE 8: Password reset token
    public string?   ResetToken          { get; set; }
    public DateTime? ResetTokenExpiry    { get; set; }
}
