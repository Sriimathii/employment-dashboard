using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
 
namespace EmploymentDashboard.API.Controllers;
 
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController(AppDbContext db, IHttpContextAccessor http) : ControllerBase
{
    private int CurrentUserId
    {
        get
        {
            var c = http.HttpContext?.User.FindFirst("userId")?.Value;
            return int.TryParse(c, out var id) ? id : 0;
        }
    }

    // GET /api/notifications — excludes soft-deleted
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var notifications = await db.Notifications
            .Where(n => !n.IsDeleted)
            .OrderByDescending(n => n.CreatedDate)
            .Take(50)
            .Select(n => new {
                n.NotificationId,
                n.Title,
                n.Message,
                n.CreatedDate,
                n.CreatedBy,
                n.IsGlobal
            })
            .ToListAsync();
        return Ok(notifications);
    }

    // POST /api/notifications — Admin only
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Send([FromBody] Notification dto)
    {
        var notif = new Notification
        {
            Title       = dto.Title,
            Message     = dto.Message,
            IsGlobal    = true,
            CreatedBy   = CurrentUserId,
            CreatedDate = DateTime.UtcNow,
            IsDeleted   = false
        };
        db.Notifications.Add(notif);
        await db.SaveChangesAsync();
        return StatusCode(201, notif);
    }

    // FEATURE 2: DELETE /api/notifications/{id} — Admin can delete
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var notif = await db.Notifications.FindAsync(id);
        if (notif == null) return NotFound(new { message = "Notification not found." });

        // Soft delete — removes from all users' views
        notif.IsDeleted = true;
        await db.SaveChangesAsync();
        return Ok(new { message = "Notification deleted successfully." });
    }
}
