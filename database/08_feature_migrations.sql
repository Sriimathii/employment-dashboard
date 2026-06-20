-- Add MonthlyLeaveBalance to Employees
ALTER TABLE "Employees"
    ADD COLUMN IF NOT EXISTS "MonthlyLeaveBalance" integer NOT NULL DEFAULT 3;

-- Add geo-fencing fields to Attendance
ALTER TABLE "Attendance"
    ADD COLUMN IF NOT EXISTS "CheckInLatitude"  double precision,
    ADD COLUMN IF NOT EXISTS "CheckInLongitude" double precision;

-- Create AppSettings table
CREATE TABLE IF NOT EXISTS "AppSettings" (
    "SettingId" serial       PRIMARY KEY,
    "Key"       varchar(100) NOT NULL UNIQUE,
    "Value"     varchar(500) NOT NULL
);

-- Seed default geo-fencing settings (disabled by default)
INSERT INTO "AppSettings" ("Key", "Value")
VALUES
    ('geo_enabled', 'false'),
    ('geo_lat',     '13.0827'),   -- Chennai, Tamil Nadu default
    ('geo_lng',     '80.2707'),
    ('geo_radius',  '200')
ON CONFLICT ("Key") DO NOTHING;

COMMENT ON TABLE "AppSettings" IS 'Admin-configurable key-value settings including geo-fencing';