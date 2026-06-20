ALTER TABLE "Attendance"
    ADD COLUMN IF NOT EXISTS "CheckOutLatitude"  double precision,
    ADD COLUMN IF NOT EXISTS "CheckOutLongitude" double precision;

-- Ensure geo settings exist with defaults
INSERT INTO "AppSettings" ("Key", "Value")
VALUES
    ('geo_enabled', 'false'),
    ('geo_lat',     '13.0827'),
    ('geo_lng',     '80.2707'),
    ('geo_radius',  '200')
ON CONFLICT ("Key") DO NOTHING;