using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EmploymentDashboard.API.Migrations
{
    /// <inheritdoc />
    public partial class UserStatusUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "CheckOutLatitude",
                table: "Attendance",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CheckOutLongitude",
                table: "Attendance",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CheckOutLatitude",
                table: "Attendance");

            migrationBuilder.DropColumn(
                name: "CheckOutLongitude",
                table: "Attendance");
        }
    }
}
