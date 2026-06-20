using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using EmploymentDashboard.API.Controllers;

namespace EmploymentDashboard.API.Helpers;

public static class RosterPdfReport
{
    static RosterPdfReport() { QuestPDF.Settings.License = LicenseType.Community; }

    public static byte[] Generate(RosterData roster, DateTime generatedAt)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A3.Landscape());
                page.Margin(1.2f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(7));

                // Header
                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c => {
                            c.Item().Text("WorkForce — Attendance Roster")
                             .FontSize(16).Bold().FontColor(Color.FromHex("#1a237e"));
                            c.Item().Text(roster.MonthName)
                             .FontSize(11).FontColor(Color.FromHex("#555555"));
                        });
                        row.ConstantItem(200).AlignRight().Column(c => {
                            c.Item().Text($"Generated: {generatedAt:dd MMM yyyy HH:mm}")
                             .FontSize(9).FontColor(Color.FromHex("#888888"));
                            c.Item().Text($"Total Employees: {roster.Employees.Count}")
                             .FontSize(9).FontColor(Color.FromHex("#888888"));
                        });
                    });
                    col.Item().PaddingTop(4).LineHorizontal(1).LineColor(Color.FromHex("#1a237e"));
                    col.Item().PaddingBottom(4);
                });

                // Content
                page.Content().Column(col =>
                {
                    // Legend
                    col.Item().Row(row =>
                    {
                        var codes = new[] {
                            ("P","#1b5e20","#e8f5e9"), ("L","#bf360c","#fff3e0"),
                            ("OD","#006064","#e0f7fa"), ("HD","#4a148c","#f3e5f5"),
                            ("OT","#880e4f","#fce4ec"), ("A","#b71c1c","#ffebee"),
                            ("CL","#f57f17","#fff8e1"), ("ML","#880e4f","#fce4ec"),
                            ("PL","#1b5e20","#e8f5e9"), ("UL","#c62828","#ffebee"),
                            ("WO","#546e7a","#eceff1"), ("H","#1a237e","#e8eaf6")
                        };
                        foreach (var (code, fg, bg) in codes)
                        {
                            row.ConstantItem(42).Padding(1).Background(Color.FromHex(bg))
                               .AlignCenter().Text($"{code}")
                               .Bold().FontSize(7).FontColor(Color.FromHex(fg));
                        }
                    });
                    col.Item().PaddingBottom(4);

                    // Table
                    col.Item().Table(table =>
                    {
                        // Define columns
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(18);  // #
                            cols.RelativeColumn(18);  // name
                            cols.RelativeColumn(10);  // dept
                            foreach (var _ in roster.DayHeaders)
                                cols.ConstantColumn(15); // day cols
                            cols.ConstantColumn(16);  // WD
                            cols.ConstantColumn(14);  // P
                            cols.ConstantColumn(14);  // A
                            cols.ConstantColumn(14);  // L
                            cols.ConstantColumn(14);  // Att%
                        });

                        // Header
                        var hdrBg = Color.FromHex("#1a237e");
                        var hdrFg = Colors.White;

                        table.Header(h =>
                        {
                            h.Cell().Background(hdrBg).Padding(2).AlignCenter()
                             .Text("#").Bold().FontColor(hdrFg).FontSize(7);
                            h.Cell().Background(hdrBg).Padding(2)
                             .Text("Employee").Bold().FontColor(hdrFg).FontSize(7);
                            h.Cell().Background(hdrBg).Padding(2)
                             .Text("Dept").Bold().FontColor(hdrFg).FontSize(7);

                            foreach (var dh in roster.DayHeaders)
                            {
                                var bg = dh.IsSunday  ? Color.FromHex("#455a64")
                                        : dh.IsHoliday ? Color.FromHex("#283593")
                                        : hdrBg;
                                h.Cell().Background(bg).Padding(1).AlignCenter()
                                 .Text($"{dh.Day}").Bold().FontColor(hdrFg).FontSize(6);
                            }
                            foreach (var lbl in new[] { "WD","P","A","L","Att%" })
                                h.Cell().Background(Color.FromHex("#0d47a1")).Padding(2)
                                 .AlignCenter().Text(lbl).Bold().FontColor(hdrFg).FontSize(7);
                        });

                        // Data rows
                        var codeBg = new Dictionary<string, string> {
                            ["P"]="e8f5e9",["L"]="fff3e0",["OD"]="e0f7fa",["HD"]="f3e5f5",
                            ["OT"]="fce4ec",["A"]="ffebee",["CL"]="fff8e1",["ML"]="fce4ec",
                            ["PL"]="e8f5e9",["UL"]="ffebee",["AL"]="e3f2fd",["SL"]="f1f8e9",
                            ["OL"]="f5f5f5",["WO"]="eceff1",["H"]="e8eaf6"
                        };
                        var codeFg = new Dictionary<string, string> {
                            ["P"]="1b5e20",["L"]="bf360c",["OD"]="006064",["HD"]="4a148c",
                            ["OT"]="880e4f",["A"]="b71c1c",["CL"]="f57f17",["ML"]="880e4f",
                            ["PL"]="1b5e20",["UL"]="c62828",["AL"]="0d47a1",["SL"]="33691e",
                            ["OL"]="424242",["WO"]="546e7a",["H"]="1a237e"
                        };

                        int rowIdx = 0;
                        foreach (var emp in roster.Employees)
                        {
                            rowIdx++;
                            var rowBg = rowIdx % 2 == 0 ? Color.FromHex("#f8f9ff") : Colors.White;

                            table.Cell().Background(rowBg).Padding(2).AlignCenter()
                                 .Text($"{rowIdx}").FontSize(7);
                            table.Cell().Background(rowBg).Padding(2)
                                 .Text($"{emp.EmployeeName}\n{emp.EmployeeCode}")
                                 .FontSize(6.5f);
                            table.Cell().Background(rowBg).Padding(2)
                                 .Text(emp.DepartmentName).FontSize(6.5f);

                            foreach (var dh in roster.DayHeaders)
                            {
                                var code = emp.Days.TryGetValue(dh.Day, out var c) ? (c ?? "") : "";
                                var cellBg = !string.IsNullOrEmpty(code) && codeBg.TryGetValue(code, out var cbg)
                                    ? Color.FromHex("#" + cbg) : rowBg;
                                var cellFg = !string.IsNullOrEmpty(code) && codeFg.TryGetValue(code, out var cfg)
                                    ? Color.FromHex("#" + cfg) : Color.FromHex("#555555");

                                table.Cell().Background(cellBg).Padding(1).AlignCenter()
                                     .Text(code).Bold().FontSize(6).FontColor(cellFg);
                            }

                            var s = emp.Summary;
                            table.Cell().Background(rowBg).Padding(2).AlignCenter()
                                 .Text($"{s.WorkingDays}").FontSize(7);
                            table.Cell().Background(Color.FromHex("#e8f5e9")).Padding(2).AlignCenter()
                                 .Text($"{s.Present}").Bold().FontColor(Color.FromHex("#1b5e20")).FontSize(7);
                            table.Cell().Background(Color.FromHex("#ffebee")).Padding(2).AlignCenter()
                                 .Text($"{s.Absent}").Bold().FontColor(Color.FromHex("#b71c1c")).FontSize(7);
                            table.Cell().Background(Color.FromHex("#fff3e0")).Padding(2).AlignCenter()
                                 .Text($"{s.Late}").Bold().FontColor(Color.FromHex("#bf360c")).FontSize(7);

                            var pctBg = s.AttendancePercentage >= 75 ? "#e8f5e9"
                                      : s.AttendancePercentage >= 50 ? "#fff3e0" : "#ffebee";
                            var pctFg = s.AttendancePercentage >= 75 ? "#1b5e20"
                                      : s.AttendancePercentage >= 50 ? "#e65100" : "#b71c1c";
                            table.Cell().Background(Color.FromHex(pctBg)).Padding(2).AlignCenter()
                                 .Text($"{s.AttendancePercentage}%").Bold()
                                 .FontColor(Color.FromHex(pctFg)).FontSize(7);
                        }
                    });
                });

                // Footer
                page.Footer().AlignCenter()
                    .Text(t => {
                        t.Span("WorkForce Employment Dashboard  |  Page ").FontSize(8);
                        t.CurrentPageNumber().FontSize(8);
                        t.Span(" of ").FontSize(8);
                        t.TotalPages().FontSize(8);
                    });
            });
        }).GeneratePdf();
    }
}