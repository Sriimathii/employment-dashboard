using System.Text;
using EmploymentDashboard.API.DTOs.Employee;
using EmploymentDashboard.API.DTOs.Attendance;

namespace EmploymentDashboard.API.Helpers;

public static class PdfExporter
{
    public static byte[] ExportEmployeesPdf(IEnumerable<EmployeeDto> employees)
    {
        var rows = employees.Select(e =>
            $"{e.EmployeeCode,-10} | " +
            $"{Trunc(e.FullName, 22),-22} | " +
            $"{Trunc(e.DepartmentName ?? "-", 18),-18} | " +
            $"{e.Status,-8} | " +
            $"{e.JoiningDate} | " +
            $"{(e.Salary != null ? "₹" + e.Salary.Value.ToString("N0") : "-"),12}"
        );

        return BuildPdf("Employee Report", new[]
        {
            $"{"Code",-10} | {"Full Name",-22} | {"Department",-18} | {"Status",-8} | {"Joined",-10} | {"Salary",12}",
            new string('-', 88)
        }.Concat(rows).ToArray());
    }

    public static byte[] ExportAttendancePdf(IEnumerable<AttendanceDto> records)
    {
        var rows = records.Select(r =>
            $"{r.EmployeeCode,-10} | " +
            $"{Trunc(r.EmployeeName, 20),-20} | " +
            $"{r.AttendanceDate,-12} | " +
            $"{(string.IsNullOrEmpty(r.CheckInTime) ? "-" : r.CheckInTime),-8} | " +
            $"{(string.IsNullOrEmpty(r.CheckOutTime) ? "-" : r.CheckOutTime),-8} | " +
            $"{(r.WorkingHours != null ? r.WorkingHours.Value.ToString("F1") + "h" : "-"),6} | " +
            $"{r.Status,-10}"
        );

        return BuildPdf("Attendance Report", new[]
        {
            $"{"Code",-10} | {"Employee",-20} | {"Date",-12} | {"Check In",-8} | {"CheckOut",-8} | {"Hours",6} | {"Status",-10}",
            new string('-', 82)
        }.Concat(rows).ToArray());
    }

    private static byte[] BuildPdf(string title, string[] lines)
    {
        var sb = new StringBuilder();
        sb.AppendLine("%PDF-1.4");
        sb.AppendLine("1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj");
        sb.AppendLine("2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj");

        var content = new StringBuilder();
        content.AppendLine("BT");
        content.AppendLine("/F1 14 Tf");
        content.AppendLine("50 780 Td");
        content.AppendLine($"({EscapePdf(title)}) Tj");

        content.AppendLine("/F1 8 Tf");
        content.AppendLine("0 -14 Td");
        content.AppendLine($"(Generated: {DateTime.Now:dd-MM-yyyy HH:mm}) Tj");

        content.AppendLine("0 -18 Td");
        content.AppendLine("/F1 7 Tf");

        foreach (var line in lines)
        {
            content.AppendLine($"({EscapePdf(line)}) Tj");
            content.AppendLine("0 -10 Td");
        }

        content.AppendLine("ET");

        var stream = Encoding.ASCII.GetBytes(content.ToString());

        sb.AppendLine("3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 842 595]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Courier>>>>>>>>>>endobj");
        sb.AppendLine($"4 0 obj<</Length {stream.Length}>>");
        sb.AppendLine("stream");

        var header = Encoding.ASCII.GetBytes(sb.ToString());
        var footer = Encoding.ASCII.GetBytes("\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\ntrailer<</Size 5/Root 1 0 R>>\n%%EOF");

        var result = new byte[header.Length + stream.Length + footer.Length];
        Buffer.BlockCopy(header, 0, result, 0, header.Length);
        Buffer.BlockCopy(stream, 0, result, header.Length, stream.Length);
        Buffer.BlockCopy(footer, 0, result, header.Length + stream.Length, footer.Length);

        return result;
    }

    private static string EscapePdf(string s)
        => (s ?? "")
            .Replace("\\", "\\\\")
            .Replace("(", "\\(")
            .Replace(")", "\\)")
            .Replace("₹", "Rs.");

    private static string Trunc(string s, int max)
        => string.IsNullOrEmpty(s) ? "" : (s.Length <= max ? s : s[..max]);
}