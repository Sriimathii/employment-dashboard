using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
 
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController(AppDbContext db, IHttpContextAccessor http) : ControllerBase
{
    private int GetEmpId()
    {
        var c = http.HttpContext?.User.FindFirst("employeeId")?.Value;
        return int.TryParse(c, out var id) ? id : 0;
    }
    private int GetUserId()
    {
        var c = http.HttpContext?.User.FindFirst("userId")?.Value;
        return int.TryParse(c, out var id) ? id : 0;
    }

    // GET /api/profile — works for ALL roles
    [HttpGet]
    public async Task<IActionResult> GetMyProfile()
    {
        var empId = GetEmpId();
        if (empId == 0)
            return Ok(new { message = "No employee profile linked." });

        var emp = await db.Employees
            .Include(e => e.Department)
            .Include(e => e.Role)
            .FirstOrDefaultAsync(e => e.EmployeeId == empId);

        if (emp == null) return NotFound();

        var user = await db.Users.FirstOrDefaultAsync(u => u.EmployeeId == empId);

        return Ok(new {
            emp.EmployeeId,
            emp.EmployeeCode,
            emp.FullName,
            emp.Email,
            emp.PhoneNumber,
            emp.Address,
            emp.Status,
            emp.ProfileImage,
            emp.IsInactive,
            JoiningDate    = emp.JoiningDate.ToString("yyyy-MM-dd"),
            DepartmentName = emp.Department?.DepartmentName,
            RoleName       = emp.Role?.RoleName,
            Username       = user?.Username,
            CreatedAt      = user?.CreatedAt
        });
    }

    // PUT /api/profile — update own basic info
    [HttpPut]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateProfileDto dto)
    {
        // FEATURE 6: Block inactive users from making changes
        var empId = GetEmpId();
        var emp   = await db.Employees.FindAsync(empId);
        if (emp == null) return NotFound();
        if (emp.IsInactive)
            return BadRequest(new { message = "Your account is inactive. You cannot make changes." });

        if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) emp.PhoneNumber = dto.PhoneNumber;
        if (!string.IsNullOrWhiteSpace(dto.Address))     emp.Address     = dto.Address;

        await db.SaveChangesAsync();
        return Ok(new { message = "Profile updated successfully." });
    }
    
}

public record UpdateProfileDto(string? PhoneNumber, string? Address);
public record ForgotPasswordRequestDto(string Email);
public record ResetPasswordDto(string Token, string NewPassword);