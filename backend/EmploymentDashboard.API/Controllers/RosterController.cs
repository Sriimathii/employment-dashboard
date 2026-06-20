using EmploymentDashboard.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class RosterController(AppDbContext db, IHttpContextAccessor http) : ControllerBase
{
    private int GetCurrentEmpId()
    {
        var c = http.HttpContext?.User.FindFirst("employeeId")?.Value;
        return int.TryParse(c, out var id) ? id : 0;
    }

    private string CurrentRole =>
        User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";

    private static bool IsRemoteLocation(string? locName)
    {
        if (locName == null) return false;
        var l = locName.ToLower();
        return l.Contains("remote") || l.Contains("field");
    }

    // ── Compute attendance code ───────────────────────────────
    // FIX: receives isFutureDate — future dates return null (blank),
    //      EXCEPT Sunday(WO) and Holidays(H) which always show.
    //      Also receives joiningDate — dates before joining return null.
    private static string? ComputeCode(
        DateOnly  date,
        AttendanceRecord? att,
        string?   leaveType,
        bool      isHoliday,
        bool      isFutureDate,
        DateOnly? joiningDate)
    {
        // ── WO and H always show, even in the future ──────────
        if (date.DayOfWeek == DayOfWeek.Sunday) return "WO";
        if (isHoliday)                          return "H";

        // ── Dates before employee joined → blank ──────────────
        if (joiningDate.HasValue && date < joiningDate.Value) return null;

        // ── Future dates → blank ──────────────────────────────
        if (isFutureDate) return null;

        // ── Past / today: compute status ──────────────────────
        if (leaveType != null) return MapLeaveCode(leaveType);
        if (att       == null) return "A";    // no-show on a past working day

        double hours = att.WorkingHours;

        if (IsRemoteLocation(att.CheckInLocationName))
        {
            if (hours > 0 && hours < 4) return "HD";
            if (hours >= 9)             return "OT";
            return "OD";
        }

        if (hours > 0 && hours < 4) return "HD";
        if (hours >= 9)             return "OT";
        if (att.IsLate)             return "L";
        return "P";
    }

    private static string MapLeaveCode(string leaveType)
    {
        return leaveType.ToLower() switch {
            var t when t.Contains("casual")    => "CL",
            var t when t.Contains("maternity") => "ML",
            var t when t.Contains("paternity") => "PL",
            var t when t.Contains("unpaid")    => "UL",
            var t when t.Contains("annual")    => "AL",
            var t when t.Contains("sick")      => "SL",
            _                                  => "OL"
        };
    }

    // ── Shared roster builder ─────────────────────────────────
    // Used by GetRoster, GetSummary, and ExportRoster
    public static async Task<RosterData> BuildRosterAsync(
        AppDbContext db,
        int    year,
        int    month,
        int?   departmentId,
        string search,
        string currentRole,
        int    currentEmpId,
        // For report export: allow a custom date range within the month
        int?   fromDay = null,
        int?   toDay   = null)
    {
        // Manager sees only own dept
        if (currentRole == "Manager")
        {
            var mgrEmp = await db.Employees.FindAsync(currentEmpId);
            departmentId = mgrEmp?.DepartmentId;
        }

        var monthStart  = new DateOnly(year, month, 1);
        var monthEnd    = new DateOnly(year, month, DateTime.DaysInMonth(year, month));
        var today       = DateOnly.FromDateTime(DateTime.Today);

        // Apply custom day range (for report export)
        var rangeStart = fromDay.HasValue ? new DateOnly(year, month, fromDay.Value) : monthStart;
        var rangeEnd   = toDay.HasValue   ? new DateOnly(year, month, Math.Min(toDay.Value, monthEnd.Day)) : monthEnd;
        int daysInRange = (rangeEnd.DayNumber - rangeStart.DayNumber) + 1;

        // Load employees
        var empQ = db.Employees
            .Include(e => e.Department)
            .Include(e => e.Role)
            .Where(e => !e.IsDeleted && e.Status == "Active");
        if (departmentId.HasValue)     empQ = empQ.Where(e => e.DepartmentId == departmentId);
        if (!string.IsNullOrWhiteSpace(search))
            empQ = empQ.Where(e => e.FullName.Contains(search) || e.EmployeeCode.Contains(search));

        var employees = await empQ.OrderBy(e => e.FullName).ToListAsync();
        var empIds    = employees.Select(e => e.EmployeeId).ToList();

        // Load attendance, leaves, holidays
        var attRecords = await db.Attendances
            .Where(a => empIds.Contains(a.EmployeeId) &&
                        a.AttendanceDate >= rangeStart &&
                        a.AttendanceDate <= rangeEnd)
            .ToListAsync();

        var leaves = await db.LeaveRequests
            .Where(l => empIds.Contains(l.EmployeeId) &&
                        l.Status == "Approved" &&
                        l.StartDate <= rangeEnd &&
                        l.EndDate   >= rangeStart)
            .ToListAsync();

        var holidays = await db.Holidays
            .Where(h => h.Year == year &&
                        h.HolidayDate >= rangeStart &&
                        h.HolidayDate <= rangeEnd)
            .Select(h => h.HolidayDate).ToListAsync();
        var holidaySet = holidays.ToHashSet();

        // Day headers
        var dayHeaders = new List<DayHeader>();
        for (int d = rangeStart.Day; d <= rangeEnd.Day; d++)
        {
            var date = new DateOnly(year, month, d);
            dayHeaders.Add(new DayHeader {
                Day       = d,
                Date      = date.ToString("yyyy-MM-dd"),
                DayName   = date.ToString("ddd"),
                IsSunday  = date.DayOfWeek == DayOfWeek.Sunday,
                IsHoliday = holidaySet.Contains(date),
                IsFuture  = date > today
            });
        }

        // Build rows
        var rows = new List<RosterRow>();
        foreach (var emp in employees)
        {
            var empAtts = attRecords
                .Where(a => a.EmployeeId == emp.EmployeeId)
                .ToDictionary(a => a.AttendanceDate);
            var empLeaves = leaves.Where(l => l.EmployeeId == emp.EmployeeId).ToList();

            // Optional: joining date for blanking days before they joined
            DateOnly? joiningDate = emp.JoiningDate == default ? null : emp.JoiningDate;

            var days = new Dictionary<int, string?>();
            int presentCount = 0, absentCount = 0, lateCount = 0;
            int odCount = 0, hdCount = 0, otCount = 0;
            int clCount = 0, mlCount = 0, plCount = 0, ulCount = 0;
            int alCount = 0, slCount = 0, olCount = 0;
            int woCount = 0, hCount = 0;
            double totalWorkingHours = 0;

            foreach (var dh in dayHeaders)
            {
                var date     = new DateOnly(year, month, dh.Day);
                var attRec   = empAtts.TryGetValue(date, out var a) ? a : null;
                var leaveRec = empLeaves.FirstOrDefault(l => l.StartDate <= date && l.EndDate >= date);
                bool isHol   = holidaySet.Contains(date);

                double wh = 0; bool isLate = false; string? locName = null;
                if (attRec != null) {
                    if (attRec.CheckInTime.HasValue && attRec.CheckOutTime.HasValue)
                        wh = (attRec.CheckOutTime.Value - attRec.CheckInTime.Value).TotalHours;
                    isLate  = attRec.CheckInTime.HasValue && attRec.CheckInTime.Value > new TimeOnly(10, 0);
                    locName = attRec.CheckInLocationName;
                }

                var ar = attRec != null ? new AttendanceRecord {
                    WorkingHours = wh, IsLate = isLate, CheckInLocationName = locName
                } : null;

                // KEY FIX: pass isFutureDate and joiningDate to ComputeCode
                var code = ComputeCode(date, ar, leaveRec?.LeaveType, isHol, dh.IsFuture, joiningDate);
                days[dh.Day] = code; // null = blank

                if (code == null) continue;
                switch (code) {
                    case "P":  presentCount++; totalWorkingHours += wh; break;
                    case "L":  lateCount++;    presentCount++;   totalWorkingHours += wh; break;
                    case "OD": odCount++;      totalWorkingHours += wh; break;
                    case "HD": hdCount++;      totalWorkingHours += wh; break;
                    case "OT": otCount++;      presentCount++;   totalWorkingHours += wh; break;
                    case "A":  absentCount++;  break;
                    case "CL": clCount++;      break;
                    case "ML": mlCount++;      break;
                    case "PL": plCount++;      break;
                    case "UL": ulCount++;      break;
                    case "AL": alCount++;      break;
                    case "SL": slCount++;      break;
                    case "OL": olCount++;      break;
                    case "WO": woCount++;      break;
                    case "H":  hCount++;       break;
                }
            }

            int workingDays  = dayHeaders.Count - woCount - hCount;
            int attendedDays = presentCount + odCount + hdCount + otCount;
            double attPct    = workingDays > 0
                ? Math.Round((double)attendedDays / workingDays * 100, 1) : 0;

            rows.Add(new RosterRow {
                EmployeeId     = emp.EmployeeId,
                EmployeeCode   = emp.EmployeeCode,
                EmployeeName   = emp.FullName,
                Designation    = emp.Role?.RoleName ?? "",
                DepartmentName = emp.Department?.DepartmentName ?? "",
                JoiningDate    = emp.JoiningDate.ToString("yyyy-MM-dd"),
                Days           = days,
                Summary = new RosterSummary {
                    Present  = presentCount, Absent   = absentCount,
                    Late     = lateCount,    OD       = odCount,
                    HD       = hdCount,      OT       = otCount,
                    CL       = clCount,      ML       = mlCount,
                    PL       = plCount,      UL       = ulCount,
                    AL       = alCount,      SL       = slCount,
                    OL       = olCount,      WO       = woCount,
                    Holiday  = hCount,
                    WorkingDays          = workingDays,
                    AttendedDays         = attendedDays,
                    TotalWorkingHours    = Math.Round(totalWorkingHours, 1),
                    AttendancePercentage = attPct
                }
            });
        }

        return new RosterData {
            Year       = year, Month = month,
            MonthName  = new DateOnly(year, month, 1).ToString("MMMM yyyy"),
            DaysInMonth = daysInRange,
            DayHeaders = dayHeaders,
            Holidays   = holidays.Select(h => h.ToString("yyyy-MM-dd")).ToList(),
            Employees  = rows
        };
    }

    // ── GET /api/attendance/roster ────────────────────────────
    [HttpGet("roster")]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> GetRoster(
        [FromQuery] int    year,
        [FromQuery] int    month,
        [FromQuery] int?   departmentId = null,
        [FromQuery] string search       = "")
    {
        var data = await BuildRosterAsync(db, year, month, departmentId, search,
                                          CurrentRole, GetCurrentEmpId());

        // Serialize with null codes as empty string for JSON
        return Ok(new {
            data.Year, data.Month, data.MonthName, data.DaysInMonth,
            dayHeaders = data.DayHeaders.Select(h => new {
                h.Day, h.Date, h.DayName, h.IsSunday, h.IsHoliday, h.IsFuture
            }),
            data.Holidays,
            employees = data.Employees.Select(e => new {
                e.EmployeeId, e.EmployeeCode, e.EmployeeName,
                e.Designation, e.DepartmentName, e.JoiningDate,
                days    = e.Days.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value ?? ""),
                summary = e.Summary
            })
        });
    }

    // ── GET /api/attendance/summary ───────────────────────────
    [HttpGet("summary")]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int  year,
        [FromQuery] int  month,
        [FromQuery] int? departmentId = null)
    {
        return await GetRoster(year, month, departmentId, "");
    }
}

