using EmploymentDashboard.API.DTOs.Employee;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EmploymentDashboard.API.Helpers;

public static class EmployeePdfReport
{
    static EmployeePdfReport()
    {
        // Required by QuestPDF Community license
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(IEnumerable<EmployeeDto> employees, DateTime generatedAt)
    {
        var list = employees.ToList();

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(9));

                // ── Header ────────────────────────────────────
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
                        row.ConstantItem(200).AlignRight().Column(c =>
                        {
                            c.Item().Text("Employee Report")
                                .FontSize(14).Bold().FontColor(Color.FromHex("#333333"));
                            c.Item().Text($"Generated: {generatedAt:dd MMM yyyy, HH:mm}")
                                .FontSize(9).FontColor(Color.FromHex("#888888"));
                            c.Item().Text($"Total Employees: {list.Count}")
                                .FontSize(9).FontColor(Color.FromHex("#888888"));
                        });
                    });
                    col.Item().PaddingTop(4)
                        .LineHorizontal(2).LineColor(Color.FromHex("#1a237e"));
                    col.Item().PaddingTop(6);
                });

                // ── Content ───────────────────────────────────
                page.Content().Table(table =>
                {
                    // Column definitions
                    table.ColumnsDefinition(cols =>
                    {
                        cols.ConstantColumn(55);  // Code
                        cols.RelativeColumn(2.5f);// Name
                        cols.RelativeColumn(2.5f);// Email
                        cols.RelativeColumn(2f);  // Department
                        cols.ConstantColumn(65);  // Role
                        cols.ConstantColumn(80);  // Salary
                        cols.ConstantColumn(72);  // Joined
                        cols.ConstantColumn(52);  // Status
                    });

                    // Header row
                    table.Header(header =>
                    {
                        void H(string text) =>
                            header.Cell().Background(Color.FromHex("#1a237e"))
                                .Padding(6).Text(text)
                                .Bold().FontSize(8).FontColor(Colors.White);
                        H("Code");
                        H("Full Name");
                        H("Email");
                        H("Department");
                        H("Role");
                        H("Salary (₹)");
                        H("Joining Date");
                        H("Status");
                    });

                    // Data rows
                    bool isOdd = false;
                    foreach (var e in list)
                    {
                        isOdd = !isOdd;
                        var bg = isOdd
                            ? Color.FromHex("#f8f9ff")
                            : Colors.White;

                        void C(string text, bool bold = false)
{
    var t = table.Cell().Background(bg)
        .BorderBottom(0.5f)
        .BorderColor(Color.FromHex("#e8eaf6"))
        .Padding(5)
        .Text(text)
        .FontSize(8.5f);

    if (bold)
        t.Bold();
}

                        C(e.EmployeeCode, bold: true);
                        C(e.FullName);
                        C(e.Email);
                        C(e.DepartmentName ?? "—");
                        C(e.RoleName       ?? "—");
                        C(e.Salary.HasValue ? e.Salary.Value.ToString("N0") : "—");
                        C(e.JoiningDate.ToString("dd/MM/yyyy"));

                        // Status with colour
                        var statusColor = e.Status == "Active"
                            ? Color.FromHex("#2e7d32")
                            : Color.FromHex("#c62828");
                        table.Cell().Background(bg)
                         .BorderBottom(0.5f).BorderColor(Color.FromHex("#e8eaf6"))
                            .Padding(5)
                            .Text(e.Status).FontSize(8.5f)
                            .FontColor(statusColor).Bold();
                    }
                });

                // ── Footer ────────────────────────────────────
             page.Footer().Row(row =>
                {
                    row.RelativeItem().Text(
                        "WorkForce Employment Management System — Confidential")
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