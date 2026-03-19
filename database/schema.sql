CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS raw.sessions (
    session_key INTEGER PRIMARY KEY,
    meeting_key INTEGER,
    session_name TEXT,
    session_type TEXT,
    country_name TEXT,
    circuit_short_name TEXT,
    location TEXT,
    date_start TIMESTAMPTZ,
    date_end TIMESTAMPTZ,
    source_system TEXT NOT NULL DEFAULT 'openf1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_raw_drivers_session_key
    ON raw.drivers (session_key);

CREATE TABLE IF NOT EXISTS raw.weather (
    session_key INTEGER NOT NULL REFERENCES raw.sessions(session_key),
    date TIMESTAMPTZ NOT NULL,
    meeting_key INTEGER,
    air_temperature NUMERIC(5,2),
    humidity NUMERIC(5,2),
    pressure NUMERIC(8,2),
    rainfall BOOLEAN,
    track_temperature NUMERIC(5,2),
    wind_direction INTEGER,
    wind_speed NUMERIC(6,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, date)
);

CREATE TABLE IF NOT EXISTS raw.race_control (
    session_key INTEGER NOT NULL REFERENCES raw.sessions(session_key),
    date TIMESTAMPTZ NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    driver_number INTEGER,
    flag TEXT,
    lap_number INTEGER,
    meeting_key INTEGER,
    scope TEXT,
    sector INTEGER,
    qualifying_phase INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, date, category, message)
);

CREATE INDEX IF NOT EXISTS idx_raw_weather_session_key
    ON raw.weather (session_key);

CREATE INDEX IF NOT EXISTS idx_raw_race_control_session_key
    ON raw.race_control (session_key);

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

CREATE TABLE IF NOT EXISTS raw.session_results (
    session_key INTEGER NOT NULL REFERENCES raw.sessions(session_key),
    driver_number INTEGER NOT NULL,
    meeting_key INTEGER,
    position INTEGER,
    dnf BOOLEAN,
    dns BOOLEAN,
    dsq BOOLEAN,
    number_of_laps INTEGER,
    duration_value JSONB,
    gap_to_leader_value JSONB,
    source_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, driver_number)
);

CREATE INDEX IF NOT EXISTS idx_raw_session_results_session_key
    ON raw.session_results (session_key);

CREATE TABLE IF NOT EXISTS raw.starting_grid (
    session_key INTEGER NOT NULL REFERENCES raw.sessions(session_key),
    driver_number INTEGER NOT NULL,
    meeting_key INTEGER,
    grid_position INTEGER NOT NULL,
    lap_duration_seconds NUMERIC(8,3),
    source_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, driver_number)
);

CREATE INDEX IF NOT EXISTS idx_raw_starting_grid_session_key
    ON raw.starting_grid (session_key);

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

CREATE TABLE IF NOT EXISTS analytics.session_overview (
    session_key INTEGER PRIMARY KEY,
    meeting_key INTEGER,
    total_drivers INTEGER NOT NULL,
    total_laps INTEGER NOT NULL,
    completed_laps INTEGER NOT NULL,
    valid_laps INTEGER NOT NULL,
    average_lap_seconds NUMERIC(8,3),
    fastest_lap_seconds NUMERIC(8,3),
    slowest_lap_seconds NUMERIC(8,3),
    total_pit_out_laps INTEGER NOT NULL,
    first_lap_started_at TIMESTAMPTZ,
    last_lap_started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics.driver_stint_summary (
    session_key INTEGER NOT NULL,
    driver_number INTEGER NOT NULL,
    stint_number INTEGER NOT NULL,
    meeting_key INTEGER,
    inferred_stint_number INTEGER,
    tyre_compound TEXT,
    tyre_age_at_start INTEGER,
    laps_in_stint INTEGER NOT NULL,
    valid_laps_in_stint INTEGER NOT NULL,
    fastest_lap_seconds NUMERIC(8,3),
    average_lap_seconds NUMERIC(8,3),
    average_sector_1_seconds NUMERIC(8,3),
    average_sector_2_seconds NUMERIC(8,3),
    average_sector_3_seconds NUMERIC(8,3),
    first_lap_number INTEGER,
    last_lap_number INTEGER,
    stint_started_at TIMESTAMPTZ,
    stint_ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, driver_number, stint_number)
);

ALTER TABLE analytics.driver_stint_summary
    ADD COLUMN IF NOT EXISTS inferred_stint_number INTEGER,
    ADD COLUMN IF NOT EXISTS tyre_compound TEXT,
    ADD COLUMN IF NOT EXISTS tyre_age_at_start INTEGER;

CREATE INDEX IF NOT EXISTS idx_driver_stint_summary_session_key
    ON analytics.driver_stint_summary (session_key);

CREATE INDEX IF NOT EXISTS idx_driver_stint_summary_driver
    ON analytics.driver_stint_summary (driver_number);

CREATE TABLE IF NOT EXISTS analytics.session_classification (
    session_key INTEGER NOT NULL,
    driver_number INTEGER NOT NULL,
    meeting_key INTEGER,
    finishing_position INTEGER,
    grid_position INTEGER,
    position_delta INTEGER,
    dnf BOOLEAN,
    dns BOOLEAN,
    dsq BOOLEAN,
    number_of_laps INTEGER,
    duration_value JSONB,
    gap_to_leader_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_key, driver_number)
);

CREATE INDEX IF NOT EXISTS idx_session_classification_session_key
    ON analytics.session_classification (session_key);