// ── Data models ───────────────────────────────────────────────
public class AttendanceRecord
{
    public double  WorkingHours        { get; set; }
    public bool    IsLate              { get; set; }
    public string? CheckInLocationName { get; set; }
}

public class DayHeader
{
    public int    Day       { get; set; }
    public string Date      { get; set; } = "";
    public string DayName   { get; set; } = "";
    public bool   IsSunday  { get; set; }
    public bool   IsHoliday { get; set; }
    public bool   IsFuture  { get; set; }
}

public class RosterSummary
{
    public int    Present { get; set; } public int    Absent  { get; set; }
    public int    Late    { get; set; } public int    OD      { get; set; }
    public int    HD      { get; set; } public int    OT      { get; set; }
    public int    CL      { get; set; } public int    ML      { get; set; }
    public int    PL      { get; set; } public int    UL      { get; set; }
    public int    AL      { get; set; } public int    SL      { get; set; }
    public int    OL      { get; set; } public int    WO      { get; set; }
    public int    Holiday { get; set; }
    public int    WorkingDays          { get; set; }
    public int    AttendedDays         { get; set; }
    public double TotalWorkingHours    { get; set; }
    public double AttendancePercentage { get; set; }
}

public class RosterRow
{
    public int     EmployeeId     { get; set; }
    public string  EmployeeCode   { get; set; } = "";
    public string  EmployeeName   { get; set; } = "";
    public string  Designation    { get; set; } = "";
    public string  DepartmentName { get; set; } = "";
    public string  JoiningDate    { get; set; } = "";
    public Dictionary<int, string?> Days { get; set; } = new();
    public RosterSummary Summary  { get; set; } = new();
}

public class RosterData
{
    public int    Year        { get; set; }
    public int    Month       { get; set; }
    public string MonthName   { get; set; } = "";
    public int    DaysInMonth { get; set; }
    public List<DayHeader>   DayHeaders { get; set; } = new();
    public List<string>      Holidays   { get; set; } = new();
    public List<RosterRow>   Employees  { get; set; } = new();
}