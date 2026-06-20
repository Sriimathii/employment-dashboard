using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using EmploymentDashboard.API.Controllers;

namespace EmploymentDashboard.API.Helpers;

public static class LeavePdfReport
{
    static LeavePdfReport() { QuestPDF.Settings.License = LicenseType.Community; }

    public record LeaveRow(
        string EmployeeCode, string EmployeeName, string DepartmentName,
        string LeaveType, string StartDate, string EndDate,
        int TotalDays, string Status, string? Reason);

    public static byte[] Generate(IEnumerable<LeaveRow> rows, DateTime generatedAt)
    {
        var list = rows.ToList();

        static Color StatusColor(string s) => s switch {
            "Approved" => Color.FromHex("#2e7d32"),
            "Rejected" => Color.FromHex("#c62828"),
            "Pending"  => Color.FromHex("#f57f17"),
            _          => Color.FromHex("#555555")
        };
        static Color StatusBg(string s) => s switch {
            "Approved" => Color.FromHex("#e8f5e9"),
            "Rejected" => Color.FromHex("#ffebee"),
            "Pending"  => Color.FromHex("#fff8e1"),
            _          => Color.FromHex("#f5f5f5")
        };

        // Summary counts
        var approved  = list.Count(r => r.Status == "Approved");
        var rejected  = list.Count(r => r.Status == "Rejected");
        var pending   = list.Count(r => r.Status == "Pending");
        var totalDays = list.Sum(r => r.TotalDays);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(9));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c => {
                            c.Item().Text("WorkForce")
                             .FontSize(22).Bold().FontColor(Color.FromHex("#1a237e"));
                            c.Item().Text("Employment Management System")
                             .FontSize(10).FontColor(Color.FromHex("#666666"));
                        });
                        row.ConstantItem(220).AlignRight().Column(c => {
                            c.Item().Text("Leave Report")
                             .FontSize(14).Bold().FontColor(Color.FromHex("#333333"));
                            c.Item().Text($"Generated: {generatedAt:dd MMM yyyy, HH:mm}")
                             .FontSize(9).FontColor(Color.FromHex("#888888"));
                        });
                    });
                    col.Item().PaddingTop(4).LineHorizontal(1).LineColor(Color.FromHex("#1a237e"));

                    // Summary row
                    col.Item().PaddingTop(8).Row(row =>
                    {
                        foreach (var (label, val, clr) in new[] {
                            ("Total Records", list.Count.ToString(), "#1a237e"),
                            ("Approved",  approved.ToString(),  "#2e7d32"),
                            ("Rejected",  rejected.ToString(),  "#c62828"),
                            ("Pending",   pending.ToString(),   "#f57f17"),
                            ("Total Days",totalDays.ToString(), "#0288d1")
                        })
                        {
                            row.RelativeItem()
                               .Background(Color.FromHex("#f8f9ff"))
                               .Border(1).BorderColor(Color.FromHex("#e8eaf6"))
                               .Padding(6).Column(c => {
                                   c.Item().Text(val).FontSize(14).Bold().FontColor(Color.FromHex(clr));
                                   c.Item().Text(label).FontSize(7).FontColor(Color.FromHex("#888888"));
                               });
                        }
                    });
                    col.Item().PaddingBottom(8);
                });

                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.ConstantColumn(18);  // #
                        cols.ConstantColumn(50);  // Code
                        cols.RelativeColumn(22);  // Name
                        cols.RelativeColumn(18);  // Dept
                        cols.ConstantColumn(55);  // Type
                        cols.ConstantColumn(62);  // From
                        cols.ConstantColumn(62);  // To
                        cols.ConstantColumn(30);  // Days
                        cols.ConstantColumn(55);  // Status
                        cols.RelativeColumn(30);  // Reason
                    });

                    table.Header(h =>
                    {
                        var hdrBg = Color.FromHex("#1a237e");
                        var hdrFg = Colors.White;
                        foreach (var lbl in new[] { "#","Code","Employee","Department","Leave Type","From","To","Days","Status","Reason" })
                        {
                            h.Cell().Background(hdrBg).Padding(4)
                             .AlignCenter()
                             .Text(lbl).Bold().FontColor(hdrFg).FontSize(8);
                        }
                    });

                    int idx = 0;
                    foreach (var r in list)
                    {
                        idx++;
                        var bg = idx % 2 == 0 ? Color.FromHex("#f8f9ff") : Colors.White;
                        foreach (var (val, align) in new[] {
                            (idx.ToString(),       true),
                            (r.EmployeeCode,       true),
                            (r.EmployeeName,       false),
                            (r.DepartmentName,     false),
                            (r.LeaveType,          true),
                            (r.StartDate,          true),
                            (r.EndDate,            true),
                            (r.TotalDays.ToString(),true),
                            ("",                   true),  // status — handled below
                            (r.Reason ?? "—",      false)
                        })
                        {
                            if (val == "" && align) // Status cell
                            {
                                table.Cell()
                                     .Background(StatusBg(r.Status))
                                     .Padding(4).AlignCenter()
                                     .Text(r.Status).Bold()
                                     .FontColor(StatusColor(r.Status)).FontSize(8);
                            }
                            else
                            {
                                var cell = table.Cell().Background(bg).Padding(4);
                                if (align) cell.AlignCenter().Text(val).FontSize(8);
                                else       cell.Text(val).FontSize(8);
                            }
                        }
                    }
                });

                page.Footer().AlignCenter().Text(t => {
                    t.Span("WorkForce Leave Report  |  Page ").FontSize(8);
                    t.CurrentPageNumber().FontSize(8);
                    t.Span(" of ").FontSize(8);
                    t.TotalPages().FontSize(8);
                });
            });
        }).GeneratePdf();
    }
}