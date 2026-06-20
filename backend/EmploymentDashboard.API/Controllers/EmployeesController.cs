using EmploymentDashboard.API.DTOs.Employee;
using EmploymentDashboard.API.Repositories.Interfaces;
using EmploymentDashboard.API.Services.Interfaces;
using EmploymentDashboard.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController(
    IEmployeeRepository repo,
    IAuditLogService    auditLog,
    AppDbContext        db,
    IHttpContextAccessor http) : ControllerBase
{
    private int CurrentUserId =>
        int.TryParse(http.HttpContext?.User.FindFirst("userId")?.Value, out var id) ? id : 0;
    private int CurrentEmpId =>
        int.TryParse(http.HttpContext?.User.FindFirst("employeeId")?.Value, out var id) ? id : 0;
    private string CurrentRole =>
        User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";

    // FIX 2: GET /api/employees/next-code — returns next auto-generated code (e.g. EMP040)
    [HttpGet("next-code")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetNextCode()
    {
        var code = await repo.GenerateNextCodeAsync();
        return Ok(new { code });
    }

    // GET /api/employees — Manager sees only own department
    [HttpGet]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> GetAll([FromQuery] EmployeeFilterDto filter)
    {
        if (CurrentRole == "Manager")
        {
            var mgr = await db.Employees.FindAsync(CurrentEmpId);
            if (mgr?.DepartmentId != null)
                filter.DepartmentId = mgr.DepartmentId;
            else
                return Ok(new { data = Array.Empty<object>(), totalCount = 0, page = 1, pageSize = filter.PageSize });
        }
        var result = await repo.GetPagedAsync(filter);
        return Ok(result);
    }

    // GET /api/employees/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (CurrentRole == "Employee" && CurrentEmpId != id) return Forbid();
        if (CurrentRole == "Manager")
        {
            var mgr = await db.Employees.FindAsync(CurrentEmpId);
            var emp = await db.Employees.FindAsync(id);
            if (mgr?.DepartmentId != null && emp?.DepartmentId != mgr.DepartmentId)
                return Forbid();
        }
        var result = await repo.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    // POST /api/employees
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
    {
        var emp = await repo.CreateAsync(dto);
        await auditLog.LogAsync("EmployeeCreated", CurrentUserId, "Employee", emp.EmployeeId);
        return StatusCode(201, emp);
    }

    // PUT /api/employees/{id}
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEmployeeDto dto)
    {
        if (CurrentRole == "Manager")
        {
            var mgr = await db.Employees.FindAsync(CurrentEmpId);
            var emp = await db.Employees.FindAsync(id);
            if (mgr?.DepartmentId != null && emp?.DepartmentId != mgr.DepartmentId) return Forbid();
            dto.Salary = null; dto.RoleId = null;
        }
        var ok = await repo.UpdateAsync(id, dto);
        if (!ok) return NotFound();
        await auditLog.LogAsync("EmployeeUpdated", CurrentUserId, "Employee", id);
        return Ok(new { message = "Employee updated successfully." });
    }

    // DELETE /api/employees/{id}
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await repo.SoftDeleteAsync(id, CurrentUserId);
        if (!ok) return NotFound(new { message = "Employee not found." });
        await auditLog.LogAsync("EmployeeDeleted", CurrentUserId, "Employee", id);
        return Ok(new { message = "Employee removed." });
    }

    // POST /api/employees/{id}/upload-photo
    [HttpPost("{id}/upload-photo")]
    public async Task<IActionResult> UploadPhoto(int id, IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file.");
        var ext = Path.GetExtension(file.FileName).ToLower();
        if (!new[] { ".jpg", ".jpeg", ".png", ".webp" }.Contains(ext))
            return BadRequest("Only image files allowed.");
        var dir = Path.Combine("wwwroot", "uploads", "profiles");
        Directory.CreateDirectory(dir);
        var name = $"{id}_{Guid.NewGuid()}{ext}";
        var path = Path.Combine(dir, name);
        await using var stream = System.IO.File.Create(path);
        await file.CopyToAsync(stream);
        var url = $"/uploads/profiles/{name}";
        await repo.UpdatePhotoAsync(id, url);
        return Ok(new { url });
    }
}