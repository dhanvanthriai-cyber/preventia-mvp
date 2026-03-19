ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_subject VARCHAR(255),
    ADD COLUMN IF NOT EXISTS apple_subject VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_google_subject
    ON users (google_subject)
    WHERE google_subject IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_apple_subject
    ON users (apple_subject)
    WHERE apple_subject IS NOT NULL;
