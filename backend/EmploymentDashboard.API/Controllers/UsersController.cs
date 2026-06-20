using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.Helpers;
using EmploymentDashboard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(AppDbContext db, IHttpContextAccessor http) : ControllerBase
{
    private int CurrentUserId =>
        int.Parse(http.HttpContext!.User.FindFirst("userId")!.Value);

    [HttpGet]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll()
    {
        var users = await db.Users
            .Include(u => u.Role)
            .Include(u => u.Employee).ThenInclude(e => e!.Department)
            .Include(u => u.Employee).ThenInclude(e => e!.Role)
            .OrderBy(u => u.Username)
            .Select(u => new {
                u.UserId, u.Username, u.IsActive, u.CreatedAt,
                Role     = new { u.Role.RoleId, u.Role.RoleName },
                Employee = u.Employee == null ? null : new {
                    u.Employee.EmployeeId, u.Employee.FullName,
                    u.Employee.Email,      u.Employee.DepartmentId,
                    DepartmentName = u.Employee.Department == null ? "" : u.Employee.Department.DepartmentName,
                    u.Employee.IsInactive, u.Employee.Status,
                    u.Employee.IsDeleted,
                    // Show employee role from the Employee record (synced with User role on change)
                    RoleName = u.Employee.Role == null ? "" : u.Employee.Role.RoleName
                }
            }).ToListAsync();
        return Ok(users);
    }

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Username == req.Username))
            return Conflict(new { message = "Username already exists." });

        var user = new User {
            Username     = req.Username,
            PasswordHash = PasswordHasher.Hash(req.Password),
            RoleId       = req.RoleId,
            EmployeeId   = req.EmployeeId,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        // FIX 1: Also sync Employee.RoleId when creating user with a role
        if (req.EmployeeId.HasValue) {
            var emp = await db.Employees.FindAsync(req.EmployeeId.Value);
            if (emp != null) { emp.RoleId = req.RoleId; await db.SaveChangesAsync(); }
        }

        db.AuditLogs.Add(new AuditLog {
            Action = "UserCreated", UserId = CurrentUserId,
            EntityType = "User", EntityId = user.UserId, ActionDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return Created("", new { user.UserId, user.Username });
    }

    [HttpPut("{id}/reset-password")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });
        user.PasswordHash = PasswordHasher.Hash(req.NewPassword);
        await db.SaveChangesAsync();
        db.AuditLogs.Add(new AuditLog {
            Action = "PasswordReset", UserId = CurrentUserId,
            EntityType = "User", EntityId = id, ActionDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return Ok(new { message = "Password reset successfully." });
    }

    [HttpPut("{id}/toggle-status")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var user = await db.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.UserId == id);
        if (user == null) return NotFound(new { message = "User not found." });
        if (user.UserId == CurrentUserId)
            return BadRequest(new { message = "Cannot deactivate your own account." });

        user.IsActive = !user.IsActive;
        if (user.Employee != null) {
            user.Employee.IsInactive = !user.IsActive;
            user.Employee.Status     = user.IsActive ? "Active" : "Inactive";
        }
        await db.SaveChangesAsync();
        db.AuditLogs.Add(new AuditLog {
            Action = user.IsActive ? "UserActivated" : "UserDeactivated",
            UserId = CurrentUserId, EntityType = "User", EntityId = id, ActionDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return Ok(new {
            user.UserId, user.IsActive,
            message = user.IsActive ? "User activated." : "User deactivated. Account is now read-only."
        });
    }

    // FIX 1: PUT /api/users/{id}/role — now ALSO updates Employee.RoleId
    [HttpPut("{id}/role")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> ChangeRole(int id, [FromBody] ChangeRoleRequest req)
    {
        var user = await db.Users
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.UserId == id);
        if (user == null) return NotFound(new { message = "User not found." });

        var role = await db.Roles.FindAsync(req.RoleId);
        if (role == null) return BadRequest(new { message = "Invalid role." });

        // Update User role
        user.RoleId = req.RoleId;

        // FIX 1: ALSO sync Employee.RoleId so roleName is correct everywhere
        if (user.Employee != null)
        {
            user.Employee.RoleId = req.RoleId;
        }

        await db.SaveChangesAsync();

        db.AuditLogs.Add(new AuditLog {
            Action = "RoleChanged", UserId = CurrentUserId,
            EntityType = "User", EntityId = id, ActionDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        return Ok(new {
            message = $"Role updated to {role.RoleName} successfully.",
            newRole = role.RoleName
        });
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });
        if (user.UserId == CurrentUserId)
            return BadRequest(new { message = "Cannot delete your own account." });

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        db.AuditLogs.Add(new AuditLog {
            Action = "UserDeleted", UserId = CurrentUserId,
            EntityType = "User", EntityId = id, ActionDate = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return Ok(new { message = "User deleted successfully." });
    }
}

public record CreateUserRequest(string Username, string Password, int RoleId, int? EmployeeId);
public record ResetPasswordRequest(string NewPassword);
public record ChangeRoleRequest(int RoleId);