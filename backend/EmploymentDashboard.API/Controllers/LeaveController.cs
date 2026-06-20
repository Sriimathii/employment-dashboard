using EmploymentDashboard.API.DTOs.Leave;
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
public class LeaveController(
    ILeaveRepository repo,
    IAuditLogService auditLog,
    IHttpContextAccessor http,
    AppDbContext db) : ControllerBase
{
    private int CurrentUserId =>
        int.TryParse(http.HttpContext?.User.FindFirst("userId")?.Value, out var id) ? id : 0;

    private int CurrentEmpId =>
        int.TryParse(http.HttpContext?.User.FindFirst("employeeId")?.Value, out var id) ? id : 0;

    private string CurrentRole =>
        User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";

    private async Task<bool> IsInactiveAsync()
    {
        var empId = CurrentEmpId;
        if (empId == 0) return false;
        var emp = await db.Employees.FindAsync(empId);
        return emp?.IsInactive ?? false;
    }

    // ── GET /api/leave ─────────────────────────────────────────
    // Admin  → all leave requests (employees + managers)
    // Manager → only their TEAM employees' leaves (NOT their own)
    [HttpGet]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 10)
    {
        int? deptId    = null;
        int? excludeEmpId = null;   // Manager must NOT see their own leaves here

        if (CurrentRole == "Manager")
        {
            var mgr  = await db.Employees.FindAsync(CurrentEmpId);
            deptId         = mgr?.DepartmentId;
            excludeEmpId   = CurrentEmpId;  // exclude manager's own leaves from team view
        }

        var (data, total) = await repo.GetAllAsync(status, page, pageSize, deptId, excludeEmpId);
        return Ok(new { data, total, page, pageSize });
    }

    // ── GET /api/leave/my ──────────────────────────────────────
    // Returns the logged-in user's OWN leave history
    [HttpGet("my")]
    public async Task<IActionResult> GetMy()
    {
        var empId = CurrentEmpId;
        if (empId == 0)
            return BadRequest(new { message = "Employee ID not found in token." });
        return Ok(await repo.GetByEmployeeAsync(empId));
    }

    // ── GET /api/leave/balance ─────────────────────────────────
    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance()
    {
        var empId = CurrentEmpId;
        if (empId == 0)
            return BadRequest(new { message = "Employee ID not found in token." });
        return Ok(await repo.GetBalanceAsync(empId));
    }

    // ── POST /api/leave — Apply ────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> Apply([FromBody] CreateLeaveDto dto)
    {
        var empId = CurrentEmpId;
        if (empId == 0)
            return BadRequest(new { message = "Only employees can apply for leave." });
        if (await IsInactiveAsync())
            return BadRequest(new { message = "Your account is inactive. You cannot apply for leave." });
        if (dto.EndDate < dto.StartDate)
            return BadRequest(new { message = "End date must be on or after start date." });

        var (leave, error) = await repo.CreateAsync(empId, dto);
        if (error != null)
            return BadRequest(new { message = error });

        return StatusCode(201, leave);
    }

    // ── PUT /api/leave/{id}/approve ────────────────────────────
    // Admin  → can approve ANY leave (employees AND managers)
    // Manager → can approve only THEIR TEAM employees' leaves
    //            CANNOT approve their own leave (self-approval blocked)
    [HttpPut("{id}/approve")]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> Approve(int id, [FromBody] ApproveLeaveDto dto)
    {
        if (await IsInactiveAsync())
            return BadRequest(new { message = "Your account is inactive. You cannot approve/reject leave." });

        if (string.IsNullOrWhiteSpace(dto.Status) ||
            (dto.Status != "Approved" && dto.Status != "Rejected"))
            return BadRequest(new { message = "Status must be 'Approved' or 'Rejected'." });

        // Load leave to verify permissions
        var leave = await db.LeaveRequests
            .Include(l => l.Employee)
            .FirstOrDefaultAsync(l => l.LeaveId == id);

        if (leave == null)
            return NotFound(new { message = $"Leave request #{id} not found." });

        if (CurrentRole == "Manager")
        {
            // RULE 1: Manager CANNOT approve/reject their own leave
            if (leave.EmployeeId == CurrentEmpId)
                return BadRequest(new {
                    message = "You cannot approve or reject your own leave request. Manager leave requests must be approved by an Admin."
                });

            // RULE 2: Manager can only act on employees in their own department
            var mgr     = await db.Employees.FindAsync(CurrentEmpId);
            var empDept = leave.Employee.DepartmentId;
            if (mgr?.DepartmentId == null || empDept != mgr.DepartmentId)
                return Forbid();

            // RULE 3: Manager cannot approve another manager's leave
            var leaveEmpUser = await db.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.EmployeeId == leave.EmployeeId);
            if (leaveEmpUser?.Role?.RoleName == "Manager")
                return BadRequest(new {
                    message = "Managers can only approve leave for their team employees, not other managers."
                });
        }

        var ok = await repo.ApproveAsync(id, CurrentUserId, dto);
        if (!ok) return NotFound(new { message = $"Leave request #{id} not found." });

        await auditLog.LogAsync($"Leave{dto.Status}", CurrentUserId, "Leave", id);
        return Ok(new { message = $"Leave request {dto.Status.ToLower()} successfully." });
    }

    // ── DELETE /api/leave/{id}/cancel ─────────────────────────
    // Employee or Manager cancels their own PENDING leave
    [HttpDelete("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var empId = CurrentEmpId;
        if (empId == 0)
            return BadRequest(new { message = "Employee ID not found in token." });
        if (await IsInactiveAsync())
            return BadRequest(new { message = "Your account is inactive." });

        var ok = await repo.CancelAsync(id, empId);
        if (!ok)
            return BadRequest(new { message = "Cannot cancel this leave. It may already be approved or not belong to you." });

        return Ok(new { message = "Leave request cancelled successfully." });
    }
}