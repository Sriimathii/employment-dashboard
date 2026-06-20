using EmploymentDashboard.API.DTOs.Attendance;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmploymentDashboard.API.Helpers;

public static class AttendancePdfReport
{
    static AttendancePdfReport()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(IEnumerable<AttendanceDto> records, DateTime generatedAt)
    {
        var list = records.ToList();

        // Status colour helper
        static Color StatusColor(string status) => status switch {
            "Present"  => Color.FromHex("#2e7d32"),
            "Late"     => Color.FromHex("#e65100"),
            "Absent"   => Color.FromHex("#c62828"),
            "Half Day" => Color.FromHex("#6a1b9a"),
            "On Leave" => Color.FromHex("#1565c0"),
            _          => Color.FromHex("#555555")
        };

        // Summary counts
        var presentCount  = list.Count(r => r.Status == "Present");
        var lateCount     = list.Count(r => r.Status == "Late");
        var absentCount   = list.Count(r => r.Status == "Absent");
        var onLeaveCount  = list.Count(r => r.Status == "On Leave");

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(9));

                // ── Header ──────────────────────────────────
                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("WorkForce")
                                .FontSize(22).Bold()
                                .FontColor(Color.FromHex("#1a237e"));
                            c.Item().Text("Employment Management System")
                                .FontSize(10).FontColor(Color.FromHex("#666666"));
                        });
                        row.ConstantItem(220).AlignRight().Column(c =>
                        {
                            c.Item().Text("Attendance Report")
                                .FontSize(14).Bold().FontColor(Color.FromHex("#333333"));
                            c.Item().Text($"Generated: {generatedAt:dd MMM yyyy, HH:mm}")
                                .FontSize(9).FontColor(Color.FromHex("#888888"));
                            c.Item().Text($"Total Records: {list.Count}")
                                .FontSize(9).FontColor(Color.FromHex("#888888"));
                        });
                    });
                    col.Item().PaddingTop(4)
                        .LineHorizontal(2).LineColor(Color.FromHex("#1a237e"));

                    // Summary boxes
                    col.Item().PaddingTop(8).Row(row =>
                    {
                        void Summary(string label, int count, string hex)
                        {
                            row.RelativeItem().Border(1).BorderColor(Color.FromHex(hex))
                                .Background(Color.FromHex(hex + "20"))
                                .Padding(6).Column(c =>
                                {
                                    c.Item().Text(count.ToString())
                                        .FontSize(16).Bold().FontColor(Color.FromHex(hex));
                                    c.Item().Text(label)
                                        .FontSize(8).FontColor(Color.FromHex("#555555"));
                                });
                            row.ConstantItem(8);
                        }
                        Summary("Present",  presentCount,  "#2e7d32");
                        Summary("Late",     lateCount,     "#e65100");
                        Summary("Absent",   absentCount,   "#c62828");
                        Summary("On Leave", onLeaveCount,  "#1565c0");
                    });
                    col.Item().PaddingTop(8);
                });

                // ── Content ──────────────────────────────────
                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.ConstantColumn(58);  // Emp Code
                        cols.RelativeColumn(2f);  // Name
                        cols.ConstantColumn(75);  // Date
                        cols.ConstantColumn(55);  // Day
                        cols.ConstantColumn(60);  // Check In
                        cols.ConstantColumn(60);  // Check Out
                        cols.ConstantColumn(55);  // Hours
                        cols.ConstantColumn(58);  // Status
                    });

                    table.Header(header =>
                    {
                        void H(string text) =>
                            header.Cell().Background(Color.FromHex("#1a237e"))
                                .Padding(6).Text(text)
                                .Bold().FontSize(8).FontColor(Colors.White);
                        H("Emp Code");
                        H("Employee Name");
                        H("Date");
                        H("Day");
                        H("Check In");
                        H("Check Out");
                        H("Hours");
                        H("Status");
                    });

                    bool isOdd = false;
                    foreach (var r in list)
                    {
                        isOdd = !isOdd;
                        var bg = isOdd
                            ? Color.FromHex("#f8f9ff")
                            : Colors.White;

                        // Parse day name
                        string dayName = "—";
                        if (DateOnly.TryParse(r.AttendanceDate, out var d))
                            dayName = d.DayOfWeek.ToString()[..3];

                        void C(string text) =>
                            table.Cell().Background(bg)
                                .BorderBottom(0.5f).BorderColor(Color.FromHex("#e8eaf6"))
                                .Padding(5).Text(text).FontSize(8.5f);

                        C(r.EmployeeCode);
                        C(r.EmployeeName);
                        C(r.AttendanceDate);
                        C(dayName);
                        C(r.CheckInTime  ?? "—");
                        C(r.CheckOutTime ?? "—");
                        C(r.WorkingHours.HasValue
                            ? r.WorkingHours.Value.ToString("F1") + "h"
                            : "—");

                        // Status with colour
                        table.Cell().Background(bg)
                            .BorderBottom(0.5f).BorderColor(Color.FromHex("#e8eaf6"))
                            .Padding(5)
                            .Text(r.Status)
                            .FontSize(8.5f)
                            .FontColor(StatusColor(r.Status))
                            .Bold();
                    }
                });

                // ── Footer ───────────────────────────────────
                page.Footer().Row(row =>
                {
                    row.RelativeItem()
                        .Text("WorkForce Employment Management System — Confidential")
                        .FontSize(8).FontColor(Color.FromHex("#aaaaaa"));
                    row.ConstantItem(80).AlignRight()
                        .Text(text =>
                        {
                            text.Span("Page ").FontSize(8).FontColor(Color.FromHex("#aaaaaa"));
                            text.CurrentPageNumber().FontSize(8).FontColor(Color.FromHex("#aaaaaa"));
                            text.Span(" of ").FontSize(8).FontColor(Color.FromHex("#aaaaaa"));
                            text.TotalPages().FontSize(8).FontColor(Color.FromHex("#aaaaaa"));
                        });
                });
            });
        }).GeneratePdf();
    }
}