using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.DTOs.Attendance;
using EmploymentDashboard.API.DTOs.Employee;
using EmploymentDashboard.API.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOrManager")]
public class ReportsController(AppDbContext db, IHttpContextAccessor http) : ControllerBase
{
    private string CurrentRole =>
        User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
    private int CurrentEmpId() {
        var c = http.HttpContext?.User.FindFirst("employeeId")?.Value;
        return int.TryParse(c, out var id) ? id : 0;
    }

    // ── Employee Report ────────────────────────────────────────
    [HttpGet("export/employees")]
    public async Task<IActionResult> ExportEmployees(
        [FromQuery] string  format       = "excel",
        [FromQuery] int?    departmentId = null,
        [FromQuery] string? status       = null,
        [FromQuery] string? search       = null)
    {
        var q = db.Employees
            .Include(e => e.Department).Include(e => e.Role)
            .Where(e => !e.IsDeleted).AsQueryable();

        // Manager restriction
        if (CurrentRole == "Manager") {
            var mgr = await db.Employees.FindAsync(CurrentEmpId());
            if (mgr?.DepartmentId != null) q = q.Where(e => e.DepartmentId == mgr.DepartmentId);
        }

        if (departmentId.HasValue) q = q.Where(e => e.DepartmentId == departmentId.Value);
        if (!string.IsNullOrEmpty(status))  q = q.Where(e => e.Status == status);
        if (!string.IsNullOrEmpty(search))  q = q.Where(e => e.FullName.Contains(search) || e.Email.Contains(search) || e.EmployeeCode.Contains(search));

        var employees = await q.OrderBy(e => e.FullName)
            .Select(e => new EmployeeDto {
                EmployeeId     = e.EmployeeId, EmployeeCode   = e.EmployeeCode,
                FullName       = e.FullName,   Email          = e.Email,
                PhoneNumber    = e.PhoneNumber, DepartmentName = e.Department != null ? e.Department.DepartmentName : "—",
                RoleName       = e.Role        != null ? e.Role.RoleName             : "—",
                Status         = e.Status,     JoiningDate    = e.JoiningDate,
                Salary         = e.Salary,     Address        = e.Address
            }).ToListAsync();

        if (format.ToLower() == "pdf") {
            var bytes = EmployeePdfReport.Generate(employees, DateTime.Now);
            return File(bytes, "application/pdf", $"Employee_Report_{DateTime.Today:yyyyMMdd}.pdf");
        }
        return File(ExcelExporter.ExportEmployees(employees),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Employee_Report_{DateTime.Today:yyyyMMdd}.xlsx");
    }

    // ── Attendance Report — FIX 5: PDF uses AttendancePdfReport ─
    [HttpGet("export/attendance")]
    public async Task<IActionResult> ExportAttendance(
        [FromQuery] string? from         = null,
        [FromQuery] string? to           = null,
        [FromQuery] string  format       = "excel",
        [FromQuery] int?    employeeId   = null,
        [FromQuery] int?    departmentId = null,
        [FromQuery] string? status       = null)
    {
        var q = db.Attendances
            .Include(a => a.Employee).ThenInclude(e => e.Department)
            .AsQueryable();

        // Manager restriction
        if (CurrentRole == "Manager") {
            var mgr = await db.Employees.FindAsync(CurrentEmpId());
            if (mgr?.DepartmentId != null) q = q.Where(a => a.Employee.DepartmentId == mgr.DepartmentId);
        }

        if (!string.IsNullOrEmpty(from) && DateOnly.TryParse(from, out var fd)) q = q.Where(a => a.AttendanceDate >= fd);
        if (!string.IsNullOrEmpty(to)   && DateOnly.TryParse(to,   out var td)) q = q.Where(a => a.AttendanceDate <= td);
        if (employeeId.HasValue)   q = q.Where(a => a.EmployeeId == employeeId.Value);
        if (departmentId.HasValue) q = q.Where(a => a.Employee.DepartmentId == departmentId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(a => a.Status == status);

        var records = await q.OrderByDescending(a => a.AttendanceDate)
            .Select(a => new AttendanceDto {
                AttendanceId   = a.AttendanceId, EmployeeId   = a.EmployeeId,
                EmployeeName   = a.Employee.FullName,
                EmployeeCode   = a.Employee.EmployeeCode,
                AttendanceDate = a.AttendanceDate.ToString("yyyy-MM-dd"),
                CheckInTime    = a.CheckInTime.HasValue  ? a.CheckInTime.Value.ToString("HH:mm")  : null,
                CheckOutTime   = a.CheckOutTime.HasValue ? a.CheckOutTime.Value.ToString("HH:mm") : null,
                Status         = a.Status,
                WorkingHours   = a.CheckInTime != null && a.CheckOutTime != null
                    ? (a.CheckOutTime.Value - a.CheckInTime.Value).TotalHours : null
            }).ToListAsync();

        if (format.ToLower() == "pdf") {
            var bytes = AttendancePdfReport.Generate(records, DateTime.Now);
            return File(bytes, "application/pdf", $"Attendance_Report_{DateTime.Today:yyyyMMdd}.pdf");
        }
        return File(ExcelExporter.ExportAttendance(records),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Attendance_Report_{DateTime.Today:yyyyMMdd}.xlsx");
    }

    // ── Roster Report — Roster format export ──────────────────
    [HttpGet("export/roster")]
    public async Task<IActionResult> ExportRoster(
        [FromQuery] int    year,
        [FromQuery] int    month,
        [FromQuery] int?   departmentId = null,
        [FromQuery] string format       = "excel",
        [FromQuery] string search       = "")
    {
        var roster = await RosterController.BuildRosterAsync(
            db, year, month, departmentId, search, CurrentRole, CurrentEmpId());

        if (format.ToLower() == "pdf") {
            var bytes = RosterPdfReport.Generate(roster, DateTime.Now);
            return File(bytes, "application/pdf",
                $"Roster_{roster.MonthName.Replace(" ", "_")}_{DateTime.Today:yyyyMMdd}.pdf");
        }
        return File(ExcelExporter.ExportRoster(roster),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Roster_{roster.MonthName.Replace(" ", "_")}_{DateTime.Today:yyyyMMdd}.xlsx");
    }

    // ── Leave Report — FIX 2: Now uses QuestPDF ───────────────
    [HttpGet("export/leave")]
    public async Task<IActionResult> ExportLeave(
        [FromQuery] string? from         = null,
        [FromQuery] string? to           = null,
        [FromQuery] string  format       = "excel",
        [FromQuery] int?    departmentId = null,
        [FromQuery] string? status       = null,
        [FromQuery] string? leaveType    = null)
    {
        var q = db.LeaveRequests
            .Include(l => l.Employee).ThenInclude(e => e.Department)
            .Where(l => !l.IsDeleted).AsQueryable();

        // Manager restriction
        if (CurrentRole == "Manager") {
            var mgr = await db.Employees.FindAsync(CurrentEmpId());
            if (mgr?.DepartmentId != null) q = q.Where(l => l.Employee.DepartmentId == mgr.DepartmentId);
        }

        if (!string.IsNullOrEmpty(from) && DateOnly.TryParse(from, out var fd)) q = q.Where(l => l.StartDate >= fd);
        if (!string.IsNullOrEmpty(to)   && DateOnly.TryParse(to,   out var td)) q = q.Where(l => l.EndDate <= td);
        if (departmentId.HasValue) q = q.Where(l => l.Employee.DepartmentId == departmentId.Value);
        if (!string.IsNullOrEmpty(status))    q = q.Where(l => l.Status    == status);
        if (!string.IsNullOrEmpty(leaveType)) q = q.Where(l => l.LeaveType == leaveType);

        var records = await q.OrderByDescending(l => l.StartDate)
            .Select(l => new {
                l.Employee.EmployeeCode, EmployeeName = l.Employee.FullName,
                DepartmentName = l.Employee.Department != null ? l.Employee.Department.DepartmentName : "—",
                l.LeaveType,
                StartDate = l.StartDate.ToString("yyyy-MM-dd"),
                EndDate   = l.EndDate.ToString("yyyy-MM-dd"),
                TotalDays = l.EndDate.DayNumber - l.StartDate.DayNumber + 1,
                l.Status, l.Reason
            }).ToListAsync();

        if (format.ToLower() == "pdf")
        {
            // FIX 2: Use QuestPDF — returns a real PDF file
            var pdfRows = records.Select(r => new LeavePdfReport.LeaveRow(
                r.EmployeeCode, r.EmployeeName, r.DepartmentName,
                r.LeaveType, r.StartDate, r.EndDate, r.TotalDays, r.Status, r.Reason));
            var bytes = LeavePdfReport.Generate(pdfRows, DateTime.Now);
            return File(bytes, "application/pdf", $"Leave_Report_{DateTime.Today:yyyyMMdd}.pdf");
        }

        var leaveRows = records.Select(r => new object[] {
            r.EmployeeCode, r.EmployeeName, r.DepartmentName,
            r.LeaveType, r.StartDate, r.EndDate, r.TotalDays, r.Status, r.Reason ?? ""
        }).ToList();
        return File(ExcelExporter.ExportLeave(leaveRows),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Leave_Report_{DateTime.Today:yyyyMMdd}.xlsx");
    }
}