-- ============================================================
-- database/05_seed_demo_users.sql
-- Demo users with correct credentials
-- Run this AFTER 01-04 scripts
-- ============================================================

-- ── Manager Employee Record ───────────────────────────────────
INSERT INTO "Employees" (
  "EmployeeCode","FullName","Email","Status","JoiningDate","DepartmentId","RoleId"
)
VALUES (
  'EMP003',
  'Sarah Manager',
  'manager@company.com',
  'Active',
  '2023-01-15',
  (SELECT "DepartmentId" FROM "Departments" WHERE "DepartmentName" = 'Information Technology'),
  (SELECT "RoleId" FROM "Roles" WHERE "RoleName" = 'Manager')
);

-- ── Employee Record ───────────────────────────────────────────
INSERT INTO "Employees" (
  "EmployeeCode","FullName","Email","Status","JoiningDate","DepartmentId","RoleId"
)
VALUES (
  'EMP004',
  'John Employee',
  'employee@company.com',
  'Active',
  '2023-06-01',
  (SELECT "DepartmentId" FROM "Departments" WHERE "DepartmentName" = 'Information Technology'),
  (SELECT "RoleId" FROM "Roles" WHERE "RoleName" = 'Employee')
);

-- ── Manager User Account ──────────────────────────────────────
-- Password: Manager@123
-- BCrypt hash generated with: BCrypt.Net.BCrypt.HashPassword("Manager@123", 12)
INSERT INTO "Users" ("Username","PasswordHash","RoleId","EmployeeId","IsActive")
VALUES (
  'manager1',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  (SELECT "RoleId" FROM "Roles" WHERE "RoleName" = 'Manager'),
  (SELECT "EmployeeId" FROM "Employees" WHERE "EmployeeCode" = 'EMP003'),
  TRUE
);

-- ── Employee User Account ─────────────────────────────────────
-- Password: Emp@123456
INSERT INTO "Users" ("Username","PasswordHash","RoleId","EmployeeId","IsActive")
VALUES (
  'emp001',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  (SELECT "RoleId" FROM "Roles" WHERE "RoleName" = 'Employee'),
  (SELECT "EmployeeId" FROM "Employees" WHERE "EmployeeCode" = 'EMP004'),
  TRUE
);

-- ============================================================
-- NOTE: The hash above is a placeholder for demo purposes.
-- To generate REAL hashes, run this C# snippet in your Program.cs
-- temporarily during startup, or use a migration seeder:
--
--   Console.WriteLine(BCrypt.Net.BCrypt.HashPassword("Admin@123",    12));
--   Console.WriteLine(BCrypt.Net.BCrypt.HashPassword("Manager@123",  12));
--   Console.WriteLine(BCrypt.Net.BCrypt.HashPassword("Emp@123456",   12));
--
-- Then paste the output hashes into this SQL file.
-- ============================================================


-- ============================================================
-- ALTERNATIVE: Seeder in C# (add to Program.cs after app.Build())
-- ============================================================
/*

// Place this in Program.cs BEFORE app.Run():

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();

    if (!db.Roles.Any())
    {
        db.Roles.AddRange(
            new Role { RoleName = "Admin" },
            new Role { RoleName = "Manager" },
            new Role { RoleName = "Employee" }
        );
        await db.SaveChangesAsync();
    }

    if (!db.Departments.Any())
    {
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
            new Department { DepartmentName = "Quality Assurance" }
        );
        await db.SaveChangesAsync();
    }

    if (!db.Users.Any())
    {
        var adminRole    = db.Roles.First(r => r.RoleName == "Admin");
        var managerRole  = db.Roles.First(r => r.RoleName == "Manager");
        var employeeRole = db.Roles.First(r => r.RoleName == "Employee");
        var itDept       = db.Departments.First(d => d.DepartmentName == "Information Technology");
        var adminDept    = db.Departments.First(d => d.DepartmentName == "Administration");

        // Admin employee
        var adminEmp = new Employee {
            EmployeeCode = "EMP001", FullName = "System Admin",
            Email = "admin@company.com", Status = "Active",
            JoiningDate = DateOnly.FromDateTime(DateTime.Today),
            DepartmentId = adminDept.DepartmentId, RoleId = adminRole.RoleId
        };
        // Manager employee
        var managerEmp = new Employee {
            EmployeeCode = "EMP002", FullName = "Sarah Manager",
            Email = "manager@company.com", Status = "Active",
            JoiningDate = new DateOnly(2023, 1, 15),
            DepartmentId = itDept.DepartmentId, RoleId = managerRole.RoleId
        };
        // Employee
        var emp = new Employee {
            EmployeeCode = "EMP003", FullName = "John Employee",
            Email = "employee@company.com", Status = "Active",
            JoiningDate = new DateOnly(2023, 6, 1),
            DepartmentId = itDept.DepartmentId, RoleId = employeeRole.RoleId
        };
        db.Employees.AddRange(adminEmp, managerEmp, emp);
        await db.SaveChangesAsync();

        db.Users.AddRange(
            new User {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123", 12),
                RoleId = adminRole.RoleId, EmployeeId = adminEmp.EmployeeId, IsActive = true
            },
            new User {
                Username = "manager1",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Manager@123", 12),
                RoleId = managerRole.RoleId, EmployeeId = managerEmp.EmployeeId, IsActive = true
            },
            new User {
                Username = "emp001",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Emp@123456", 12),
                RoleId = employeeRole.RoleId, EmployeeId = emp.EmployeeId, IsActive = true
            }
        );
        await db.SaveChangesAsync();
    }
}

*/