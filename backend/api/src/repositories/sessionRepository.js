import { pool } from "../db/pool.js";
import { findTrackMetadata } from "../data/tracks.js";

export async function searchSessions({ year, track, format }) {
  const metadata = findTrackMetadata(track);
  const aliases = metadata?.aliases ?? [track];
  const query = `
    SELECT
      s.session_key,
      s.meeting_key,
      s.session_name,
      s.session_type,
      s.country_name,
      s.circuit_short_name,
      s.location,
      s.date_start,
      s.date_end
    FROM raw.sessions AS s
    WHERE EXTRACT(YEAR FROM s.date_start) = $1
      AND (
        ${aliases
          .map(
            (_alias, index) => `
        s.country_name ILIKE $${index + 2}
        OR s.circuit_short_name ILIKE $${index + 2}
        OR s.location ILIKE $${index + 2}`
          )
          .join(" OR ")}
      )
      AND ($${aliases.length + 2}::text IS NULL OR s.session_name ILIKE $${aliases.length + 2} OR s.session_type ILIKE $${aliases.length + 2})
    ORDER BY s.date_start DESC, s.session_key DESC
  `;

  const trackPatterns = aliases.map((alias) => `%${alias}%`);
  const formatPattern = format ? `%${format}%` : null;
  const result = await pool.query(query, [year, ...trackPatterns, formatPattern]);
  return result.rows;
}

export async function listSeasonSessions(year) {
  const query = `
    SELECT DISTINCT
      s.meeting_key,
      s.country_name,
      s.circuit_short_name,
      s.location,
      s.date_start
    FROM raw.sessions AS s
    WHERE EXTRACT(YEAR FROM s.date_start) = $1
    ORDER BY s.date_start ASC, s.meeting_key ASC
  `;

  const result = await pool.query(query, [year]);
  return result.rows;
}

export async function getSessionOverview(sessionKey) {
  const query = `
    SELECT
      o.session_key,
      o.meeting_key,
      s.session_name,
      s.session_type,
      s.country_name,
      s.circuit_short_name,
      s.location,
      s.date_start AS session_date_start,
      s.date_end AS session_date_end,
      o.total_drivers,
      o.total_laps,
      o.completed_laps,
      o.valid_laps,
      o.average_lap_seconds,
      o.fastest_lap_seconds,
      o.slowest_lap_seconds,
      o.total_pit_out_laps,
      o.first_lap_started_at,
      o.last_lap_started_at
    FROM analytics.session_overview AS o
    LEFT JOIN raw.sessions AS s
      ON s.session_key = o.session_key
    WHERE o.session_key = $1
  `;

  const result = await pool.query(query, [sessionKey]);
  return result.rows[0] ?? null;
}

export async function getSessionLeaderboard(sessionKey) {
  const query = `
    SELECT
      s.driver_number,
      d.full_name,
      d.name_acronym,
      d.team_name,
      s.fastest_lap_seconds,
      s.lap_rank,
      ds.total_laps,
      ds.completed_laps,
      ds.valid_laps,
      ds.average_lap_seconds,
      ds.consistency_stddev_seconds,
      ds.total_pit_out_laps
    FROM analytics.session_fastest_laps AS s
    INNER JOIN analytics.driver_session_summary AS ds
      ON ds.session_key = s.session_key
     AND ds.driver_number = s.driver_number
    LEFT JOIN raw.drivers AS d
      ON d.session_key = s.session_key
     AND d.driver_number = s.driver_number
    WHERE s.session_key = $1
    ORDER BY s.lap_rank ASC, s.driver_number ASC
  `;

  const result = await pool.query(query, [sessionKey]);
  return result.rows;
}

export async function getSessionDrivers(sessionKey) {
  const query = `
    SELECT
      ds.driver_number,
      d.full_name,
      d.name_acronym,
      d.team_name,
      d.team_colour,
      d.headshot_url,
      ds.meeting_key,
      ds.total_laps,
      ds.completed_laps,
      ds.valid_laps,
      ds.fastest_lap_seconds,
      ds.average_lap_seconds,
      ds.consistency_stddev_seconds,
      ds.total_pit_out_laps,
      ds.first_lap_started_at,
      ds.last_lap_started_at
    FROM analytics.driver_session_summary AS ds
    LEFT JOIN raw.drivers AS d
      ON d.session_key = ds.session_key
     AND d.driver_number = ds.driver_number
    WHERE ds.session_key = $1
    ORDER BY ds.driver_number ASC
  `;

  const result = await pool.query(query, [sessionKey]);
  return result.rows;
}

