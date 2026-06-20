using EmploymentDashboard.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private int GetCurrentEmpId()
    {
        var claim = User.FindFirst("employeeId")?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    // ── Admin Dashboard ─────────────────────────────────────
    [HttpGet("admin")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAdminStats()
    {
        var totalEmp      = await db.Employees.CountAsync(e => !e.IsDeleted);
        var activeEmp     = await db.Employees.CountAsync(e => e.Status == "Active" && !e.IsDeleted);
        var inactiveEmp   = await db.Employees.CountAsync(e => e.IsInactive && !e.IsDeleted);
        var totalDepts    = await db.Departments.CountAsync();
        var pendingLeaves = await db.LeaveRequests.CountAsync(l => l.Status == "Pending");
        var totalLeaves   = await db.LeaveRequests.CountAsync();

        var today        = DateOnly.FromDateTime(DateTime.Today);

        // Only count attendance of employees who are currently active (not deleted, not inactive).
        // This prevents inactive/deleted employees' old or stray records from inflating the percentage.
        var activeEmpIds = await db.Employees
            .Where(e => !e.IsDeleted && !e.IsInactive && e.Status == "Active")
            .Select(e => e.EmployeeId)
            .ToListAsync();

        var presentToday = await db.Attendances.CountAsync(a => a.AttendanceDate == today && activeEmpIds.Contains(a.EmployeeId) && (a.Status == "Present" || a.Status == "Late"));
        var onLeaveToday = await db.Attendances.CountAsync(a => a.AttendanceDate == today && activeEmpIds.Contains(a.EmployeeId) && a.Status == "On Leave");
        var absentToday  = await db.Attendances.CountAsync(a => a.AttendanceDate == today && activeEmpIds.Contains(a.EmployeeId) && a.Status == "Absent");
        var attPct = activeEmp > 0 ? Math.Round((double)presentToday / activeEmp * 100, 1) : 0;

        // ── Today's leave breakdown by type ────────────────────────────────────────
        // Fetch employees whose attendance is "On Leave" today, then match to LeaveRequests
        // to determine the leave type. Employees with no matching request → "Other Leave".
        var todayOnLeaveEmpIds = await db.Attendances
            .Where(a => a.AttendanceDate == today && a.Status == "On Leave"
                     && activeEmpIds.Contains(a.EmployeeId))
            .Select(a => a.EmployeeId)
            .ToListAsync();

        var todayLeaveRequests = await db.LeaveRequests
            .Where(l => l.Status == "Approved" && !l.IsDeleted
                     && l.StartDate <= today && l.EndDate >= today
                     && todayOnLeaveEmpIds.Contains(l.EmployeeId))
            .Select(l => new { l.EmployeeId, l.LeaveType })
            .ToListAsync();

        // Map empId → leaveType (use first matching request per employee)
        var empLeaveTypeMap = todayLeaveRequests
            .GroupBy(l => l.EmployeeId)
            .ToDictionary(g => g.Key, g => g.First().LeaveType);

        // Count by leave type; unmatched employees counted as "Other Leave"
        var todayLeaveTypeCounts = new Dictionary<string, int>();
        foreach (var empId in todayOnLeaveEmpIds)
        {
            var lt = empLeaveTypeMap.TryGetValue(empId, out var t) ? t : "Other Leave";
            if (!todayLeaveTypeCounts.ContainsKey(lt)) todayLeaveTypeCounts[lt] = 0;
            todayLeaveTypeCounts[lt]++;
        }

        // Always return all 7 leave type codes even if count = 0
        var leaveTypeCodes = new[] { "Sick Leave", "Casual Leave", "Annual Leave", "Unpaid Leave", "Maternity Leave", "Paternity Leave", "Other Leave" };
        var todayLeaveBreakdown = leaveTypeCodes.Select(lt => new {
            leaveType = lt,
            shortCode = lt switch {
                "Sick Leave"      => "SL",
                "Casual Leave"    => "CL",
                "Annual Leave"    => "AL",
                "Unpaid Leave"    => "UL",
                "Maternity Leave" => "ML",
                "Paternity Leave" => "PL",
                "Other Leave"     => "OL",
                _                 => lt
            },
            count = todayLeaveTypeCounts.TryGetValue(lt, out var c) ? c : 0
        }).ToList();

        var empByDept = await db.Employees
            .Where(e => e.Department != null && !e.IsDeleted)
            .GroupBy(e => e.Department!.DepartmentName)
            .Select(g => new { department = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count).ToListAsync();

        // ── FIX 4: DAILY attendance for current month (not 6-month monthly summary)
        var monthStart   = new DateOnly(today.Year, today.Month, 1);
        var dailyRaw     = await db.Attendances
            .Where(a => a.AttendanceDate >= monthStart && a.AttendanceDate <= today)
            .Select(a => new { a.AttendanceDate, a.Status })
            .ToListAsync();

        // Group by day — gives admin per-day counts for the current month
        var dailyAttendance = dailyRaw
            .GroupBy(a => a.AttendanceDate)
            .Select(g => new {
                date    = g.Key.ToString("yyyy-MM-dd"),
                day     = g.Key.Day,
                present = g.Count(x => x.Status == "Present"),
                late    = g.Count(x => x.Status == "Late"),
                absent  = g.Count(x => x.Status == "Absent"),
                onLeave = g.Count(x => x.Status == "On Leave"),
                total   = g.Count()
            })
            .OrderBy(x => x.date)
            .ToList();

        // ── Per-day leave-type breakdown ───────────────────────────────────────────
        // Strategy: for each day, find employees whose Attendance.Status = "On Leave"
        // then join with LeaveRequests to discover WHICH leave type they are on.
        // This handles both cases:
        //   (a) Leave requests exist → we get the exact type (SL/CL/AL etc.)
        //   (b) Attendance marked "On Leave" with no matching request → counted as "Other Leave"

        // Step 1: Fetch all "On Leave" attendance records for this month
        var onLeaveAttendance = await db.Attendances
            .Where(a => a.AttendanceDate >= monthStart && a.AttendanceDate <= today
                     && a.Status == "On Leave")
            .Select(a => new { a.EmployeeId, a.AttendanceDate })
            .ToListAsync();

        // Step 2: Fetch all approved leave requests overlapping this month
        var monthLeaveRequests = await db.LeaveRequests
            .Where(l => l.Status == "Approved" && !l.IsDeleted
                     && l.StartDate <= today && l.EndDate >= monthStart)
            .Select(l => new { l.EmployeeId, l.LeaveType, l.StartDate, l.EndDate })
            .ToListAsync();

        // Step 3: Build per-day leave-type counts by matching attendance to leave requests
        var dailyLeaveMap = new Dictionary<DateOnly, Dictionary<string, int>>();
        foreach (var att in onLeaveAttendance)
        {
            var attDate = att.AttendanceDate;

            // Find which approved leave request covers this employee on this date
            var matchedLeave = monthLeaveRequests
                .Where(l => l.EmployeeId == att.EmployeeId
                         && l.StartDate <= attDate
                         && l.EndDate >= attDate)
                .FirstOrDefault();

            var leaveType = matchedLeave?.LeaveType ?? "Other Leave";

            if (!dailyLeaveMap.ContainsKey(attDate))
                dailyLeaveMap[attDate] = new Dictionary<string, int>();

            if (!dailyLeaveMap[attDate].ContainsKey(leaveType))
                dailyLeaveMap[attDate][leaveType] = 0;

            dailyLeaveMap[attDate][leaveType]++;
        }

        // Step 4: Merge leave-type breakdown into daily attendance data
        var dailyAttendanceWithLeave = dailyAttendance.Select(da => {
            var dt = DateOnly.Parse(da.date);
            var lm = dailyLeaveMap.TryGetValue(dt, out var lv) ? lv : new Dictionary<string, int>();
            return new {
                da.date, da.day, da.present, da.late, da.absent, da.onLeave, da.total,
                sl = lm.TryGetValue("Sick Leave",      out var sl) ? sl : 0,
                cl = lm.TryGetValue("Casual Leave",    out var cl) ? cl : 0,
                al = lm.TryGetValue("Annual Leave",    out var al) ? al : 0,
                ul = lm.TryGetValue("Unpaid Leave",    out var ul) ? ul : 0,
                ml = lm.TryGetValue("Maternity Leave", out var ml) ? ml : 0,
                pl = lm.TryGetValue("Paternity Leave", out var pl) ? pl : 0,
                ol = lm.TryGetValue("Other Leave",     out var ol) ? ol : 0,
            };
        }).ToList();

        // Keep monthlyAttendance for backward-compat (other charts may use it)
        var sixMonthsAgo = DateOnly.FromDateTime(DateTime.Today.AddMonths(-5));
        var monthlyRaw   = await db.Attendances
            .Where(a => a.AttendanceDate >= sixMonthsAgo)
            .Select(a => new { a.AttendanceDate, a.Status }).ToListAsync();

        var monthlyAttendance = monthlyRaw
            .GroupBy(a => new { a.AttendanceDate.Year, a.AttendanceDate.Month })
            .Select(g => new {
                month   = $"{g.Key.Year}-{g.Key.Month:D2}",
                present = g.Count(x => x.Status == "Present"),
                absent  = g.Count(x => x.Status == "Absent"),
                late    = g.Count(x => x.Status == "Late"),
                onLeave = g.Count(x => x.Status == "On Leave")
            })
            .OrderBy(x => x.month).ToList();

        var leavesByType = await db.LeaveRequests
            .GroupBy(l => l.LeaveType)
            .Select(g => new { leaveType = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count).ToListAsync();

        var adminEmpId    = GetCurrentEmpId();
        var adminTodayAtt = adminEmpId > 0
            ? await db.Attendances.FirstOrDefaultAsync(a => a.EmployeeId == adminEmpId && a.AttendanceDate == today)
            : null;

        return Ok(new {
            totalEmployees       = totalEmp,
            activeEmployees      = activeEmp,
            inactiveEmployees    = inactiveEmp,
            totalDepartments     = totalDepts,
            pendingLeaves,       totalLeaves,
            attendancePercentage = attPct,
            presentToday,        onLeaveToday,  absentToday,
            todayLeaveBreakdown,
            employeesByDept      = empByDept,
            dailyAttendance = dailyAttendanceWithLeave,  // includes per-type leave counts
            monthlyAttendance,                       // kept for backward compat
            currentMonth         = today.ToString("MMMM yyyy"),
            leavesByType,
            myAttendance = new {
                checkedInToday = adminTodayAtt != null,
                checkInTime    = adminTodayAtt?.CheckInTime?.ToString(@"HH\:mm"),
                checkOutTime   = adminTodayAtt?.CheckOutTime?.ToString(@"HH\:mm"),
                todayStatus    = adminTodayAtt?.Status ?? "Not Marked",
                isSunday       = DateTime.Today.DayOfWeek == DayOfWeek.Sunday
            }
        });
    }

    // ── Employee Stats ─────────────────────────────────────
    // FIX 5: Add attendance percentage + trend + average working hours
    [HttpGet("employee")]
    public async Task<IActionResult> GetEmployeeStats()
    {
        var empId = GetCurrentEmpId();
        if (empId == 0)
            return Ok(new { workingDays = 0, presentDays = 0, lateDays = 0, attendancePercentage = 0, trend = "stable",
                leaveBalance = 0, pendingLeaves = 0, checkedInToday = false, todayStatus = "Not Marked",
                isSunday = DateTime.Today.DayOfWeek == DayOfWeek.Sunday, message = "No employee record linked." });

        var today      = DateOnly.FromDateTime(DateTime.Today);
        // FIX: Only count attendance records for days when the employee was active.
        // If the employee is currently inactive, we still show their historical stats
        // but exclude any records created after they became inactive (stray records).
        // We achieve this by scoping all counts to records where the linked employee
        // is not deleted — and for the percentage, use only records with a meaningful
        // status (Present / Late / Absent / On Leave) so phantom rows don't skew it.
        var workingDays   = await db.Attendances.CountAsync(a => a.EmployeeId == empId);
        var presentDays   = await db.Attendances.CountAsync(a => a.EmployeeId == empId && a.Status == "Present");
        var lateDays      = await db.Attendances.CountAsync(a => a.EmployeeId == empId && a.Status == "Late");
        var onLeaveDays   = await db.Attendances.CountAsync(a => a.EmployeeId == empId && a.Status == "On Leave");
        var absentDays    = await db.Attendances.CountAsync(a => a.EmployeeId == empId && a.Status == "Absent");
        var leaveBalance  = await db.LeaveRequests.CountAsync(a => a.EmployeeId == empId && a.Status == "Approved");
        var pendingLeaves = await db.LeaveRequests.CountAsync(a => a.EmployeeId == empId && a.Status == "Pending");
        var todayAtt      = await db.Attendances.FirstOrDefaultAsync(a => a.EmployeeId == empId && a.AttendanceDate == today);

        // FIX: Use only explicitly-tracked days as the denominator (Present + Late + Absent + OnLeave).
        // This prevents any extra/unclassified rows from inflating the percentage.
        var trackedDays  = presentDays + lateDays + absentDays + onLeaveDays;
        var attendedDays = presentDays + lateDays;
        var attendancePct = trackedDays > 0 ? Math.Round((double)attendedDays / trackedDays * 100, 1) : 0;

        // FIX 5: This month vs last month trend
        var now    = DateTime.UtcNow;
        var mStart = new DateOnly(now.Year, now.Month, 1);
        var mEnd   = new DateOnly(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month));
        var lmStart = mStart.AddMonths(-1);
        var lmEnd   = mStart.AddDays(-1);

        var thisMonthWorked  = await db.Attendances.CountAsync(a => a.EmployeeId == empId && a.AttendanceDate >= mStart && a.AttendanceDate <= today && (a.Status == "Present" || a.Status == "Late"));
        var thisMonthTotal   = await db.Attendances.CountAsync(a => a.EmployeeId == empId && a.AttendanceDate >= mStart && a.AttendanceDate <= today);
        var lastMonthWorked  = await db.Attendances.CountAsync(a => a.EmployeeId == empId && a.AttendanceDate >= lmStart && a.AttendanceDate <= lmEnd && (a.Status == "Present" || a.Status == "Late"));
        var lastMonthTotal   = await db.Attendances.CountAsync(a => a.EmployeeId == empId && a.AttendanceDate >= lmStart && a.AttendanceDate <= lmEnd);

        var thisMonthPct = thisMonthTotal > 0 ? Math.Round((double)thisMonthWorked / thisMonthTotal * 100, 1) : 0;
        var lastMonthPct = lastMonthTotal > 0 ? Math.Round((double)lastMonthWorked / lastMonthTotal * 100, 1) : 0;
        var trend        = thisMonthPct > lastMonthPct ? "up" : thisMonthPct < lastMonthPct ? "down" : "stable";
        var trendDiff    = Math.Abs(Math.Round(thisMonthPct - lastMonthPct, 1));

        // FIX 5: Average working hours (from records that have both check-in and check-out)
        var hoursData = await db.Attendances
            .Where(a => a.EmployeeId == empId && a.CheckInTime.HasValue && a.CheckOutTime.HasValue)
            .Select(a => new { In = a.CheckInTime!.Value, Out = a.CheckOutTime!.Value })
            .ToListAsync();

        var avgHours = hoursData.Count > 0
            ? Math.Round(hoursData.Average(h => (h.Out - h.In).TotalHours), 1)
            : 0.0;

        // Leave balance for this month
        var usedThisMonth = await db.LeaveRequests
            .Where(l => l.EmployeeId == empId && (l.Status == "Approved" || l.Status == "Pending") &&
                        l.StartDate <= mEnd && l.EndDate >= mStart)
            .SumAsync(l => (l.EndDate.DayNumber - l.StartDate.DayNumber) + 1);
        var emp           = await db.Employees.FindAsync(empId);
        var monthlyLimit  = emp?.MonthlyLeaveBalance ?? 3;
        var remainLeave   = Math.Max(0, monthlyLimit - usedThisMonth);

        return Ok(new {
            workingDays, presentDays, lateDays, onLeaveDays, absentDays,
            attendedDays, attendancePercentage = attendancePct,
            thisMonthPercentage = thisMonthPct,
            lastMonthPercentage = lastMonthPct,
            trend, trendDiff,
            averageWorkingHours = avgHours,
            leaveBalance, pendingLeaves,
            monthlyLeaveLimit    = monthlyLimit,
            usedLeavesThisMonth  = usedThisMonth,
            remainingLeaveBalance = remainLeave,
            checkedInToday = todayAtt != null,
            checkInTime    = todayAtt?.CheckInTime?.ToString(@"HH\:mm"),
            checkOutTime   = todayAtt?.CheckOutTime?.ToString(@"HH\:mm"),
            todayStatus    = todayAtt?.Status ?? "Not Marked",
            isSunday       = DateTime.Today.DayOfWeek == DayOfWeek.Sunday,
            isOnLeaveToday = todayAtt?.Status == "On Leave"
        });
    }

    // ── Manager Dashboard ───────────────────────────────────
    [HttpGet("manager")]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> GetManagerStats()
    {
        var today        = DateOnly.FromDateTime(DateTime.Today);
        var managerEmpId = GetCurrentEmpId();
        var mgr          = managerEmpId > 0 ? await db.Employees.Include(e => e.Department).FirstOrDefaultAsync(e => e.EmployeeId == managerEmpId) : null;
        var deptId       = mgr?.DepartmentId;

        // Only count attendance for active (non-inactive, non-deleted) team members
        var teamQ = db.Employees.Where(e => e.Status == "Active" && !e.IsDeleted && !e.IsInactive);
        if (deptId != null) teamQ = teamQ.Where(e => e.DepartmentId == deptId);

        var totalTeam    = await teamQ.CountAsync();
        var teamIds      = await teamQ.Select(e => e.EmployeeId).ToListAsync();

        var presentToday = await db.Attendances.CountAsync(a => a.AttendanceDate == today && teamIds.Contains(a.EmployeeId) && (a.Status == "Present" || a.Status == "Late"));
        var onLeaveToday = await db.Attendances.CountAsync(a => a.AttendanceDate == today && teamIds.Contains(a.EmployeeId) && a.Status == "On Leave");
        var absentToday  = await db.Attendances.CountAsync(a => a.AttendanceDate == today && teamIds.Contains(a.EmployeeId) && a.Status == "Absent");
        var pendingLeaves = await db.LeaveRequests.CountAsync(l => teamIds.Contains(l.EmployeeId) && l.Status == "Pending");

        var managerTodayAtt = managerEmpId > 0
            ? await db.Attendances.FirstOrDefaultAsync(a => a.EmployeeId == managerEmpId && a.AttendanceDate == today) : null;

        return Ok(new {
            totalTeam, presentToday, onLeaveToday, absentToday, pendingLeaves,
            departmentName = mgr?.Department?.DepartmentName,
            myAttendance = new {
                checkedInToday = managerTodayAtt != null,
                checkInTime    = managerTodayAtt?.CheckInTime?.ToString(@"HH\:mm"),
                checkOutTime   = managerTodayAtt?.CheckOutTime?.ToString(@"HH\:mm"),
                todayStatus    = managerTodayAtt?.Status ?? "Not Marked",
                isSunday       = DateTime.Today.DayOfWeek == DayOfWeek.Sunday
            }
        });
    }
}