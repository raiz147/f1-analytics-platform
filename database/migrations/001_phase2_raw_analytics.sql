CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS raw.sessions (
    session_key INTEGER PRIMARY KEY,
    meeting_key INTEGER,
    session_name TEXT,
    country_name TEXT,
    circuit_short_name TEXT,
    date_start TIMESTAMPTZ,
    date_end TIMESTAMPTZ,
    source_system TEXT NOT NULL DEFAULT 'openf1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.laps (
    id BIGSERIAL PRIMARY KEY,
    session_key INTEGER NOT NULL REFERENCES raw.sessions(session_key),
    meeting_key INTEGER,
    driver_number INTEGER NOT NULL,
    lap_number INTEGER NOT NULL,
    stint_number INTEGER,
    lap_duration_seconds NUMERIC(8,3),
    is_pit_out_lap BOOLEAN,
    duration_sector_1_seconds NUMERIC(8,3),
    duration_sector_2_seconds NUMERIC(8,3),
    duration_sector_3_seconds NUMERIC(8,3),
    i1_speed INTEGER,
    i2_speed INTEGER,
    st_speed INTEGER,
    segments_sector_1 JSONB,
    segments_sector_2 JSONB,
    segments_sector_3 JSONB,
    date_start TIMESTAMPTZ,
    source_payload JSONB NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_raw_laps_session_driver_lap UNIQUE (session_key, driver_number, lap_number)
);

CREATE INDEX IF NOT EXISTS idx_raw_laps_session_key
    ON raw.laps (session_key);

CREATE INDEX IF NOT EXISTS idx_raw_laps_driver_number
    ON raw.laps (driver_number);

CREATE INDEX IF NOT EXISTS idx_raw_laps_meeting_key
    ON raw.laps (meeting_key);

CREATE INDEX IF NOT EXISTS idx_raw_laps_date_start
    ON raw.laps (date_start);

CREATE TABLE IF NOT EXISTS analytics.driver_session_summary (
    session_key INTEGER NOT NULL,
    driver_number INTEGER NOT NULL,
    meeting_key INTEGER,
    total_laps INTEGER NOT NULL,
    completed_laps INTEGER NOT NULL,
    valid_laps INTEGER NOT NULL,
    fastest_lap_seconds NUMERIC(8,3),
    average_lap_seconds NUMERIC(8,3),
    consistency_stddev_seconds NUMERIC(8,3),
    total_pit_out_laps INTEGER NOT NULL,
    first_lap_started_at TIMESTAMPTZ,
    last_lap_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, driver_number)
);

CREATE INDEX IF NOT EXISTS idx_driver_session_summary_session_key
    ON analytics.driver_session_summary (session_key);

CREATE TABLE IF NOT EXISTS analytics.session_fastest_laps (
    session_key INTEGER NOT NULL,
    driver_number INTEGER NOT NULL,
    meeting_key INTEGER,
    fastest_lap_seconds NUMERIC(8,3),
    lap_rank INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, driver_number)
);

CREATE INDEX IF NOT EXISTS idx_session_fastest_laps_session_key
    ON analytics.session_fastest_laps (session_key);
