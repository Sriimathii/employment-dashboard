using EmploymentDashboard.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User>         Users         => Set<User>();
    public DbSet<Role>         Roles         => Set<Role>();
    public DbSet<Employee>     Employees     => Set<Employee>();
    public DbSet<Department>   Departments   => Set<Department>();
    public DbSet<Attendance>   Attendances   => Set<Attendance>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog>     AuditLogs     => Set<AuditLog>();
    public DbSet<AppSetting>   AppSettings   => Set<AppSetting>();
    public DbSet<Feedback>     Feedbacks     => Set<Feedback>();
    public DbSet<Holiday>      Holidays      => Set<Holiday>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Role>(e => { e.ToTable("Roles"); e.HasKey(x => x.RoleId); e.Property(x => x.RoleName).HasMaxLength(50).IsRequired(); });
        b.Entity<Department>(e => { e.ToTable("Departments"); e.HasKey(x => x.DepartmentId); e.Property(x => x.DepartmentName).HasMaxLength(100).IsRequired(); });

        b.Entity<Employee>(e => {
            e.ToTable("Employees"); e.HasKey(x => x.EmployeeId);
            e.Property(x => x.EmployeeCode).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.EmployeeCode).IsUnique();
            e.Property(x => x.Email).HasMaxLength(150).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Status).HasMaxLength(10).HasDefaultValue("Active");
            e.Property(x => x.Salary).HasColumnType("numeric(12,2)");
            e.Property(x => x.MonthlyLeaveBalance).HasDefaultValue(3);
            e.HasOne(x => x.Department).WithMany(d => d.Employees).HasForeignKey(x => x.DepartmentId);
            e.HasOne(x => x.Role).WithMany().HasForeignKey(x => x.RoleId);
        });

        b.Entity<User>(e => {
            e.ToTable("Users"); e.HasKey(x => x.UserId);
            e.Property(x => x.Username).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Username).IsUnique();
            e.HasOne(x => x.Role).WithMany(r => r.Users).HasForeignKey(x => x.RoleId);
            e.HasOne(x => x.Employee).WithOne().HasForeignKey<User>(x => x.EmployeeId);
        });

        b.Entity<Attendance>(e => {
            e.ToTable("Attendance"); e.HasKey(x => x.AttendanceId);
            e.HasIndex(x => new { x.EmployeeId, x.AttendanceDate }).IsUnique();
            e.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Present");
            e.Property(x => x.CheckInLocationName).HasMaxLength(100);
            e.HasOne(x => x.Employee).WithMany(emp => emp.Attendances).HasForeignKey(x => x.EmployeeId);
        });

        b.Entity<LeaveRequest>(e => {
            e.ToTable("LeaveRequests"); e.HasKey(x => x.LeaveId);
            e.Property(x => x.LeaveType).HasMaxLength(50).IsRequired();
            e.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending");
            e.HasOne(x => x.Employee).WithMany(emp => emp.LeaveRequests).HasForeignKey(x => x.EmployeeId);
            e.HasOne(x => x.Approver).WithMany().HasForeignKey(x => x.ApprovedBy);
        });

        b.Entity<AuditLog>(e => {
            e.ToTable("AuditLogs"); e.HasKey(x => x.LogId);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
            e.Property(x => x.OldValues).HasColumnType("jsonb");
            e.Property(x => x.NewValues).HasColumnType("jsonb");
        });

        b.Entity<AppSetting>(e => {
            e.ToTable("AppSettings"); e.HasKey(x => x.SettingId);
            e.Property(x => x.Key).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Value).HasMaxLength(500).IsRequired();
        });

        b.Entity<Feedback>(e => {
            e.ToTable("Feedbacks"); e.HasKey(x => x.FeedbackId);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Category).HasMaxLength(50).HasDefaultValue("General Feedback");
            e.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("New");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });

        b.Entity<Holiday>(e => {
            e.ToTable("Holidays"); e.HasKey(x => x.HolidayId);
            e.HasIndex(x => x.HolidayDate).IsUnique();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.HolidayType).HasMaxLength(20).HasDefaultValue("National");
        });
    }
}