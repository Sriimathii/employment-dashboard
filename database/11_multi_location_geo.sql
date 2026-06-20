-- Add location name column to Attendance table
ALTER TABLE "Attendance"
    ADD COLUMN IF NOT EXISTS "CheckInLocationName" varchar(100);

-- Seed 4 geo-fencing location slots (all disabled by default)
-- Admin can enable and configure from Admin → Geo-Fencing page

-- Location 1: Main Office (configure your actual coordinates)
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_1_name',    'Main Office')     ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_1_lat',     '13.0827')         ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_1_lng',     '80.2707')         ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_1_radius',  '200')             ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_1_enabled', 'false')           ON CONFLICT ("Key") DO NOTHING;

-- Location 2: Branch Office
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_2_name',    'Branch Office')   ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_2_lat',     '0')               ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_2_lng',     '0')               ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_2_radius',  '200')             ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_2_enabled', 'false')           ON CONFLICT ("Key") DO NOTHING;

-- Location 3: Remote Hub
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_3_name',    'Remote Hub')      ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_3_lat',     '0')               ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_3_lng',     '0')               ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_3_radius',  '200')             ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_3_enabled', 'false')           ON CONFLICT ("Key") DO NOTHING;

-- Location 4: Field Office
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_4_name',    'Field Office')    ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_4_lat',     '0')               ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_4_lng',     '0')               ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_4_radius',  '200')             ON CONFLICT ("Key") DO NOTHING;
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_loc_4_enabled', 'false')           ON CONFLICT ("Key") DO NOTHING;

-- Master geo switch (must be true + at least 1 location enabled for geo to activate)
INSERT INTO "AppSettings" ("Key", "Value") VALUES ('geo_enabled', 'false') ON CONFLICT ("Key") DO NOTHING;