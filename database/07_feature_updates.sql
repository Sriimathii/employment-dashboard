-- FEATURE 1: Soft delete for Employees
ALTER TABLE "Employees"
  ADD COLUMN IF NOT EXISTS "IsDeleted"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "DeletedAt"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "IsInactive" BOOLEAN NOT NULL DEFAULT FALSE;

-- FEATURE 2: Soft delete for Notifications
ALTER TABLE "Notifications"
  ADD COLUMN IF NOT EXISTS "IsDeleted" BOOLEAN NOT NULL DEFAULT FALSE;

-- FEATURE 4: Monthly leave limit tracking
ALTER TABLE "LeaveRequests"
  ADD COLUMN IF NOT EXISTS "MonthYear" VARCHAR(7); -- e.g. '2026-06'

-- Update existing leave records with MonthYear
UPDATE "LeaveRequests"
  SET "MonthYear" = TO_CHAR("StartDate", 'YYYY-MM')
  WHERE "MonthYear" IS NULL;

-- FEATURE 6: Inactive user tracking (already has IsActive on Users)
-- No change needed — IsActive = false means read-only

-- FEATURE 8: Password reset token on Users
ALTER TABLE "Users"
  ADD COLUMN IF NOT EXISTS "ResetToken"       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "ResetTokenExpiry" TIMESTAMPTZ;

-- Index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON "Users"("ResetToken")
  WHERE "ResetToken" IS NOT NULL;

-- Index for soft delete filter
CREATE INDEX IF NOT EXISTS idx_employees_not_deleted
  ON "Employees"("IsDeleted")
  WHERE "IsDeleted" = FALSE;