-- Feedback table
CREATE TABLE IF NOT EXISTS "Feedbacks" (
    "FeedbackId"  serial       PRIMARY KEY,
    "UserId"      integer      NOT NULL REFERENCES "Users"("UserId"),
    "Title"       varchar(200) NOT NULL,
    "Description" text         NOT NULL,
    "Category"    varchar(50)  NOT NULL DEFAULT 'General Feedback',
    "Status"      varchar(20)  NOT NULL DEFAULT 'New',
    "AdminReply"  text,
    "SubmittedAt" timestamp    NOT NULL DEFAULT NOW(),
    "ReviewedAt"  timestamp
);

-- Seed default contact & email settings (admin can override from Settings page)
INSERT INTO "AppSettings" ("Key", "Value") VALUES
    ('contact_hr_helpline',        '+91 00000 00001'),
    ('contact_office_reception',   '+91 00000 00002'),
    ('contact_it_support',         '+91 00000 00003'),
    ('contact_emergency',          '+91 00000 00004'),
    ('email_hr',                   'hr@company.com'),
    ('email_support',              'support@company.com'),
    ('email_admin',                'admin@company.com'),
    ('email_general',              'info@company.com'),
    ('support_email',              'support@company.com'),
    ('support_phone',              '+91 00000 00003'),
    ('support_helpline',           '+91 00000 00001'),
    ('support_hours',              'Monday – Friday, 9:00 AM – 6:00 PM'),
    ('company_name',               'WorkForce'),
    ('company_address',            'Company Address, City, State'),
    ('company_website',            'https://company.com')
ON CONFLICT ("Key") DO NOTHING;