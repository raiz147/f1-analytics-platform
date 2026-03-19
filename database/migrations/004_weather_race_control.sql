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
