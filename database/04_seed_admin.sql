INSERT INTO "Employees" ("EmployeeCode","FullName","Email","Status","JoiningDate","DepartmentId","RoleId")
VALUES ('EMP001','System Admin','admin@company.com','Active',NOW()::DATE,
  (SELECT "DepartmentId" FROM "Departments" WHERE "DepartmentName"='Administration'),
  (SELECT "RoleId" FROM "Roles" WHERE "RoleName"='Admin'));
 
INSERT INTO "Users" ("Username","PasswordHash","RoleId","EmployeeId")
VALUES (
  'admin',
  '$2a$12$LtjnJvPZOhH2uHF9TUiCE.CL1YhJl2QpVFe0kT3OPkOa5LWmKwX6u', -- Admin@123
  (SELECT "RoleId" FROM "Roles" WHERE "RoleName"='Admin'),
  (SELECT "EmployeeId" FROM "Employees" WHERE "EmployeeCode"='EMP001')
);