using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.Helpers;
using EmploymentDashboard.API.Models;
using EmploymentDashboard.API.Repositories;
using EmploymentDashboard.API.Repositories.Interfaces;
using EmploymentDashboard.API.Services;
using EmploymentDashboard.API.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Database ──────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── JWT ───────────────────────────────────────────────────────
var jwtKey      = builder.Configuration["Jwt:Key"]!;
var jwtIssuer   = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt => {
        opt.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAudience,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        opt.Events = new JwtBearerEvents {
            OnChallenge = ctx => {
                ctx.HandleResponse();
                ctx.Response.StatusCode  = 401;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync("{\"message\":\"Unauthorized. Please login.\"}");
            },
            OnForbidden = ctx => {
                ctx.Response.StatusCode  = 403;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync("{\"message\":\"Access denied.\"}");
            }
        };
    });

builder.Services.AddAuthorization(opt => {
    opt.AddPolicy("AdminOnly",      p => p.RequireRole("Admin"));
    opt.AddPolicy("ManagerOnly",    p => p.RequireRole("Manager"));
    opt.AddPolicy("AdminOrManager", p => p.RequireRole("Admin","Manager"));
});

// ── Services ──────────────────────────────────────────────────
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<ILeaveRepository,    LeaveRepository>();
builder.Services.AddScoped<IAuthService,        AuthService>();
builder.Services.AddScoped<IJwtService,         JwtService>();
builder.Services.AddScoped<IAuditLogService,    AuditLogService>();
builder.Services.AddHttpContextAccessor();

// ── CORS ──────────────────────────────────────────────────────
builder.Services.AddCors(opt => opt.AddPolicy("AllowAngular", p =>
    p.WithOrigins("http://localhost:4200")
     .AllowAnyMethod()
     .AllowAnyHeader()
     .AllowCredentials()));

// ── Controllers + DateOnly JSON fix ───────────────────────────
// This is CRITICAL: without this DateOnly fails to deserialize from Angular
builder.Services.AddControllers()
    .AddJsonOptions(opts => {
        opts.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// ── Swagger ───────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => {
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Employment Dashboard API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme {
        In = ParameterLocation.Header, Name = "Authorization",
        Type = SecuritySchemeType.ApiKey, Scheme = "Bearer",
        Description = "Enter: Bearer {your token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {{
        new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }}, []
    }});
});

var app = builder.Build();

// ── Auto-seed database ────────────────────────────────────────
using (var scope = app.Services.CreateScope()) {
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    if (!await db.Roles.AnyAsync()) {
        db.Roles.AddRange(
            new Role { RoleName = "Admin" },
            new Role { RoleName = "Manager" },
            new Role { RoleName = "Employee" });
        await db.SaveChangesAsync();
    }

    if (!await db.Departments.AnyAsync()) {
        db.Departments.AddRange(
            new Department { DepartmentName = "Human Resources" },
            new Department { DepartmentName = "Information Technology" },
            new Department { DepartmentName = "Finance" },
            new Department { DepartmentName = "Marketing" },
            new Department { DepartmentName = "Sales" },
            new Department { DepartmentName = "Operations" },
            new Department { DepartmentName = "Customer Support" },
            new Department { DepartmentName = "Research & Development" },
            new Department { DepartmentName = "Administration" },
            new Department { DepartmentName = "Quality Assurance" });
        await db.SaveChangesAsync();
    }

    if (!await db.Users.AnyAsync()) {
        var adminRole    = await db.Roles.FirstAsync(r => r.RoleName == "Admin");
        var managerRole  = await db.Roles.FirstAsync(r => r.RoleName == "Manager");
        var employeeRole = await db.Roles.FirstAsync(r => r.RoleName == "Employee");
        var adminDept    = await db.Departments.FirstAsync(d => d.DepartmentName == "Administration");
        var itDept       = await db.Departments.FirstAsync(d => d.DepartmentName == "Information Technology");

        var adminEmp = new Employee {
            EmployeeCode = "EMP001", FullName = "System Admin",
            Email = "admin@company.com", Status = "Active",
            JoiningDate = DateOnly.FromDateTime(DateTime.Today),
            DepartmentId = adminDept.DepartmentId, RoleId = adminRole.RoleId
        };
        var managerEmp = new Employee {
            EmployeeCode = "EMP002", FullName = "Sarah Manager",
            Email = "manager@company.com", Status = "Active",
            JoiningDate = new DateOnly(2023, 1, 15),
            DepartmentId = itDept.DepartmentId, RoleId = managerRole.RoleId
        };
        var emp = new Employee {
            EmployeeCode = "EMP003", FullName = "John Employee",
            Email = "employee@company.com", Status = "Active",
            JoiningDate = new DateOnly(2023, 6, 1),
            DepartmentId = itDept.DepartmentId, RoleId = employeeRole.RoleId
        };

        db.Employees.AddRange(adminEmp, managerEmp, emp);
        await db.SaveChangesAsync();

        db.Users.AddRange(
            new User { Username = "admin",    PasswordHash = PasswordHasher.Hash("Admin@123"),    RoleId = adminRole.RoleId,    EmployeeId = adminEmp.EmployeeId,   IsActive = true },
            new User { Username = "manager1", PasswordHash = PasswordHasher.Hash("Manager@123"),  RoleId = managerRole.RoleId,  EmployeeId = managerEmp.EmployeeId, IsActive = true },
            new User { Username = "emp001",   PasswordHash = PasswordHasher.Hash("Emp@123456"),   RoleId = employeeRole.RoleId, EmployeeId = emp.EmployeeId,        IsActive = true }
        );
        await db.SaveChangesAsync();
        Console.WriteLine("✅ Seeded: admin/Admin@123 | manager1/Manager@123 | emp001/Emp@123456");
    }
}

// ── Pipeline ──────────────────────────────────────────────────
if (app.Environment.IsDevelopment()) {
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();
app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();