export async function getDriverSessionPerformance(sessionKey, driverNumber) {
  const query = `
    SELECT
      d.session_key,
      d.driver_number,
      rd.first_name,
      rd.last_name,
      rd.full_name,
      rd.broadcast_name,
      rd.name_acronym,
      rd.team_name,
      rd.team_colour,
      rd.headshot_url,
      d.meeting_key,
      d.total_laps,
      d.completed_laps,
      d.valid_laps,
      d.fastest_lap_seconds,
      d.average_lap_seconds,
      d.consistency_stddev_seconds,
      d.total_pit_out_laps,
      d.first_lap_started_at,
      d.last_lap_started_at,
      s.lap_rank,
      c.finishing_position,
      c.grid_position,
      c.position_delta,
      c.dnf,
      c.dns,
      c.dsq,
      c.number_of_laps AS classified_laps,
      c.duration_value,
      c.gap_to_leader_value
    FROM analytics.driver_session_summary AS d
    LEFT JOIN analytics.session_fastest_laps AS s
      ON s.session_key = d.session_key
     AND s.driver_number = d.driver_number
    LEFT JOIN analytics.session_classification AS c
      ON c.session_key = d.session_key
     AND c.driver_number = d.driver_number
    LEFT JOIN raw.drivers AS rd
      ON rd.session_key = d.session_key
     AND rd.driver_number = d.driver_number
    WHERE d.session_key = $1
      AND d.driver_number = $2
  `;

  const result = await pool.query(query, [sessionKey, driverNumber]);
  return result.rows[0] ?? null;
}

export async function getSessionResults(sessionKey) {
  const query = `
    SELECT
      c.session_key,
      c.driver_number,
      d.full_name,
      d.name_acronym,
      d.team_name,
      d.team_colour,
      c.finishing_position,
      c.grid_position,
      c.position_delta,
      c.dnf,
      c.dns,
      c.dsq,
      c.number_of_laps,
      c.duration_value,
      c.gap_to_leader_value
    FROM analytics.session_classification AS c
    LEFT JOIN raw.drivers AS d
      ON d.session_key = c.session_key
     AND d.driver_number = c.driver_number
    WHERE c.session_key = $1
    ORDER BY c.finishing_position ASC NULLS LAST, c.grid_position ASC NULLS LAST, c.driver_number ASC
  `;

  const result = await pool.query(query, [sessionKey]);
  return result.rows;
}

export async function getSessionStints(sessionKey) {
  const query = `
    SELECT
      ds.session_key,
      ds.driver_number,
      rd.full_name,
      rd.name_acronym,
      rd.team_name,
      ds.stint_number,
      ds.inferred_stint_number,
      ds.tyre_compound,
      ds.tyre_age_at_start,
      ds.meeting_key,
      ds.laps_in_stint,
      ds.valid_laps_in_stint,
      ds.fastest_lap_seconds,
      ds.average_lap_seconds,
      ds.average_sector_1_seconds,
      ds.average_sector_2_seconds,
      ds.average_sector_3_seconds,
      ds.first_lap_number,
      ds.last_lap_number,
      ds.stint_started_at,
      ds.stint_ended_at
    FROM analytics.driver_stint_summary AS ds
    LEFT JOIN raw.drivers AS rd
      ON rd.session_key = ds.session_key
     AND rd.driver_number = ds.driver_number
    WHERE ds.session_key = $1
    ORDER BY ds.driver_number ASC, ds.stint_number ASC
  `;

  const result = await pool.query(query, [sessionKey]);
  return result.rows;
}

export async function getDriverLapDetails(sessionKey, driverNumber) {
  const query = `
    SELECT
      session_key,
      driver_number,
      lap_number,
      stint_number,
      lap_duration_seconds,
      is_pit_out_lap,
      duration_sector_1_seconds,
      duration_sector_2_seconds,
      duration_sector_3_seconds,
      i1_speed,
      i2_speed,
      st_speed,
      date_start
    FROM raw.laps
    WHERE session_key = $1
      AND driver_number = $2
    ORDER BY lap_number ASC
  `;

  const result = await pool.query(query, [sessionKey, driverNumber]);
  return result.rows;
}

export async function getLatestSessionWeather(sessionKey) {
  const query = `
    SELECT
      session_key,
      date,
      air_temperature,
      humidity,
      pressure,
      rainfall,
      track_temperature,
      wind_direction,
      wind_speed
    FROM raw.weather
    WHERE session_key = $1
    ORDER BY date DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [sessionKey]);
  return result.rows[0] ?? null;
}

export async function getRecentRaceControl(sessionKey, limit) {
  const query = `
    SELECT
      rc.session_key,
      rc.date,
      rc.category,
      rc.message,
      rc.driver_number,
      d.full_name,
      d.name_acronym,
      rc.flag,
      rc.lap_number,
      rc.scope,
      rc.sector
    FROM raw.race_control AS rc
    LEFT JOIN raw.drivers AS d
      ON d.session_key = rc.session_key
     AND d.driver_number = rc.driver_number
    WHERE rc.session_key = $1
    ORDER BY rc.date DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [sessionKey, limit]);
  return result.rows;
}
