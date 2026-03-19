ALTER TABLE raw.sessions
    ADD COLUMN IF NOT EXISTS session_type TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT;

CREATE TABLE IF NOT EXISTS raw.drivers (
    session_key INTEGER NOT NULL REFERENCES raw.sessions(session_key),
    driver_number INTEGER NOT NULL,
    meeting_key INTEGER,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    broadcast_name TEXT,
    name_acronym TEXT,
    team_name TEXT,
    team_colour TEXT,
    headshot_url TEXT,
    country_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, driver_number)
);

CREATE INDEX IF NOT EXISTS idx_raw_drivers_session_key
    ON raw.drivers (session_key);
