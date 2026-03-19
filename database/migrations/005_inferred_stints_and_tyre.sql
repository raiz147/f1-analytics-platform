CREATE TABLE IF NOT EXISTS raw.stints (
    session_key INTEGER NOT NULL REFERENCES raw.sessions(session_key),
    driver_number INTEGER NOT NULL,
    stint_number INTEGER NOT NULL,
    meeting_key INTEGER,
    lap_start INTEGER,
    lap_end INTEGER,
    compound TEXT,
    tyre_age_at_start INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, driver_number, stint_number)
);

CREATE INDEX IF NOT EXISTS idx_raw_stints_session_key
    ON raw.stints (session_key);

ALTER TABLE analytics.driver_stint_summary
    ADD COLUMN IF NOT EXISTS inferred_stint_number INTEGER,
    ADD COLUMN IF NOT EXISTS tyre_compound TEXT,
    ADD COLUMN IF NOT EXISTS tyre_age_at_start INTEGER;
