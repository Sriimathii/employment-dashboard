using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController(AppDbContext db, IHttpContextAccessor http) : ControllerBase
{
    private int CurrentUserId =>
        int.TryParse(http.HttpContext?.User.FindFirst("userId")?.Value, out var id) ? id : 0;

    // ── GET all settings (all authenticated users can read) ──────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var settings = await db.AppSettings.ToListAsync();
        // Group by prefix for structured response
        var contacts = settings
            .Where(s => s.Key.StartsWith("contact_"))
            .ToDictionary(s => s.Key.Replace("contact_", ""), s => s.Value);
        var emails = settings
            .Where(s => s.Key.StartsWith("email_"))
            .ToDictionary(s => s.Key.Replace("email_", ""), s => s.Value);
        var support = settings
            .Where(s => s.Key.StartsWith("support_"))
            .ToDictionary(s => s.Key.Replace("support_", ""), s => s.Value);
        var company = settings
            .Where(s => s.Key.StartsWith("company_"))
            .ToDictionary(s => s.Key.Replace("company_", ""), s => s.Value);

        return Ok(new { contacts, emails, support, company });
    }

    // ── PUT contacts (Admin only) ────────────────────────────────────
    [HttpPut("contacts")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> SaveContacts([FromBody] Dictionary<string, string> data)
    {
        foreach (var kv in data)
            await UpsertSetting($"contact_{kv.Key}", kv.Value ?? "");
        await db.SaveChangesAsync();
        return Ok(new { message = "Contact information updated." });
    }

    // ── PUT emails (Admin only) ──────────────────────────────────────
    [HttpPut("emails")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> SaveEmails([FromBody] Dictionary<string, string> data)
    {
        foreach (var kv in data)
            await UpsertSetting($"email_{kv.Key}", kv.Value ?? "");
        await db.SaveChangesAsync();
        return Ok(new { message = "Email information updated." });
    }

    // ── PUT support info (Admin only) ────────────────────────────────
    [HttpPut("support")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> SaveSupport([FromBody] Dictionary<string, string> data)
    {
        foreach (var kv in data)
            await UpsertSetting($"support_{kv.Key}", kv.Value ?? "");
        await db.SaveChangesAsync();
        return Ok(new { message = "Support information updated." });
    }

    // ── PUT company info (Admin only) ────────────────────────────────
    [HttpPut("company")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> SaveCompany([FromBody] Dictionary<string, string> data)
    {
        foreach (var kv in data)
            await UpsertSetting($"company_{kv.Key}", kv.Value ?? "");
        await db.SaveChangesAsync();
        return Ok(new { message = "Company information updated." });
    }

    // ── FEEDBACK endpoints ───────────────────────────────────────────

    // POST /api/settings/feedback — any user can submit
    [HttpPost("feedback")]
    public async Task<IActionResult> SubmitFeedback([FromBody] SubmitFeedbackDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });
        if (string.IsNullOrWhiteSpace(dto.Description))
            return BadRequest(new { message = "Description is required." });

        var fb = new Feedback {
            UserId      = CurrentUserId,
            Title       = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            Category    = dto.Category ?? "General Feedback",
            Status      = "New",
            SubmittedAt = DateTime.UtcNow
        };
        db.Feedbacks.Add(fb);
        await db.SaveChangesAsync();

        return StatusCode(201, new {
            fb.FeedbackId,
            fb.Title,
            fb.Category,
            fb.Status,
            submittedAt = fb.SubmittedAt
        });
    }

    // GET /api/settings/feedback — Admin sees all; others see own
    [HttpGet("feedback")]
    public async Task<IActionResult> GetFeedback([FromQuery] string? status, [FromQuery] string? category)
    {
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        var q    = db.Feedbacks.Include(f => f.User).ThenInclude(u => u.Employee).AsQueryable();

        if (role != "Admin")
            q = q.Where(f => f.UserId == CurrentUserId);

        if (!string.IsNullOrWhiteSpace(status))   q = q.Where(f => f.Status == status);
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(f => f.Category == category);

        var data = await q.OrderByDescending(f => f.SubmittedAt)
            .Select(f => new {
                f.FeedbackId, f.Title, f.Description, f.Category,
                f.Status, f.AdminReply, f.SubmittedAt, f.ReviewedAt,
                SubmittedBy = f.User.Employee != null ? f.User.Employee.FullName : f.User.Username,
                Role        = f.User.Role != null ? f.User.Role.RoleName : ""
            }).ToListAsync();
        return Ok(data);
    }

    // PUT /api/settings/feedback/{id}/review — Admin updates status/reply
    [HttpPut("feedback/{id}/review")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ReviewFeedback(int id, [FromBody] ReviewFeedbackDto dto)
    {
        var fb = await db.Feedbacks.FindAsync(id);
        if (fb == null) return NotFound();

        if (dto.Status != null)     fb.Status     = dto.Status;
        if (dto.AdminReply != null) fb.AdminReply = dto.AdminReply;
        fb.ReviewedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { message = "Feedback updated." });
    }

    private async Task UpsertSetting(string key, string value)
    {
        var s = await db.AppSettings.FirstOrDefaultAsync(x => x.Key == key);
        if (s == null) db.AppSettings.Add(new AppSetting { Key = key, Value = value });
        else s.Value = value;
    }
}

public class SubmitFeedbackDto
{
    public string  Title       { get; set; } = string.Empty;
    public string  Description { get; set; } = string.Empty;
    public string? Category    { get; set; }
}

public class ReviewFeedbackDto
{
    public string? Status     { get; set; }
    public string? AdminReply { get; set; }
}