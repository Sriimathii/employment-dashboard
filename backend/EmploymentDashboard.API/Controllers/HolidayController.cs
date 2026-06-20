using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HolidayController(AppDbContext db) : ControllerBase
{
    // GET /api/holiday?year=2026
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? year)
    {
        var y = year ?? DateTime.Today.Year;
        var list = await db.Holidays
            .Where(h => h.Year == y)
            .OrderBy(h => h.HolidayDate)
            .Select(h => new {
                h.HolidayId, h.Name, h.HolidayType, h.Year,
                HolidayDate = h.HolidayDate.ToString("yyyy-MM-dd")
            }).ToListAsync();
        return Ok(list);
    }

    // POST /api/holiday — Admin only
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] HolidayDto dto)
    {
        if (!DateOnly.TryParse(dto.HolidayDate, out var date))
            return BadRequest(new { message = "Invalid date format." });
        if (await db.Holidays.AnyAsync(h => h.HolidayDate == date))
            return Conflict(new { message = $"{dto.HolidayDate} is already a holiday." });

        var h = new Holiday {
            HolidayDate = date, Name = dto.Name,
            HolidayType = dto.HolidayType ?? "National",
            Year        = date.Year
        };
        db.Holidays.Add(h);
        await db.SaveChangesAsync();
        return StatusCode(201, new { h.HolidayId, h.Name, HolidayDate = date.ToString("yyyy-MM-dd"), h.HolidayType });
    }

    // DELETE /api/holiday/{id} — Admin only
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var h = await db.Holidays.FindAsync(id);
        if (h == null) return NotFound();
        db.Holidays.Remove(h);
        await db.SaveChangesAsync();
        return Ok(new { message = "Holiday removed." });
    }
}

public class HolidayDto
{
    public string  Name        { get; set; } = string.Empty;
    public string  HolidayDate { get; set; } = string.Empty;
    public string? HolidayType { get; set; }
}