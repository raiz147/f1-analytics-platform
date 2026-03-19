CREATE TABLE IF NOT EXISTS raw.session_results (
    session_key INTEGER NOT NULL REFERENCES raw.sessions(session_key),
    driver_number INTEGER NOT NULL,
    meeting_key INTEGER,
    position INTEGER NOT NULL,
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

CREATE TABLE IF NOT EXISTS analytics.session_classification (
    session_key INTEGER NOT NULL,
    driver_number INTEGER NOT NULL,
    meeting_key INTEGER,
    finishing_position INTEGER NOT NULL,
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
