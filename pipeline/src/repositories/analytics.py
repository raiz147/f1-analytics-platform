from __future__ import annotations

from psycopg import Connection


class AnalyticsRepository:
    def __init__(self, connection: Connection) -> None:
        self._connection = connection

    def refresh_driver_session_summary(self, session_key: int) -> int:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                WITH aggregated AS (
                    SELECT
                        session_key,
                        driver_number,
                        MAX(meeting_key) AS meeting_key,
                        COUNT(*)::INTEGER AS total_laps,
                        COUNT(*) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                        )::INTEGER AS completed_laps,
                        COUNT(*) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        )::INTEGER AS valid_laps,
                        MIN(lap_duration_seconds) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        ) AS fastest_lap_seconds,
                        AVG(lap_duration_seconds) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        )::NUMERIC(8,3) AS average_lap_seconds,
                        STDDEV_POP(lap_duration_seconds) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        )::NUMERIC(8,3) AS consistency_stddev_seconds,
                        COUNT(*) FILTER (
                            WHERE COALESCE(is_pit_out_lap, FALSE) = TRUE
                        )::INTEGER AS total_pit_out_laps,
                        MIN(date_start) AS first_lap_started_at,
                        MAX(date_start) AS last_lap_started_at
                    FROM raw.laps
                    WHERE session_key = %s
                    GROUP BY session_key, driver_number
                )
                INSERT INTO analytics.driver_session_summary (
                    session_key,
                    driver_number,
                    meeting_key,
                    total_laps,
                    completed_laps,
                    valid_laps,
                    fastest_lap_seconds,
                    average_lap_seconds,
                    consistency_stddev_seconds,
                    total_pit_out_laps,
                    first_lap_started_at,
                    last_lap_started_at,
                    updated_at
                )
                SELECT
                    session_key,
                    driver_number,
                    meeting_key,
                    total_laps,
                    completed_laps,
                    valid_laps,
                    fastest_lap_seconds,
                    average_lap_seconds,
                    consistency_stddev_seconds,
                    total_pit_out_laps,
                    first_lap_started_at,
                    last_lap_started_at,
                    NOW()
                FROM aggregated
                ON CONFLICT (session_key, driver_number) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    total_laps = EXCLUDED.total_laps,
                    completed_laps = EXCLUDED.completed_laps,
                    valid_laps = EXCLUDED.valid_laps,
                    fastest_lap_seconds = EXCLUDED.fastest_lap_seconds,
                    average_lap_seconds = EXCLUDED.average_lap_seconds,
                    consistency_stddev_seconds = EXCLUDED.consistency_stddev_seconds,
                    total_pit_out_laps = EXCLUDED.total_pit_out_laps,
                    first_lap_started_at = EXCLUDED.first_lap_started_at,
                    last_lap_started_at = EXCLUDED.last_lap_started_at,
                    updated_at = NOW()
                """,
                (session_key,),
            )
            return cursor.rowcount

    def refresh_session_fastest_laps(self, session_key: int) -> int:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                WITH ranked AS (
                    SELECT
                        session_key,
                        driver_number,
                        meeting_key,
                        fastest_lap_seconds,
                        RANK() OVER (
                            PARTITION BY session_key
                            ORDER BY fastest_lap_seconds ASC NULLS LAST
                        )::INTEGER AS lap_rank
                    FROM analytics.driver_session_summary
                    WHERE session_key = %s
                )
                INSERT INTO analytics.session_fastest_laps (
                    session_key,
                    driver_number,
                    meeting_key,
                    fastest_lap_seconds,
                    lap_rank,
                    updated_at
                )
                SELECT
                    session_key,
                    driver_number,
                    meeting_key,
                    fastest_lap_seconds,
                    lap_rank,
                    NOW()
                FROM ranked
                ON CONFLICT (session_key, driver_number) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    fastest_lap_seconds = EXCLUDED.fastest_lap_seconds,
                    lap_rank = EXCLUDED.lap_rank,
                    updated_at = NOW()
                """,
                (session_key,),
            )
            return cursor.rowcount

    def refresh_session_overview(self, session_key: int) -> int:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                WITH aggregated AS (
                    SELECT
                        session_key,
                        MAX(meeting_key) AS meeting_key,
                        COUNT(DISTINCT driver_number)::INTEGER AS total_drivers,
                        MAX(lap_number)::INTEGER AS total_laps,
                        COUNT(*) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                        )::INTEGER AS completed_laps,
                        COUNT(*) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        )::INTEGER AS valid_laps,
                        AVG(lap_duration_seconds) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        )::NUMERIC(8,3) AS average_lap_seconds,
                        MIN(lap_duration_seconds) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        ) AS fastest_lap_seconds,
                        MAX(lap_duration_seconds) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        ) AS slowest_lap_seconds,
                        COUNT(*) FILTER (
                            WHERE COALESCE(is_pit_out_lap, FALSE) = TRUE
                        )::INTEGER AS total_pit_out_laps,
                        MIN(date_start) AS first_lap_started_at,
                        MAX(date_start) AS last_lap_started_at
                    FROM raw.laps
                    WHERE session_key = %s
                    GROUP BY session_key
                )
                INSERT INTO analytics.session_overview (
                    session_key,
                    meeting_key,
                    total_drivers,
                    total_laps,
                    completed_laps,
                    valid_laps,
                    average_lap_seconds,
                    fastest_lap_seconds,
                    slowest_lap_seconds,
                    total_pit_out_laps,
                    first_lap_started_at,
                    last_lap_started_at,
                    updated_at
                )
                SELECT
                    session_key,
                    meeting_key,
                    total_drivers,
                    total_laps,
                    completed_laps,
                    valid_laps,
                    average_lap_seconds,
                    fastest_lap_seconds,
                    slowest_lap_seconds,
                    total_pit_out_laps,
                    first_lap_started_at,
                    last_lap_started_at,
                    NOW()
                FROM aggregated
                ON CONFLICT (session_key) DO UPDATE
                SET meeting_key = EXCLUDED.meeting_key,
                    total_drivers = EXCLUDED.total_drivers,
                    total_laps = EXCLUDED.total_laps,
                    completed_laps = EXCLUDED.completed_laps,
                    valid_laps = EXCLUDED.valid_laps,
                    average_lap_seconds = EXCLUDED.average_lap_seconds,
                    fastest_lap_seconds = EXCLUDED.fastest_lap_seconds,
                    slowest_lap_seconds = EXCLUDED.slowest_lap_seconds,
                    total_pit_out_laps = EXCLUDED.total_pit_out_laps,
                    first_lap_started_at = EXCLUDED.first_lap_started_at,
                    last_lap_started_at = EXCLUDED.last_lap_started_at,
                    updated_at = NOW()
                """,
                (session_key,),
            )
            return cursor.rowcount

    def refresh_driver_stint_summary(self, session_key: int) -> int:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM analytics.driver_stint_summary
                WHERE session_key = %s
                """,
                (session_key,),
            )
            cursor.execute(
                """
                WITH lap_groups AS (
                    SELECT
                        l.session_key,
                        l.driver_number,
                        l.meeting_key,
                        l.lap_number,
                        l.lap_duration_seconds,
                        l.is_pit_out_lap,
                        l.duration_sector_1_seconds,
                        l.duration_sector_2_seconds,
                        l.duration_sector_3_seconds,
                        l.date_start,
                        SUM(
                            CASE
                                WHEN l.lap_number = 1 OR COALESCE(l.is_pit_out_lap, FALSE) = TRUE
                                    THEN 1
                                ELSE 0
                            END
                        ) OVER (
                            PARTITION BY l.session_key, l.driver_number
                            ORDER BY l.lap_number
                            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                        )::INTEGER AS inferred_stint_number
                    FROM raw.laps AS l
                    WHERE l.session_key = %s
                ),
                aggregated AS (
                    SELECT
                        session_key,
                        driver_number,
                        inferred_stint_number AS stint_number,
                        MAX(meeting_key) AS meeting_key,
                        inferred_stint_number,
                        COUNT(*)::INTEGER AS laps_in_stint,
                        COUNT(*) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        )::INTEGER AS valid_laps_in_stint,
                        MIN(lap_duration_seconds) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        ) AS fastest_lap_seconds,
                        AVG(lap_duration_seconds) FILTER (
                            WHERE lap_duration_seconds IS NOT NULL
                              AND COALESCE(is_pit_out_lap, FALSE) = FALSE
                        )::NUMERIC(8,3) AS average_lap_seconds,
                        AVG(duration_sector_1_seconds) FILTER (
                            WHERE duration_sector_1_seconds IS NOT NULL
                        )::NUMERIC(8,3) AS average_sector_1_seconds,
                        AVG(duration_sector_2_seconds) FILTER (
                            WHERE duration_sector_2_seconds IS NOT NULL
                        )::NUMERIC(8,3) AS average_sector_2_seconds,
                        AVG(duration_sector_3_seconds) FILTER (
                            WHERE duration_sector_3_seconds IS NOT NULL
                        )::NUMERIC(8,3) AS average_sector_3_seconds,
                        MIN(lap_number)::INTEGER AS first_lap_number,
                        MAX(lap_number)::INTEGER AS last_lap_number,
                        MIN(date_start) AS stint_started_at,
                        MAX(date_start) AS stint_ended_at
                    FROM lap_groups
                    GROUP BY session_key, driver_number, inferred_stint_number
                ),
                enriched AS (
                    SELECT
                        a.session_key,
                        a.driver_number,
                        a.stint_number,
                        a.meeting_key,
                        a.inferred_stint_number,
                        rs.compound AS tyre_compound,
                        rs.tyre_age_at_start,
                        a.laps_in_stint,
                        a.valid_laps_in_stint,
                        a.fastest_lap_seconds,
                        a.average_lap_seconds,
                        a.average_sector_1_seconds,
                        a.average_sector_2_seconds,
                        a.average_sector_3_seconds,
                        a.first_lap_number,
                        a.last_lap_number,
                        a.stint_started_at,
                        a.stint_ended_at
                    FROM aggregated AS a
                    LEFT JOIN LATERAL (
                        SELECT
                            rs.compound,
                            rs.tyre_age_at_start
                        FROM raw.stints AS rs
                        WHERE rs.session_key = a.session_key
                          AND rs.driver_number = a.driver_number
                          AND (
                                rs.stint_number = a.inferred_stint_number
                             OR (
                                    rs.lap_start IS NOT NULL
                                AND a.first_lap_number >= rs.lap_start
                                AND (rs.lap_end IS NULL OR a.last_lap_number <= rs.lap_end)
                             )
                          )
                        ORDER BY
                            CASE
                                WHEN rs.stint_number = a.inferred_stint_number THEN 0
                                ELSE 1
                            END,
                            rs.lap_start NULLS LAST
                        LIMIT 1
                    ) AS rs
                      ON TRUE
                )
                INSERT INTO analytics.driver_stint_summary (
                    session_key,
                    driver_number,
                    stint_number,
                    meeting_key,
                    inferred_stint_number,
                    tyre_compound,
                    tyre_age_at_start,
                    laps_in_stint,
                    valid_laps_in_stint,
                    fastest_lap_seconds,
                    average_lap_seconds,
                    average_sector_1_seconds,
                    average_sector_2_seconds,
                    average_sector_3_seconds,
                    first_lap_number,
                    last_lap_number,
                    stint_started_at,
                    stint_ended_at,
                    updated_at
                )
                SELECT
                    session_key,
                    driver_number,
                    stint_number,
                    meeting_key,
                    inferred_stint_number,
                    tyre_compound,
                    tyre_age_at_start,
                    laps_in_stint,
                    valid_laps_in_stint,
                    fastest_lap_seconds,
                    average_lap_seconds,
                    average_sector_1_seconds,
                    average_sector_2_seconds,
                    average_sector_3_seconds,
                    first_lap_number,
                    last_lap_number,
                    stint_started_at,
                    stint_ended_at,
                    NOW()
                FROM enriched
                """,
                (session_key,),
            )
            return cursor.rowcount

    def refresh_session_classification(self, session_key: int) -> int:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM analytics.session_classification
                WHERE session_key = %s
                """,
                (session_key,),
            )
            cursor.execute(
                """
                INSERT INTO analytics.session_classification (
                    session_key,
                    driver_number,
                    meeting_key,
                    finishing_position,
                    grid_position,
                    position_delta,
                    dnf,
                    dns,
                    dsq,
                    number_of_laps,
                    duration_value,
                    gap_to_leader_value,
                    updated_at
                )
                WITH driver_pool AS (
                    SELECT session_key, driver_number, meeting_key
                    FROM raw.drivers
                    WHERE session_key = %s

                    UNION

                    SELECT session_key, driver_number, meeting_key
                    FROM raw.session_results
                    WHERE session_key = %s

                    UNION

                    SELECT session_key, driver_number, meeting_key
                    FROM raw.starting_grid
                    WHERE session_key = %s
                )
                SELECT
                    d.session_key,
                    d.driver_number,
                    COALESCE(sr.meeting_key, sg.meeting_key, d.meeting_key) AS meeting_key,
                    sr.position AS finishing_position,
                    sg.grid_position,
                    CASE
                        WHEN sg.grid_position IS NOT NULL
                         AND sr.position IS NOT NULL THEN sg.grid_position - sr.position
                        ELSE NULL
                    END AS position_delta,
                    sr.dnf,
                    sr.dns,
                    sr.dsq,
                    sr.number_of_laps,
                    sr.duration_value,
                    sr.gap_to_leader_value,
                    NOW()
                FROM driver_pool AS d
                LEFT JOIN raw.session_results AS sr
                  ON sr.session_key = d.session_key
                 AND sr.driver_number = d.driver_number
                LEFT JOIN raw.starting_grid AS sg
                  ON sg.session_key = d.session_key
                 AND sg.driver_number = d.driver_number
                WHERE d.session_key = %s
                """,
                (session_key, session_key, session_key, session_key),
            )
            return cursor.rowcount
