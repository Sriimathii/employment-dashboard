using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.DTOs.Attendance;
using EmploymentDashboard.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController(AppDbContext db, IHttpContextAccessor http) : ControllerBase
{
    private int GetCurrentEmpId()
    {
        var claim = http.HttpContext?.User.FindFirst("employeeId")?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private static string DetermineStatus(TimeOnly checkInTime)
    {
        var presentCutoff = new TimeOnly(10, 0);
        return checkInTime <= presentCutoff ? "Present" : "Late";
    }

    // ── Haversine distance in metres ──────────────────────────
    private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    // ── Load ALL locations from AppSettings ───────────────────
    // Returns list of active locations; GeoEnabled = true if ANY location is enabled
    private async Task<(bool GeoEnabled, List<GeoLocation> Locations)> GetAllGeoLocationsAsync()
    {
        var settings = await db.AppSettings
            .Where(s => s.Key.StartsWith("geo_"))
            .ToDictionaryAsync(s => s.Key, s => s.Value);

        var geoEnabled = settings.TryGetValue("geo_enabled", out var en) && en == "true";
        var locations  = new List<GeoLocation>();

        // Load up to 4 locations: geo_loc_1 … geo_loc_4
        for (int i = 1; i <= 4; i++)
        {
            var prefix     = $"geo_loc_{i}";
            var locEnabled = settings.TryGetValue($"{prefix}_enabled", out var le) && le == "true";
            if (!locEnabled) continue;

            if (!settings.TryGetValue($"{prefix}_lat", out var latStr)) continue;
            if (!settings.TryGetValue($"{prefix}_lng", out var lngStr)) continue;
            if (!double.TryParse(latStr, System.Globalization.CultureInfo.InvariantCulture, out var lat)) continue;
            if (!double.TryParse(lngStr, System.Globalization.CultureInfo.InvariantCulture, out var lng)) continue;

            settings.TryGetValue($"{prefix}_radius", out var radStr);
            double.TryParse(radStr, System.Globalization.CultureInfo.InvariantCulture, out var radius);
            if (radius < 50) radius = 200;

            settings.TryGetValue($"{prefix}_name", out var name);

            locations.Add(new GeoLocation {
                Index   = i,
                Name    = name ?? $"Office Location {i}",
                Lat     = lat, Lng = lng,
                Radius  = radius
            });
        }

        return (geoEnabled && locations.Count > 0, locations);
    }

    // GET /api/attendance/geo-settings — all authenticated users
    [HttpGet("geo-settings")]
    public async Task<IActionResult> GetGeoSettings()
    {
        var settings = await db.AppSettings
            .Where(s => s.Key.StartsWith("geo_"))
            .ToDictionaryAsync(s => s.Key, s => s.Value);

        bool geoEnabled = settings.TryGetValue("geo_enabled", out var en) && en == "true";

        var locations = new List<object>();
        for (int i = 1; i <= 4; i++)
        {
            var p = $"geo_loc_{i}";
            settings.TryGetValue($"{p}_name",    out var name);
            settings.TryGetValue($"{p}_lat",     out var lat);
            settings.TryGetValue($"{p}_lng",     out var lng);
            settings.TryGetValue($"{p}_radius",  out var radius);
            settings.TryGetValue($"{p}_enabled", out var locEnabled);

            locations.Add(new {
                index   = i,
                name    = name    ?? (i == 1 ? "Main Office" : i == 2 ? "Branch Office" : i == 3 ? "Remote Hub" : "Field Office"),
                lat     = lat     ?? "0",
                lng     = lng     ?? "0",
                radius  = radius  ?? "200",
                enabled = locEnabled == "true"
            });
        }

        return Ok(new { geoEnabled, locations });
    }

    // PUT /api/attendance/geo-settings — Admin only
    [HttpPut("geo-settings")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> SaveGeoSettings([FromBody] MultiGeoSettingsDto dto)
    {
        await UpsertSetting("geo_enabled", dto.GeoEnabled.ToString().ToLower());

        for (int i = 0; i < dto.Locations.Count && i < 4; i++)
        {
            var loc = dto.Locations[i];
            var n   = i + 1;
            var p   = $"geo_loc_{n}";
            await UpsertSetting($"{p}_name",    loc.Name    ?? $"Office Location {n}");
            await UpsertSetting($"{p}_lat",     loc.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture));
            await UpsertSetting($"{p}_lng",     loc.Lng.ToString(System.Globalization.CultureInfo.InvariantCulture));
            await UpsertSetting($"{p}_radius",  loc.Radius.ToString(System.Globalization.CultureInfo.InvariantCulture));
            await UpsertSetting($"{p}_enabled", loc.Enabled.ToString().ToLower());
        }

        await db.SaveChangesAsync();
        var activeCount = dto.Locations.Count(l => l.Enabled);
        return Ok(new { message = $"Geo-fencing settings saved. {activeCount} active location(s) configured." });
    }

    // GET all attendance (Admin / Manager)
    [HttpGet]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int?    employeeId,
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? status,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20)
    {
        var q = db.Attendances
            .Include(a => a.Employee).ThenInclude(e => e.Department)
            .Where(a => !a.Employee.IsDeleted).AsQueryable();

        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (role == "Manager") {
            var mEmpId = GetCurrentEmpId();
            var mgr    = await db.Employees.FindAsync(mEmpId);
            if (mgr?.DepartmentId != null)
                q = q.Where(a => a.Employee.DepartmentId == mgr.DepartmentId);
        }

        if (employeeId.HasValue) q = q.Where(a => a.EmployeeId == employeeId);
        if (!string.IsNullOrEmpty(from) && DateOnly.TryParse(from, out var fd))
            q = q.Where(a => a.AttendanceDate >= fd);
        if (!string.IsNullOrEmpty(to) && DateOnly.TryParse(to, out var td))
            q = q.Where(a => a.AttendanceDate <= td);
        if (!string.IsNullOrEmpty(status))
            q = q.Where(a => a.Status == status);

        var total = await q.CountAsync();
        var data  = await q
            .OrderByDescending(a => a.AttendanceDate).ThenBy(a => a.Employee.FullName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new {
                a.AttendanceId, a.EmployeeId,
                EmployeeName   = a.Employee.FullName,
                EmployeeCode   = a.Employee.EmployeeCode,
                DepartmentName = a.Employee.Department != null ? a.Employee.Department.DepartmentName : "",
                AttendanceDate = a.AttendanceDate.ToString("yyyy-MM-dd"),
                CheckInTime    = a.CheckInTime.HasValue  ? a.CheckInTime.Value.ToString("HH:mm")  : null,
                CheckOutTime   = a.CheckOutTime.HasValue ? a.CheckOutTime.Value.ToString("HH:mm") : null,
                a.Status,
                WorkingHours   = a.CheckInTime != null && a.CheckOutTime != null
                    ? Math.Round((a.CheckOutTime.Value - a.CheckInTime.Value).TotalHours, 2) : (double?)null,
                IsAutoCheckout = a.CheckOutTime == new TimeOnly(23, 59),
                a.CheckInLatitude, a.CheckInLongitude,
                a.CheckOutLatitude, a.CheckOutLongitude,
                CheckInLocationName = a.CheckInLocationName
            }).ToListAsync();

        return Ok(new { data, total, page, pageSize });
    }

    // GET my attendance
    [HttpGet("my")]
    public async Task<IActionResult> GetMy([FromQuery] int page = 1, [FromQuery] int pageSize = 15)
    {
        var empId = GetCurrentEmpId();
        if (empId == 0) return BadRequest(new { message = "No employee record linked." });
        var total = await db.Attendances.CountAsync(a => a.EmployeeId == empId);
        var data  = await db.Attendances
            .Where(a => a.EmployeeId == empId)
            .OrderByDescending(a => a.AttendanceDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new {
                a.AttendanceId, a.EmployeeId,
                AttendanceDate = a.AttendanceDate.ToString("yyyy-MM-dd"),
                CheckInTime    = a.CheckInTime.HasValue  ? a.CheckInTime.Value.ToString("HH:mm")  : null,
                CheckOutTime   = a.CheckOutTime.HasValue ? a.CheckOutTime.Value.ToString("HH:mm") : null,
                a.Status,
                WorkingHours   = a.CheckInTime != null && a.CheckOutTime != null
                    ? Math.Round((a.CheckOutTime.Value - a.CheckInTime.Value).TotalHours, 2) : (double?)null,
                IsAutoCheckout = a.CheckOutTime == new TimeOnly(23, 59),
                a.CheckInLatitude, a.CheckInLongitude,
                a.CheckOutLatitude, a.CheckOutLongitude,
                CheckInLocationName = a.CheckInLocationName
            }).ToListAsync();
        return Ok(new { data, total, page, pageSize });
    }

    // POST check-in — validates against ALL active geo locations
    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInDto? dto)
    {
        var empId = GetCurrentEmpId();
        if (empId == 0) return BadRequest(new { message = "No employee record linked." });
        var emp = await db.Employees.FindAsync(empId);
        if (emp == null) return NotFound();
        if (emp.IsInactive) return BadRequest(new { message = "Your account is inactive. Check-in is disabled." });
        if (DateTime.Today.DayOfWeek == DayOfWeek.Sunday)
            return BadRequest(new { message = "Today is Sunday — a public holiday.", isSunday = true });

        var today = DateOnly.FromDateTime(DateTime.Today);
        var now   = TimeOnly.FromDateTime(DateTime.Now);

        var existing = await db.Attendances.FirstOrDefaultAsync(a => a.EmployeeId == empId && a.AttendanceDate == today);
        if (existing != null)
            return Conflict(new {
                message      = $"Already checked in today at {existing.CheckInTime:HH\\:mm}.",
                checkInTime  = existing.CheckInTime?.ToString(@"HH\:mm"),
                checkOutTime = existing.CheckOutTime?.ToString(@"HH\:mm"),
                status       = existing.Status
            });

        double? checkInLat = dto?.Latitude;
        double? checkInLng = dto?.Longitude;
        string? matchedLocationName = null;

        // ── Multi-location geo-fencing validation ─────────────
        var (geoEnabled, locations) = await GetAllGeoLocationsAsync();

        if (geoEnabled)
        {
            if (checkInLat == null || checkInLng == null)
                return BadRequest(new {
                    message     = "Location permission is required to check in. Please allow GPS access in your browser.",
                    requiresGeo = true
                });

            // Check if user is within range of ANY active location
            bool withinAny = false;
            double closestDist = double.MaxValue;
            string closestName = "";

            foreach (var loc in locations)
            {
                var dist = HaversineMeters(loc.Lat, loc.Lng, checkInLat.Value, checkInLng.Value);
                if (dist < closestDist) { closestDist = dist; closestName = loc.Name; }
                if (dist <= loc.Radius)
                {
                    withinAny           = true;
                    matchedLocationName = loc.Name;
                    break; // found a valid location — stop checking
                }
            }

            if (!withinAny)
            {
                var locList = string.Join(", ", locations.Select(l => l.Name));
                return BadRequest(new {
                    message    = $"Attendance can only be marked from an authorized office location. You are {(int)closestDist}m from the nearest location ({closestName}). Authorized locations: {locList}.",
                    distanceM  = (int)closestDist,
                    outsideGeo = true,
                    nearestLocation = closestName,
                    authorizedLocations = locations.Select(l => l.Name).ToList()
                });
            }
        }

        var status = DetermineStatus(now);

        var onLeave = await db.LeaveRequests.AnyAsync(l =>
            l.EmployeeId == empId && l.Status == "Approved" &&
            l.StartDate  <= today && l.EndDate >= today);
        if (onLeave) status = "On Leave";

        var att = new Attendance {
            EmployeeId          = empId,   AttendanceDate      = today,
            CheckInTime         = now,     Status              = status,
            CheckInLatitude     = checkInLat, CheckInLongitude = checkInLng,
            CheckInLocationName = matchedLocationName
        };
        db.Attendances.Add(att);
        await db.SaveChangesAsync();

        var locMsg   = matchedLocationName != null ? $" ({matchedLocationName})" : "";
        var message  = status switch {
            "Present"  => $"✅ Checked in at {now:HH:mm}{locMsg}. Marked as Present.",
            "Late"     => $"⚠️ Checked in at {now:HH:mm}{locMsg} — after 10:00 AM. Marked as Late.",
            "On Leave" => $"🏖 Checked in at {now:HH:mm}. You have approved leave today.",
            _          => $"Checked in at {now:HH:mm}{locMsg}."
        };

        return Ok(new {
            attendanceId        = att.AttendanceId, status,
            checkInTime         = now.ToString(@"HH\:mm"),
            checkInLocationName = matchedLocationName,
            isLate              = status == "Late",
            isAbsent            = false,
            message
        });
    }

    // POST check-out — location stored for audit, not validated
    [HttpPost("check-out")]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutDto? dto)
    {
        var empId = GetCurrentEmpId();
        if (empId == 0) return BadRequest(new { message = "No employee record linked." });
        var emp = await db.Employees.FindAsync(empId);
        if (emp?.IsInactive == true) return BadRequest(new { message = "Your account is inactive." });

        var today = DateOnly.FromDateTime(DateTime.Today);
        var att   = await db.Attendances.FirstOrDefaultAsync(a => a.EmployeeId == empId && a.AttendanceDate == today);
        if (att == null) return NotFound(new { message = "No check-in found for today. Please check in first." });
        if (att.CheckOutTime.HasValue)
            return Conflict(new { message = $"Already checked out at {att.CheckOutTime.Value:HH\\:mm}.", checkOutTime = att.CheckOutTime.Value.ToString(@"HH\:mm") });

        var now = TimeOnly.FromDateTime(DateTime.Now);
        att.CheckOutTime  = now;
        if (dto?.Latitude  != null) att.CheckOutLatitude  = dto.Latitude;
        if (dto?.Longitude != null) att.CheckOutLongitude = dto.Longitude;
        var workingHours = att.CheckInTime.HasValue ? Math.Round((now - att.CheckInTime.Value).TotalHours, 2) : 0;
        await db.SaveChangesAsync();

        return Ok(new {
            checkOutTime = now.ToString(@"HH\:mm"),
            checkInTime  = att.CheckInTime?.ToString(@"HH\:mm"),
            workingHours, status = att.Status,
            message = $"👋 Checked out at {now:HH:mm}. Total: {workingHours:F1} hours worked today."
        });
    }

    // POST mark (Admin/Manager manual)
    [HttpPost("mark")]
    [Authorize(Policy = "AdminOrManager")]
    public async Task<IActionResult> Mark([FromBody] MarkAttendanceDto dto)
    {
        var existing = await db.Attendances.FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.AttendanceDate == dto.AttendanceDate);
        if (existing != null) {
            existing.Status       = dto.Status;
            existing.CheckInTime  = dto.CheckInTime  != null ? TimeOnly.Parse(dto.CheckInTime)  : null;
            existing.CheckOutTime = dto.CheckOutTime != null ? TimeOnly.Parse(dto.CheckOutTime) : null;
        } else {
            db.Attendances.Add(new Attendance {
                EmployeeId     = dto.EmployeeId, AttendanceDate = dto.AttendanceDate,
                CheckInTime    = dto.CheckInTime  != null ? TimeOnly.Parse(dto.CheckInTime)  : null,
                CheckOutTime   = dto.CheckOutTime != null ? TimeOnly.Parse(dto.CheckOutTime) : null,
                Status         = dto.Status
            });
        }
        await db.SaveChangesAsync();
        return Ok(new { message = "Attendance marked successfully." });
    }

    // POST auto-checkout
    [HttpPost("auto-checkout")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> RunAutoCheckout()
    {
        var count = await AutoCheckoutService.RunAsync(db);
        return Ok(new { message = $"Auto check-out completed. {count} records updated.", count });
    }

    private async Task UpsertSetting(string key, string value)
    {
        var s = await db.AppSettings.FirstOrDefaultAsync(x => x.Key == key);
        if (s == null) db.AppSettings.Add(new AppSetting { Key = key, Value = value });
        else s.Value = value;
    }
}

