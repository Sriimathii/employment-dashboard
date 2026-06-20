using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.DTOs.Leave;
using EmploymentDashboard.API.Models;
using EmploymentDashboard.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Repositories;

public class LeaveRepository(AppDbContext db) : ILeaveRepository
{
    private IQueryable<LeaveRequest> Base =>
        db.LeaveRequests
          .Where(l => !l.IsDeleted)
          .Include(l => l.Employee).ThenInclude(e => e.Department)
          .Include(l => l.Approver);

    // excludeEmpId → used by Manager to exclude their own leaves from the team view
    public async Task<(IEnumerable<LeaveRequestDto> Data, int Total)> GetAllAsync(
        string? status, int page, int pageSize,
        int? departmentId = null,
        int? excludeEmpId = null)
    {
        var q = Base.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(l => l.Status == status);

        // Filter to department (for Manager team view)
        if (departmentId.HasValue)
            q = q.Where(l => l.Employee.DepartmentId == departmentId);

        // Exclude manager's own leave from team view
        if (excludeEmpId.HasValue)
            q = q.Where(l => l.EmployeeId != excludeEmpId.Value);

        var total = await q.CountAsync();
        var data  = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(l => ToDto(l)).ToListAsync();

        return (data, total);
    }

    // My own leaves — no dept filter, no exclusion
    public async Task<IEnumerable<LeaveRequestDto>> GetByEmployeeAsync(int empId)
        => await Base
            .Where(l => l.EmployeeId == empId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => ToDto(l)).ToListAsync();

    // Create leave — enforces monthly balance limit
    public async Task<(LeaveRequestDto? Leave, string? Error)> CreateAsync(int empId, CreateLeaveDto dto)
    {
        var now        = DateTime.UtcNow;
        var start      = dto.StartDate;
        var end        = dto.EndDate;
        var monthStart = new DateOnly(start.Year, start.Month, 1);
        var monthEnd   = new DateOnly(start.Year, start.Month, DateTime.DaysInMonth(start.Year, start.Month));

        var usedThisMonth = await db.LeaveRequests
            .Where(l => l.EmployeeId == empId &&
                        !l.IsDeleted &&
                        (l.Status == "Approved" || l.Status == "Pending") &&
                        l.StartDate <= monthEnd &&
                        l.EndDate   >= monthStart)
            .SumAsync(l => (l.EndDate.DayNumber - l.StartDate.DayNumber) + 1);

        var requestedDays = (end.DayNumber - start.DayNumber) + 1;
        var emp   = await db.Employees.FindAsync(empId);
        var limit = emp?.MonthlyLeaveBalance ?? 3;

        if (usedThisMonth + requestedDays > limit)
            return (null,
                $"Monthly leave limit exceeded. You have used {usedThisMonth}/{limit} days this month. " +
                $"Requesting {requestedDays} more would exceed your limit.");

        var leave = new LeaveRequest
        {
            EmployeeId = empId,       LeaveType = dto.LeaveType,
            StartDate  = start,       EndDate   = end,
            Reason     = dto.Reason,  Status    = "Pending",
            CreatedAt  = now
        };
        db.LeaveRequests.Add(leave);
        await db.SaveChangesAsync();
        var saved = await Base.FirstAsync(l => l.LeaveId == leave.LeaveId);
        return (ToDto(saved), null);
    }

    // Approve or Reject — creates attendance records when approved
    public async Task<bool> ApproveAsync(int leaveId, int userId, ApproveLeaveDto dto)
    {
        var leave = await db.LeaveRequests
            .Include(l => l.Employee)
            .FirstOrDefaultAsync(l => l.LeaveId == leaveId);
        if (leave == null) return false;

        var prevStatus   = leave.Status;
        leave.Status     = dto.Status;
        leave.ApprovedBy = userId;
        leave.Remarks    = dto.Remarks;

        if (dto.Status == "Approved" && prevStatus != "Approved")
        {
            var d = leave.StartDate;
            while (d <= leave.EndDate)
            {
                if (d.DayOfWeek != DayOfWeek.Sunday)
                {
                    var existing = await db.Attendances
                        .FirstOrDefaultAsync(a => a.EmployeeId == leave.EmployeeId && a.AttendanceDate == d);
                    if (existing == null)
                        db.Attendances.Add(new Attendance {
                            EmployeeId = leave.EmployeeId, AttendanceDate = d, Status = "On Leave"
                        });
                    else
                        existing.Status = "On Leave";
                }
                d = d.AddDays(1);
            }
        }

        await db.SaveChangesAsync();
        return true;
    }

    // Cancel own pending leave
    public async Task<bool> CancelAsync(int leaveId, int empId)
    {
        var leave = await db.LeaveRequests
            .FirstOrDefaultAsync(l => l.LeaveId == leaveId && l.EmployeeId == empId);
        if (leave == null) return false;
        if (leave.Status != "Pending") return false;

        leave.Status = "Cancelled";

        var attRecords = await db.Attendances
            .Where(a => a.EmployeeId == empId &&
                        a.AttendanceDate >= leave.StartDate &&
                        a.AttendanceDate <= leave.EndDate &&
                        a.Status == "On Leave")
            .ToListAsync();
        db.Attendances.RemoveRange(attRecords);

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<LeaveBalanceDto> GetBalanceAsync(int empId)
    {
        var now    = DateTime.UtcNow;
        var mStart = new DateOnly(now.Year, now.Month, 1);
        var mEnd   = new DateOnly(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month));

        var used = await db.LeaveRequests
            .Where(l => l.EmployeeId == empId &&
                        !l.IsDeleted &&
                        (l.Status == "Approved" || l.Status == "Pending") &&
                        l.StartDate <= mEnd &&
                        l.EndDate   >= mStart)
            .SumAsync(l => (l.EndDate.DayNumber - l.StartDate.DayNumber) + 1);

        var emp   = await db.Employees.FindAsync(empId);
        var limit = emp?.MonthlyLeaveBalance ?? 3;

        return new LeaveBalanceDto {
            MonthlyLimit     = limit,
            UsedThisMonth    = used,
            RemainingBalance = Math.Max(0, limit - used),
            Year             = now.Year,
            Month            = now.Month
        };
    }

    public async Task<bool> SoftDeleteAsync(int leaveId, int updatedBy)
    {
        var leave = await db.LeaveRequests.FirstOrDefaultAsync(l => l.LeaveId == leaveId);
        if (leave == null) return false;
        leave.IsDeleted = true;
        await db.SaveChangesAsync();
        return true;
    }

    private static LeaveRequestDto ToDto(LeaveRequest l) => new()
    {
        LeaveId        = l.LeaveId,
        EmployeeId     = l.EmployeeId,
        EmployeeName   = l.Employee.FullName,
        DepartmentName = l.Employee.Department?.DepartmentName ?? "",
        LeaveType      = l.LeaveType,
        StartDate      = l.StartDate,
        EndDate        = l.EndDate,
        Reason         = l.Reason,
        Status         = l.Status,
        ApprovedByName = l.Approver?.Username,
        Remarks        = l.Remarks,
        CreatedAt      = l.CreatedAt
    };
}