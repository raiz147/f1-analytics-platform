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

CREATE INDEX IF NOT EXISTS idx_driver_stint_summary_session_key
    ON analytics.driver_stint_summary (session_key);

CREATE INDEX IF NOT EXISTS idx_driver_stint_summary_driver
    ON analytics.driver_stint_summary (driver_number);