// ── Internal model ────────────────────────────────────────────
public class GeoLocation
{
    public int    Index  { get; set; }
    public string Name   { get; set; } = string.Empty;
    public double Lat    { get; set; }
    public double Lng    { get; set; }
    public double Radius { get; set; } = 200;
}

// ── DTOs ─────────────────────────────────────────────────────
public class CheckInDto   { public double? Latitude { get; set; } public double? Longitude { get; set; } }
public class CheckOutDto  { public double? Latitude { get; set; } public double? Longitude { get; set; } }

public class MultiGeoSettingsDto
{
    public bool                GeoEnabled { get; set; }
    public List<GeoLocationDto> Locations { get; set; } = new();
}

public class GeoLocationDto
{
    public string? Name    { get; set; }
    public double  Lat     { get; set; }
    public double  Lng     { get; set; }
    public double  Radius  { get; set; } = 200;
    public bool    Enabled { get; set; }
}

// ── Auto Checkout ─────────────────────────────────────────────
public static class AutoCheckoutService
{
    public static async Task<int> RunAsync(AppDbContext db)
    {
        var yesterday = DateOnly.FromDateTime(DateTime.Today.AddDays(-1));
        var autoTime  = new TimeOnly(23, 59);
        var missed    = await db.Attendances
            .Where(a => a.AttendanceDate == yesterday && a.CheckInTime.HasValue && !a.CheckOutTime.HasValue && a.Status != "Absent")
            .ToListAsync();
        foreach (var att in missed) att.CheckOutTime = autoTime;

        if (yesterday.DayOfWeek != DayOfWeek.Sunday) {
            var activeIds = await db.Employees.Where(e => e.Status == "Active" && !e.IsDeleted && !e.IsInactive).Select(e => e.EmployeeId).ToListAsync();
            var checkedIn = await db.Attendances.Where(a => a.AttendanceDate == yesterday).Select(a => a.EmployeeId).ToListAsync();
            foreach (var empId in activeIds.Except(checkedIn)) {
                var onLeave = await db.LeaveRequests.AnyAsync(l => l.EmployeeId == empId && l.Status == "Approved" && l.StartDate <= yesterday && l.EndDate >= yesterday);
                db.Attendances.Add(new Attendance {
                    EmployeeId = empId, AttendanceDate = yesterday,
                    Status     = onLeave ? "On Leave" : "Absent"
                });
            }
        }
        await db.SaveChangesAsync();
        return missed.Count;
    }
}