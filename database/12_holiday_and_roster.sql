CREATE TABLE IF NOT EXISTS "Holidays" (
    "HolidayId"   serial      PRIMARY KEY,
    "HolidayDate" date        NOT NULL UNIQUE,
    "Name"        varchar(100) NOT NULL,
    "HolidayType" varchar(20)  NOT NULL DEFAULT 'National',
    "Year"        integer      NOT NULL
);

CREATE INDEX IF NOT EXISTS "IX_Holidays_Year" ON "Holidays" ("Year");

-- Seed 2026 Indian national holidays (customize as needed)
INSERT INTO "Holidays" ("HolidayDate", "Name", "HolidayType", "Year") VALUES
    ('2026-01-01', 'New Year''s Day',         'National',  2026),
    ('2026-01-26', 'Republic Day',             'National',  2026),
    ('2026-03-17', 'Holi',                     'National',  2026),
    ('2026-04-06', 'Ram Navami',               'National',  2026),
    ('2026-04-14', 'Dr. Ambedkar Jayanti',     'National',  2026),
    ('2026-05-01', 'Labour Day',               'National',  2026),
    ('2026-08-15', 'Independence Day',         'National',  2026),
    ('2026-10-02', 'Gandhi Jayanti',           'National',  2026),
    ('2026-10-24', 'Dussehra',                'National',  2026),
    ('2026-11-14', 'Diwali',                  'National',  2026),
    ('2026-12-25', 'Christmas Day',            'National',  2026)
ON CONFLICT ("HolidayDate") DO NOTHING;