using EmploymentDashboard.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
 
namespace EmploymentDashboard.API.Controllers;
 
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class AuditLogsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? action = null)
    {
        var q = db.AuditLogs
            .Include(l => l.User)
            .AsQueryable();
        if (!string.IsNullOrEmpty(action))
            q = q.Where(l => l.Action.Contains(action));
        var total = await q.CountAsync();
        var data  = await q.OrderByDescending(l => l.ActionDate)
            .Skip((page-1)*pageSize).Take(pageSize).ToListAsync();
        return Ok(new { data, total, page, pageSize });
    }
}
 