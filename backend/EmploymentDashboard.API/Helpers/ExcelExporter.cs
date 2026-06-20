using ClosedXML.Excel;
using EmploymentDashboard.API.DTOs.Employee;
using EmploymentDashboard.API.DTOs.Attendance;
using System.IO;
using EmploymentDashboard.API.Controllers;

namespace EmploymentDashboard.API.Helpers;

public static class ExcelExporter
{
    public static byte[] ExportEmployees(IEnumerable<EmployeeDto> employees)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Employees");

        var headers = new[]
        {
            "Employee ID","Employee Code","Full Name","Email","Phone",
            "Department","Role","Status","Joining Date","Salary","Address"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1a237e");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        int row = 2;
        foreach (var e in employees)
        {
            ws.Cell(row, 1).Value = e.EmployeeId;
            ws.Cell(row, 2).Value = e.EmployeeCode;
            ws.Cell(row, 3).Value = e.FullName;
            ws.Cell(row, 4).Value = e.Email;
            ws.Cell(row, 5).Value = e.PhoneNumber ?? "";
            ws.Cell(row, 6).Value = e.DepartmentName ?? "";
            ws.Cell(row, 7).Value = e.RoleName ?? "";
            ws.Cell(row, 8).Value = e.Status;
            ws.Cell(row, 9).Value = e.JoiningDate.ToString("yyyy-MM-dd");
            ws.Cell(row, 10).Value = e.Salary ?? 0;
            ws.Cell(row, 11).Value = e.Address ?? "";

            if (row % 2 == 0)
                ws.Row(row).Style.Fill.BackgroundColor = XLColor.FromHtml("#e8eaf6");

            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public static byte[] ExportAttendance(IEnumerable<AttendanceDto> records)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Attendance");

        var headers = new[]
        {
            "ID","Employee Code","Employee Name",
            "Date","Check In","Check Out",
            "Status","Working Hours"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1a237e");
            cell.Style.Font.FontColor = XLColor.White;
        }

        int row = 2;

        foreach (var a in records)
        {
            ws.Cell(row, 1).Value = a.AttendanceId;
            ws.Cell(row, 2).Value = a.EmployeeCode;
            ws.Cell(row, 3).Value = a.EmployeeName;

            ws.Cell(row, 4).Value = a.AttendanceDate;
            ws.Cell(row, 5).Value = a.CheckInTime ?? "";
            ws.Cell(row, 6).Value = a.CheckOutTime ?? "";
            ws.Cell(row, 7).Value = a.Status;
            ws.Cell(row, 8).Value = a.WorkingHours ?? 0;

            if (row % 2 == 0)
                ws.Row(row).Style.Fill.BackgroundColor = XLColor.FromHtml("#e8eaf6");

            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // NEW: Export Leave report
    public static byte[] ExportLeave(IEnumerable<object[]> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Leave");

        var headers = new[]
        {
            "Employee Code","Employee Name","Department","Leave Type",
            "From","To","Days","Status","Reason"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2e7d32");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        int row = 2;
        foreach (var r in rows)
        {
            for (int col = 0; col < r.Length; col++)
                ws.Cell(row, col + 1).Value = r[col]?.ToString() ?? "";

            if (row % 2 == 0)
                ws.Row(row).Style.Fill.BackgroundColor = XLColor.FromHtml("#e8f5e9");

            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
    public static byte[] ExportRoster(RosterData roster)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Attendance Roster");

        var headers = new List<string> {
            "#", "Employee Code", "Employee Name", "Designation", "Department"
        };
        foreach (var dh in roster.DayHeaders)
            headers.Add($"{dh.Day}\n{dh.DayName}");
        headers.AddRange(new[] {
            "Work Days","Present","Absent","Late","OD","HD","OT",
            "CL","ML","PL","UL","OL","WO","H","Hours","Att%"
        });

        // Title row
        var titleCell = ws.Cell(1, 1);
        titleCell.Value = $"Attendance Roster — {roster.MonthName}";
        titleCell.Style.Font.Bold = true;
        titleCell.Style.Font.FontSize = 14;
        titleCell.Style.Font.FontColor = XLColor.FromHtml("#1a237e");
        ws.Range(ws.Cell(1, 1), ws.Cell(1, headers.Count)).Merge();

        // Header row
        for (int i = 0; i < headers.Count; i++)
        {
            var cell = ws.Cell(2, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.WrapText = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

            // Colour Sunday and holiday day columns
            if (i >= 5 && i < 5 + roster.DayHeaders.Count) {
                var dh = roster.DayHeaders[i - 5];
                if (dh.IsSunday)
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#455a64");
                else if (dh.IsHoliday)
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#283593");
                else
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1a237e");
            } else {
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0d47a1");
            }
            cell.Style.Font.FontColor = XLColor.White;
        }

        // Code colour map
        static XLColor CodeBg(string code) => code switch {
            "P"  => XLColor.FromHtml("#e8f5e9"),
            "L"  => XLColor.FromHtml("#fff3e0"),
            "OD" => XLColor.FromHtml("#e0f7fa"),
            "HD" => XLColor.FromHtml("#f3e5f5"),
            "OT" => XLColor.FromHtml("#fce4ec"),
            "A"  => XLColor.FromHtml("#ffebee"),
            "CL" => XLColor.FromHtml("#fff8e1"),
            "ML" => XLColor.FromHtml("#fce4ec"),
            "PL" => XLColor.FromHtml("#e8f5e9"),
            "UL" => XLColor.FromHtml("#ffebee"),
            "WO" => XLColor.FromHtml("#eceff1"),
            "H"  => XLColor.FromHtml("#e8eaf6"),
            _    => XLColor.White
        };
        static XLColor CodeFg(string code) => code switch {
            "P"  => XLColor.FromHtml("#1b5e20"),
            "L"  => XLColor.FromHtml("#bf360c"),
            "OD" => XLColor.FromHtml("#006064"),
            "HD" => XLColor.FromHtml("#4a148c"),
            "OT" => XLColor.FromHtml("#880e4f"),
            "A"  => XLColor.FromHtml("#b71c1c"),
            "CL" => XLColor.FromHtml("#f57f17"),
            "ML" => XLColor.FromHtml("#880e4f"),
            "PL" => XLColor.FromHtml("#1b5e20"),
            "UL" => XLColor.FromHtml("#c62828"),
            "WO" => XLColor.FromHtml("#546e7a"),
            "H"  => XLColor.FromHtml("#1a237e"),
            _    => XLColor.FromHtml("#666666")
        };

        // Data rows
        int row = 3;
        foreach (var emp in roster.Employees)
        {
            int col = 1;
            ws.Cell(row, col++).Value = row - 2;
            ws.Cell(row, col++).Value = emp.EmployeeCode;
            ws.Cell(row, col++).Value = emp.EmployeeName;
            ws.Cell(row, col++).Value = emp.Designation;
            ws.Cell(row, col++).Value = emp.DepartmentName;

            foreach (var dh in roster.DayHeaders)
            {
                var code = emp.Days.TryGetValue(dh.Day, out var c) ? (c ?? "") : "";
                var cell = ws.Cell(row, col++);
                cell.Value = code;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontSize = 9;
                if (!string.IsNullOrEmpty(code)) {
                    cell.Style.Fill.BackgroundColor = CodeBg(code);
                    cell.Style.Font.FontColor       = CodeFg(code);
                }
                if (dh.IsSunday  && string.IsNullOrEmpty(code))
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#f5f5f5");
                if (dh.IsHoliday && string.IsNullOrEmpty(code))
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#f3f4f9");
            }

            var s = emp.Summary;
            ws.Cell(row, col++).Value = s.WorkingDays;
            ws.Cell(row, col++).Value = s.Present;
            ws.Cell(row, col++).Value = s.Absent;
            ws.Cell(row, col++).Value = s.Late;
            ws.Cell(row, col++).Value = s.OD;
            ws.Cell(row, col++).Value = s.HD;
            ws.Cell(row, col++).Value = s.OT;
            ws.Cell(row, col++).Value = s.CL;
            ws.Cell(row, col++).Value = s.ML;
            ws.Cell(row, col++).Value = s.PL;
            ws.Cell(row, col++).Value = s.UL;
            ws.Cell(row, col++).Value = s.OL;
            ws.Cell(row, col++).Value = s.WO;
            ws.Cell(row, col++).Value = s.Holiday;
            ws.Cell(row, col++).Value = s.TotalWorkingHours;
            ws.Cell(row, col++).Value = $"{s.AttendancePercentage}%";

            if (row % 2 == 0) {
                var rowRange = ws.Range(ws.Cell(row, 1), ws.Cell(row, headers.Count));
                foreach (var c in rowRange.Cells())
                    if (c.Style.Fill.BackgroundColor == XLColor.White ||
                        c.Style.Fill.BackgroundColor == XLColor.NoColor)
                        c.Style.Fill.BackgroundColor = XLColor.FromHtml("#f8f9ff");
            }
            row++;
        }

        // Borders on header row
        ws.Range(ws.Cell(2, 1), ws.Cell(2, headers.Count))
          .Style.Border.OutsideBorder = XLBorderStyleValues.Medium;

        // Freeze first 5 columns and top 2 rows
        ws.SheetView.FreezeRows(2);
        ws.SheetView.FreezeColumns(5);

        // Adjust widths
        ws.Column(1).Width = 5;
        ws.Column(2).Width = 12;
        ws.Column(3).Width = 20;
        ws.Column(4).Width = 14;
        ws.Column(5).Width = 16;
        for (int c = 6; c < 6 + roster.DayHeaders.Count; c++)
            ws.Column(c).Width = 5;

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}