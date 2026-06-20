using System.Text.Json;
using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.Models;
using EmploymentDashboard.API.Services.Interfaces;
 
namespace EmploymentDashboard.API.Services;
 
public class AuditLogService(AppDbContext db, IHttpContextAccessor http) : IAuditLogService
{
    public async Task LogAsync(string action, int userId, string? entityType = null,
        int? entityId = null, object? oldValues = null, object? newValues = null)
    {
        db.AuditLogs.Add(new AuditLog {
            Action     = action,
            UserId     = userId,
            EntityType = entityType,
            EntityId   = entityId,
            OldValues  = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
            NewValues  = newValues != null ? JsonSerializer.Serialize(newValues) : null,
            IpAddress  = http.HttpContext?.Connection?.RemoteIpAddress?.ToString(),
            ActionDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }
}
 