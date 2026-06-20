CREATE TABLE "Roles" (
  "RoleId"   SERIAL PRIMARY KEY,
  "RoleName" VARCHAR(50) NOT NULL UNIQUE
);
 
CREATE TABLE "Departments" (
  "DepartmentId"   SERIAL PRIMARY KEY,
  "DepartmentName" VARCHAR(100) NOT NULL UNIQUE
);
 
CREATE TABLE "Employees" (
  "EmployeeId"   SERIAL PRIMARY KEY,
  "EmployeeCode" VARCHAR(20)  NOT NULL UNIQUE,
  "FullName"     VARCHAR(150) NOT NULL,
  "PhoneNumber"  VARCHAR(20),
  "Email"        VARCHAR(150) NOT NULL UNIQUE,
  "Salary"       NUMERIC(12,2),
  "DepartmentId" INT REFERENCES "Departments"("DepartmentId"),
  "RoleId"       INT REFERENCES "Roles"("RoleId"),
  "Status"       VARCHAR(10)  NOT NULL DEFAULT 'Active' CHECK ("Status" IN ('Active','Inactive')),
  "JoiningDate"  DATE         NOT NULL,
  "ProfileImage" TEXT,
  "Address"      TEXT
);
 
CREATE TABLE "Users" (
  "UserId"       SERIAL PRIMARY KEY,
  "Username"     VARCHAR(100) NOT NULL UNIQUE,
  "PasswordHash" TEXT         NOT NULL,
  "RoleId"       INT NOT NULL REFERENCES "Roles"("RoleId"),
  "EmployeeId"   INT UNIQUE   REFERENCES "Employees"("EmployeeId"),
  "IsActive"     BOOLEAN NOT NULL DEFAULT TRUE,
  "CreatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
 
CREATE TABLE "Attendance" (
  "AttendanceId"  SERIAL PRIMARY KEY,
  "EmployeeId"    INT          NOT NULL REFERENCES "Employees"("EmployeeId"),
  "AttendanceDate" DATE        NOT NULL,
  "CheckInTime"   TIME,
  "CheckOutTime"  TIME,
  "Status"        VARCHAR(20)  NOT NULL DEFAULT 'Present'
                  CHECK ("Status" IN ('Present','Absent','Late','Half Day','On Leave')),
  UNIQUE ("EmployeeId", "AttendanceDate")
);
 
CREATE TABLE "LeaveRequests" (
  "LeaveId"    SERIAL PRIMARY KEY,
  "EmployeeId" INT         NOT NULL REFERENCES "Employees"("EmployeeId"),
  "LeaveType"  VARCHAR(50) NOT NULL
               CHECK ("LeaveType" IN ('Annual','Sick','Casual','Maternity','Paternity','Unpaid','Other')),
  "StartDate"  DATE        NOT NULL,
  "EndDate"    DATE        NOT NULL,
  "Reason"     TEXT,
  "Status"     VARCHAR(20) NOT NULL DEFAULT 'Pending'
               CHECK ("Status" IN ('Pending','Approved','Rejected')),
  "ApprovedBy" INT REFERENCES "Users"("UserId"),
  "Remarks"    TEXT,
  "CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE "Notifications" (
  "NotificationId" SERIAL PRIMARY KEY,
  "Title"          VARCHAR(200) NOT NULL,
  "Message"        TEXT         NOT NULL,
  "CreatedDate"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "CreatedBy"      INT REFERENCES "Users"("UserId"),
  "IsGlobal"       BOOLEAN NOT NULL DEFAULT TRUE
);
 
CREATE TABLE "NotificationRecipients" (
  "Id"             SERIAL PRIMARY KEY,
  "NotificationId" INT NOT NULL REFERENCES "Notifications"("NotificationId"),
  "UserId"         INT NOT NULL REFERENCES "Users"("UserId"),
  "IsRead"         BOOLEAN NOT NULL DEFAULT FALSE,
  "ReadAt"         TIMESTAMPTZ
);
 
CREATE TABLE "Reports" (
  "ReportId"    SERIAL PRIMARY KEY,
  "Title"       VARCHAR(200) NOT NULL,
  "Description" TEXT,
  "FilePath"    TEXT,
  "CreatedDate" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "CreatedBy"   INT REFERENCES "Users"("UserId")
);
 
CREATE TABLE "AuditLogs" (
  "LogId"      SERIAL PRIMARY KEY,
  "Action"     VARCHAR(100) NOT NULL,
  "UserId"     INT REFERENCES "Users"("UserId"),
  "EntityType" VARCHAR(50),
  "EntityId"   INT,
  "OldValues"  JSONB,
  "NewValues"  JSONB,
  "IpAddress"  VARCHAR(45),
  "ActionDate" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
 
-- Indexes for performance
CREATE INDEX idx_attendance_employee   ON "Attendance"("EmployeeId");
CREATE INDEX idx_attendance_date       ON "Attendance"("AttendanceDate");
CREATE INDEX idx_leave_employee        ON "LeaveRequests"("EmployeeId");
CREATE INDEX idx_leave_status          ON "LeaveRequests"("Status");
CREATE INDEX idx_employees_department  ON "Employees"("DepartmentId");
CREATE INDEX idx_employees_status      ON "Employees"("Status");
CREATE INDEX idx_auditlogs_user        ON "AuditLogs"("UserId");