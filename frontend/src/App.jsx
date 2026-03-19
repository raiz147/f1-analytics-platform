import { useEffect, useState } from "react";

import {
  fetchDriver,
  fetchDriverLaps,
  fetchDrivers,
  fetchTrackMetadata,
  fetchHealth,
  importSession,
  fetchLeaderboard,
  fetchLatestWeather,
  fetchRaceControl,
  fetchSessionOverview,
  fetchSessionResults,
  discoverSessions,
  fetchSessionStints,
  searchSessions
} from "./api";
import { formatLapTime, formatNumber } from "./utils/formatters";

const DEFAULT_SESSION_KEY = "";
const DEFAULT_SEARCH = {
  year: "",
  track: "",
  format: ""
};
const FALLBACK_YEAR_OPTIONS = ["2023", "2024", "2025", "2026"];

function formatDriverLabel(driver) {
  if (!driver) {
    return "--";
  }

  if (driver.full_name) {
    return driver.full_name;
  }

  if (driver.name_acronym) {
    return `${driver.name_acronym} (#${driver.driver_number})`;
  }

  return `#${driver.driver_number}`;
}

function formatTeamColor(teamColour) {
  if (!teamColour) {
    return "#ff6e40";
  }

  return teamColour.startsWith("#") ? teamColour : `#${teamColour}`;
}

function formatTyreCompound(compound) {
  if (!compound) {
    return "Unknown tyre";
  }

  return compound;
}

function formatTyreLabel(compound) {
  const normalizedCompound = formatTyreCompound(compound);
  return normalizedCompound === "Unknown tyre" ? normalizedCompound : `${normalizedCompound} tyre`;
}

function getTyreCompoundColor(compound) {
  switch (compound) {
    case "HARD":
      return "#9aa4b2";
    case "MEDIUM":
      return "#d8b11e";
    case "SOFT":
      return "#d84a4a";
    case "INTERMEDIATE":
      return "#3ea76a";
    case "WET":
      return "#2e63d1";
    default:
      return "#6c7684";
  }
}

function getTyreCompoundShade(compound) {
  switch (compound) {
    case "HARD":
      return "rgba(154, 164, 178, 0.16)";
    case "MEDIUM":
      return "rgba(216, 177, 30, 0.18)";
    case "SOFT":
      return "rgba(216, 74, 74, 0.18)";
    case "INTERMEDIATE":
      return "rgba(62, 167, 106, 0.18)";
    case "WET":
      return "rgba(46, 99, 209, 0.18)";
    default:
      return "rgba(108, 118, 132, 0.16)";
  }
}

function formatLapCount(stint) {
  return `${stint.valid_laps_in_stint}/${stint.laps_in_stint}`;
}

function formatResultValue(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  if (Array.isArray(value)) {
    const parts = value.map((item) => formatResultValue(item)).filter((item) => item !== "--");
    return parts.length > 0 ? parts.join(" / ") : "--";
  }

  if (typeof value === "number") {
    return formatLapTime(value);
  }

  return String(value);
}

function formatGapToLeader(value) {
  if (value === null || value === undefined) {
    return "--";
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatGapToLeader(item))
      .filter((item) => item !== "--");
    return parts.length > 0 ? parts.join(" / ") : "--";
  }

  if (typeof value === "number") {
    return value === 0 ? "Leader" : `+${formatLapTime(value)}`;
  }

  return String(value);
}

function formatPositionDelta(delta) {
  if (delta === null || delta === undefined) {
    return "--";
  }

  if (delta > 0) {
    return `+${delta}`;
  }

  return `${delta}`;
}

function formatGapFromLeader(value, leaderValue) {
  if (value === null || value === undefined || leaderValue === null || leaderValue === undefined) {
    return "--";
  }

  const gap = Number(value) - Number(leaderValue);
  if (Math.abs(gap) < 0.0005) {
    return "Leader";
  }

  return `+${gap.toFixed(3)}`;
}

function getQualifyingPhaseTime(values, phaseIndex) {
  if (!Array.isArray(values)) {
    return null;
  }

  const value = values[phaseIndex];
  return typeof value === "number" ? value : null;
}

function getQualifyingPhaseStatus(values) {
  const q3 = getQualifyingPhaseTime(values, 2);
  const q2 = getQualifyingPhaseTime(values, 1);
  const q1 = getQualifyingPhaseTime(values, 0);

  if (q3 !== null) {
    return "Reached Q3";
  }

  if (q2 !== null) {
    return "Reached Q2";
  }

  if (q1 !== null) {
    return "Eliminated in Q1";
  }

  return "No phase time";
}

function getBiggestGainer(results) {
  return results.reduce((best, row) => {
    if (row.position_delta === null || row.position_delta === undefined) {
      return best;
    }

    if (!best || row.position_delta > best.position_delta) {
      return row;
    }

    return best;
  }, null);
}

function getRaceClassificationStatus(result) {
  if (!result) {
    return "--";
  }

  if (result.dsq) {
    return "DSQ";
  }

  if (result.dns) {
    return "DNS";
  }

  if (result.dnf) {
    return "DNF";
  }

  return formatResultValue(result.duration_value);
}

function getResultGapDisplay(result) {
  if (!result) {
    return "--";
  }

  if (result.dsq || result.dns || result.dnf) {
    return getRaceClassificationStatus(result);
  }

  const gapDisplay = formatGapToLeader(result.gap_to_leader_value);
  if (gapDisplay !== "--") {
    return gapDisplay;
  }

  return formatResultValue(result.duration_value);
}

function getSessionFormat(sessionType) {
  const normalizedType = (sessionType ?? "").toLowerCase();

  if (normalizedType.includes("practice")) {
    return "practice";
  }

  if (normalizedType.includes("qualifying") || normalizedType === "sprint shootout") {
    return "qualifying";
  }

  if (normalizedType.includes("race") || normalizedType.includes("sprint")) {
    return "race";
  }

  return "other";
}

function buildSessionOptions(sessionNames) {
  const sessionOrder = new Map([
    ["Practice 1", 1],
    ["Practice 2", 2],
    ["Practice 3", 3],
    ["Sprint Qualifying", 4],
    ["Sprint Shootout", 4],
    ["Sprint", 5],
    ["Qualifying", 6],
    ["Race", 7]
  ]);
  const groupOrder = new Map([
    ["Practice", 1],
    ["Qualifying", 2],
    ["Race", 3],
    ["Other", 4]
  ]);

  function getSessionGroupLabel(sessionName) {
    const normalizedName = String(sessionName ?? "").toLowerCase();

    if (normalizedName.includes("practice")) {
      return "Practice";
    }

    if (normalizedName.includes("qualifying") || normalizedName.includes("shootout")) {
      return "Qualifying";
    }

    if (normalizedName.includes("race") || normalizedName.includes("sprint")) {
      return "Race";
    }

    return "Other";
  }

  return [...sessionNames]
    .sort((left, right) => {
      const leftRank = sessionOrder.get(left) ?? 99;
      const rightRank = sessionOrder.get(right) ?? 99;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.localeCompare(right);
    })
    .map((sessionName) => {
      const group = getSessionGroupLabel(sessionName);

      return {
        value: sessionName,
        label: `${group}: ${sessionName}`,
        group
      };
    })
    .sort((left, right) => {
      const leftRank = groupOrder.get(left.group) ?? 99;
      const rightRank = groupOrder.get(right.group) ?? 99;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftSessionRank = sessionOrder.get(left.value) ?? 99;
      const rightSessionRank = sessionOrder.get(right.value) ?? 99;

      if (leftSessionRank !== rightSessionRank) {
        return leftSessionRank - rightSessionRank;
      }

      return left.value.localeCompare(right.value);
    });
}

function buildLapChartModel(laps) {
  const validLaps = laps.filter((lap) => lap.lap_duration_seconds !== null);
  if (validLaps.length < 2) {
    return null;
  }

  const values = validLaps.map((lap) => Number(lap.lap_duration_seconds));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const width = 640;
  const height = 220;
  const leftPadding = 18;
  const rightPadding = 18;
  const topPadding = 18;
  const bottomPadding = 18;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;
  const midValue = minValue + (maxValue - minValue) / 2;

  const points = validLaps.map((lap, index) => {
    const x =
      validLaps.length === 1
        ? leftPadding + chartWidth / 2
        : leftPadding + (index / (validLaps.length - 1)) * chartWidth;
    const ratio =
      maxValue === minValue
        ? 0.5
        : (Number(lap.lap_duration_seconds) - minValue) / (maxValue - minValue);
    const y = topPadding + chartHeight - ratio * chartHeight;

    return {
      lapNumber: lap.lap_number,
      value: Number(lap.lap_duration_seconds),
      x,
      y
    };
  });

  const path = points
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");

  return {
    width,
    height,
    leftPadding,
    topPadding,
    chartWidth,
    chartHeight,
    path,
    points,
    minValue,
    midValue,
    maxValue,
    minLapNumber: points[0]?.lapNumber,
    maxLapNumber: points.at(-1)?.lapNumber
  };
}

export default function App() {
  const [sessionKey, setSessionKey] = useState(DEFAULT_SESSION_KEY);
  const [searchFilters, setSearchFilters] = useState(DEFAULT_SEARCH);
  const [searchResults, setSearchResults] = useState([]);
  const [yearOptions, setYearOptions] = useState(FALLBACK_YEAR_OPTIONS);
  const [trackOptions, setTrackOptions] = useState([]);
  const [sessionOptions, setSessionOptions] = useState([]);
  const [sessionImportsEnabled, setSessionImportsEnabled] = useState(true);
  const [isImportingSession, setIsImportingSession] = useState(false);
  const [healthStatus, setHealthStatus] = useState("Checking API");
  const [sessionOverview, setSessionOverview] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [sessionStints, setSessionStints] = useState([]);
  const [sessionResults, setSessionResults] = useState([]);
  const [selectedDriverLaps, setSelectedDriverLaps] = useState([]);
  const [selectedStintNumber, setSelectedStintNumber] = useState(null);
  const [latestWeather, setLatestWeather] = useState(null);
  const [raceControlEvents, setRaceControlEvents] = useState([]);
  const [hoveredLapPoint, setHoveredLapPoint] = useState(null);
  const [raceControlOpen, setRaceControlOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedDriverColor = formatTeamColor(selectedDriver?.team_colour);
  const selectedDriverName = formatDriverLabel(selectedDriver);
  const leader = leaderboard[0] ?? null;
  const sessionFormat = getSessionFormat(sessionOverview?.session_type);
  const isQualifying = sessionFormat === "qualifying";
  const isRace = sessionFormat === "race";
  const selectedDriverStints = sessionStints.filter(
    (stint) => stint.driver_number === selectedDriver?.driver_number
  );
  const stintCountByDriver = sessionStints.reduce((counts, stint) => {
    counts[stint.driver_number] = (counts[stint.driver_number] ?? 0) + 1;
    return counts;
  }, {});
  const selectedStint =
    selectedDriverStints.find((stint) => stint.stint_number === selectedStintNumber) ?? null;
  const selectedDriverResult =
    sessionResults.find((result) => result.driver_number === selectedDriver?.driver_number) ?? null;
  const selectedDriverGap = selectedDriver
    ? formatGapFromLeader(selectedDriver.fastest_lap_seconds, leader?.fastest_lap_seconds)
    : "--";
  const selectedDriverStintCount = selectedDriver
    ? formatNumber(stintCountByDriver[selectedDriver.driver_number])
    : "--";
  const selectedDriverRaceRank = selectedDriverResult?.finishing_position ?? "--";
  const displayedLaps = selectedStint
    ? selectedDriverLaps.filter((lap) => {
        return (
          lap.lap_number >= selectedStint.first_lap_number &&
          lap.lap_number <= selectedStint.last_lap_number
        );
      })
    : selectedDriverLaps;
  const lapChart = buildLapChartModel(displayedLaps);
  const qualifyingCutoffDriver = leaderboard[Math.min(9, Math.max(leaderboard.length - 1, 0))] ?? null;
  const qualifyingCutoffGap = qualifyingCutoffDriver
    ? formatGapFromLeader(
        qualifyingCutoffDriver.fastest_lap_seconds,
        leader?.fastest_lap_seconds
      )
    : "--";
  const selectedDriverPhaseStatus = getQualifyingPhaseStatus(selectedDriverResult?.duration_value);
  const raceWinner = sessionResults[0] ?? null;
  const biggestGainer = getBiggestGainer(sessionResults);
  const selectedTrackMetadata =
    trackOptions.find((track) => track.name === searchFilters.track) ?? null;
  const circuitLayout = selectedTrackMetadata?.layoutUrl
    ? {
        url: selectedTrackMetadata.layoutUrl,
        alt: selectedTrackMetadata.layoutAlt ?? `${selectedTrackMetadata.name} track layout`
      }
    : null;
  const hasActiveSession = Boolean(sessionKey);

  useEffect(() => {
    let cancelled = false;

    async function loadMetadata() {
      try {
        const payload = await fetchTrackMetadata();
        if (cancelled) {
          return;
        }

        setYearOptions(payload.years ?? []);
        setSessionImportsEnabled(payload.capabilities?.sessionImportsEnabled ?? true);
      } catch {
        if (!cancelled) {
          setYearOptions(FALLBACK_YEAR_OPTIONS);
          setSessionImportsEnabled(true);
        }
      }
    }

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!searchFilters.year) {
      setTrackOptions([]);
      setSessionOptions([]);
      setSearchResults([]);
      setSearchFilters((current) => {
        if (!current.track && !current.format) {
          return current;
        }

        return {
          ...current,
          track: "",
          format: ""
        };
      });
      return;
    }

    let cancelled = false;

    async function loadTrackOptions() {
      try {
        const payload = await fetchTrackMetadata(searchFilters.year);
        if (cancelled) {
          return;
        }

        const resolvedTracks = payload.tracks ?? [];
        setSessionImportsEnabled(payload.capabilities?.sessionImportsEnabled ?? true);
        setTrackOptions(resolvedTracks);
        setSearchResults([]);
        setSearchFilters((current) => {
          const nextTrack = resolvedTracks.some((track) => track.name === current.track)
            ? current.track
            : "";
          const nextFormat = nextTrack === current.track ? current.format : "";

          if (nextTrack === current.track && nextFormat === current.format) {
            return current;
          }

          return {
            ...current,
            track: nextTrack,
            format: nextFormat
          };
        });
      } catch {
        if (!cancelled) {
          setTrackOptions([]);
          setSessionOptions([]);
          setSearchResults([]);
          setSearchFilters((current) => {
            if (!current.track && !current.format) {
              return current;
            }

            return {
              ...current,
              track: "",
              format: ""
            };
          });
        }
      }
    }

    void loadTrackOptions();

    return () => {
      cancelled = true;
    };
  }, [searchFilters.year]);

  useEffect(() => {
    if (!searchFilters.year || !searchFilters.track) {
      setSessionOptions([]);
      return;
    }

    let cancelled = false;

    async function loadSessionOptions() {
      try {
        const localPayload = await searchSessions(searchFilters.year, searchFilters.track, "");
        let remoteSessions = [];

        if (sessionImportsEnabled) {
          try {
            const remotePayload = await discoverSessions(searchFilters.year, searchFilters.track, "");
            remoteSessions = remotePayload.sessions;
          } catch {
            remoteSessions = [];
          }
        }

        const sessions = [...localPayload.sessions, ...remoteSessions];

        if (cancelled) {
          return;
        }

        const nextOptions = buildSessionOptions(
          Array.from(
            new Set(
              sessions
                .map((session) => session.session_name ?? session.session_type)
                .filter(Boolean)
            )
          )
        );

        const resolvedOptions = nextOptions;
        const resolvedValues = resolvedOptions.map((option) => option.value);
        setSessionOptions(resolvedOptions);
        setSearchFilters((current) => ({
          ...current,
          format: resolvedValues.includes(current.format) ? current.format : ""
        }));
      } catch {
        if (!cancelled) {
          setSessionOptions([]);
          setSearchFilters((current) => ({
            ...current,
            format: current.format || ""
          }));
        }
      }
    }

    void loadSessionOptions();

    return () => {
      cancelled = true;
    };
  }, [searchFilters.year, searchFilters.track, sessionImportsEnabled]);

  useEffect(() => {
    if (!sessionKey) {
      setIsLoading(false);
      setError("");
      setSessionOverview(null);
      setLeaderboard([]);
      setDrivers([]);
      setSessionStints([]);
      setSessionResults([]);
      setLatestWeather(null);
      setRaceControlEvents([]);
      setSelectedDriver(null);
      setSelectedDriverLaps([]);
      setSelectedStintNumber(null);
      setHoveredLapPoint(null);
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [
          health,
          overviewPayload,
          leaderboardPayload,
          driversPayload,
          stintsPayload,
          resultsPayload,
          weatherPayload,
          raceControlPayload
        ] =
          await Promise.all([
            fetchHealth(),
            fetchSessionOverview(sessionKey),
            fetchLeaderboard(sessionKey),
            fetchDrivers(sessionKey),
            fetchSessionStints(sessionKey),
            fetchSessionResults(sessionKey),
            fetchLatestWeather(sessionKey),
            fetchRaceControl(sessionKey)
          ]);

        if (cancelled) {
          return;
        }

        setHealthStatus(health.status);
        setSessionOverview(overviewPayload);
        setLeaderboard(leaderboardPayload.leaderboard);
        setDrivers(driversPayload.drivers);
        setSessionStints(stintsPayload.stints);
        setSessionResults(resultsPayload.results);
        setLatestWeather(weatherPayload);
        setRaceControlEvents(raceControlPayload.events);

        const topDriver = leaderboardPayload.leaderboard[0]?.driver_number;
        if (topDriver) {
          const [driverPayload, lapsPayload] = await Promise.all([
            fetchDriver(sessionKey, topDriver),
            fetchDriverLaps(sessionKey, topDriver)
          ]);
          if (!cancelled) {
            setSelectedDriver(driverPayload);
            setSelectedDriverLaps(lapsPayload.laps);
            setSelectedStintNumber(null);
            setHoveredLapPoint(null);
          }
        } else {
          setSelectedDriver(null);
          setSelectedDriverLaps([]);
          setSelectedStintNumber(null);
          setHoveredLapPoint(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setLeaderboard([]);
          setDrivers([]);
          setSessionOverview(null);
          setSessionStints([]);
          setSessionResults([]);
          setLatestWeather(null);
          setRaceControlEvents([]);
          setSelectedDriver(null);
          setSelectedDriverLaps([]);
          setSelectedStintNumber(null);
          setHoveredLapPoint(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  async function handleDriverSelect(driverNumber) {
    try {
      const [driverPayload, lapsPayload] = await Promise.all([
        fetchDriver(sessionKey, driverNumber),
        fetchDriverLaps(sessionKey, driverNumber)
      ]);
      setSelectedDriver(driverPayload);
      setSelectedDriverLaps(lapsPayload.laps);
      setSelectedStintNumber(null);
      setHoveredLapPoint(null);
    } catch (driverError) {
      setError(driverError.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!searchFilters.track.trim() || !searchFilters.year.trim() || !searchFilters.format.trim()) {
      return;
    }

    try {
      setError("");
      const localPayload = await searchSessions(
        searchFilters.year.trim(),
        searchFilters.track.trim(),
        searchFilters.format
      );
      if (localPayload.sessions.length > 0) {
        setSearchResults(localPayload.sessions);

        if (localPayload.sessions[0]) {
          setSessionKey(String(localPayload.sessions[0].session_key));
        }
        return;
      }

      if (!sessionImportsEnabled) {
        setSearchResults([]);
        setError("This deployment only loads sessions that have already been synced locally.");
        return;
      }

      const remotePayload = await discoverSessions(
        searchFilters.year.trim(),
        searchFilters.track.trim(),
        searchFilters.format
      );
      setSearchResults(remotePayload.sessions);
    } catch (searchError) {
      setSearchResults([]);
      setError(searchError.message);
    }
  }

  async function handleSessionPick(result) {
    try {
      setError("");
      if (result.source === "remote") {
        if (!sessionImportsEnabled) {
          throw new Error("Session imports are disabled in this deployment.");
        }
        setIsImportingSession(true);
        await importSession(result.session_key);
      }

      setSessionKey(String(result.session_key));
    } catch (sessionError) {
      setError(sessionError.message);
    } finally {
      setIsImportingSession(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="backdrop backdrop-one" />
      <div className="backdrop backdrop-two" />
      <main className="dashboard">
        <header className="hero">
          <div>
            <p className="eyebrow">OpenF1 Analytics Platform</p>
            <h1>Formula 1 session analytics, surfaced through your own stack.</h1>
            <p className="hero-copy">
              React frontend, Express API, PostgreSQL analytics tables, and Python
              ingestion running against live OpenF1 session data.
            </p>
            {sessionOverview ? (
              <p className="hero-copy">
                {sessionOverview.session_name ?? "Session"} at{" "}
                {sessionOverview.circuit_short_name ?? sessionOverview.location ?? "Unknown circuit"}
                {sessionOverview.country_name ? `, ${sessionOverview.country_name}` : ""}
              </p>
            ) : null}
          </div>
          <div className="status-panel">
            <span className={`status-dot ${healthStatus === "ok" ? "online" : "offline"}`} />
            <div>
              <p className="status-label">API status</p>
              <strong>{healthStatus}</strong>
            </div>
          </div>
        </header>

        <section className="controls-card">
          <form className="session-form" onSubmit={handleSubmit}>
            <label htmlFor="track">Season lookup</label>
            <div className="session-input-row">
              <select
                className="session-year-input"
                value={searchFilters.year}
                onChange={(event) =>
                  setSearchFilters((current) => ({
                    ...current,
                    year: event.target.value,
                    track: "",
                    format: ""
                  }))
                }
              >
                <option value="">Select year</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                id="track"
                value={searchFilters.track}
                onChange={(event) =>
                  setSearchFilters((current) => ({
                    ...current,
                    track: event.target.value,
                    format: ""
                  }))
                }
                disabled={!searchFilters.year}
              >
                <option value="">{searchFilters.year ? "Select track" : "Select year first"}</option>
                {trackOptions.map((track) => (
                  <option key={track.key} value={track.name}>
                    {track.name}
                  </option>
                ))}
              </select>
              <select
                className="session-format-select"
                value={searchFilters.format}
                onChange={(event) =>
                  setSearchFilters((current) => ({
                    ...current,
                    format: event.target.value
                  }))
                }
                disabled={!searchFilters.track}
              >
                <option value="">{searchFilters.track ? "Select session" : "Select track first"}</option>
                {sessionOptions.map((sessionOption) => (
                  <option key={sessionOption.value} value={sessionOption.value}>
                    {sessionOption.label}
                  </option>
                ))}
              </select>
              <button type="submit">Load session</button>
            </div>
          </form>
          <div className="session-meta">
            <span>Current session</span>
            <strong>
              {isImportingSession
                ? "Importing session..."
                : sessionOverview?.session_name
                ? `${sessionOverview.session_name} (${sessionKey})`
                : "No session loaded"}
            </strong>
            <small className="session-mode-note">
              {sessionImportsEnabled
                ? "Remote imports enabled"
                : "Local sessions only in this deployment"}
            </small>
          </div>
        </section>

        {searchResults.length > 0 ? (
          <section className="search-results">
            {searchResults.map((result) => (
              <button
                key={result.session_key}
                type="button"
                className={`search-result-chip ${
                  String(result.session_key) === sessionKey ? "active-search-result" : ""
                }`}
                onClick={() => void handleSessionPick(result)}
              >
                <strong>{result.session_name}</strong>
                <span>
                  {result.circuit_short_name ?? result.location ?? result.country_name} ·{" "}
                  {String(result.date_start).slice(0, 10)}
                </span>
                <span>{result.source === "remote" ? "Import from OpenF1" : "Available locally"}</span>
              </button>
            ))}
          </section>
        ) : null}

        {error ? <section className="error-banner">{error}</section> : null}

        {!hasActiveSession ? (
          <section className="empty-state empty-dashboard-state">
            Select a year, track, and session to load a weekend view.
          </section>
        ) : null}

        {hasActiveSession && sessionOverview ? (
          <section className="session-banner">
            <div className="session-banner-copy">
              <span className="session-tag">{sessionOverview.session_type ?? "Session"}</span>
              <h2>{sessionOverview.session_name ?? `Session ${sessionKey}`}</h2>
              <p>
                {sessionOverview.location ?? "Unknown location"}
                {sessionOverview.country_name ? `, ${sessionOverview.country_name}` : ""}
              </p>
            </div>
            <div className="session-chips">
              <div className="session-chip">
                <span>Circuit</span>
                <strong>{sessionOverview.circuit_short_name ?? "--"}</strong>
              </div>
              {isRace ? (
                <div className="session-chip">
                  <span>Total laps</span>
                  <strong>{formatNumber(sessionOverview.total_laps)}</strong>
                </div>
              ) : null}
              {!isRace ? (
                <div className="session-chip">
                  <span>Session best</span>
                  <strong>{formatLapTime(sessionOverview.fastest_lap_seconds)}</strong>
                </div>
              ) : null}
              <div className="session-chip session-chip-weather">
                <span>Weather</span>
                {latestWeather ? (
                  <>
                    <strong>{formatNumber(latestWeather.air_temperature)} C air</strong>
                    <small>
                      {formatNumber(latestWeather.track_temperature)} C track -{" "}
                      {formatNumber(latestWeather.humidity)}% humidity
                    </small>
                  </>
                ) : (
                  <small>No weather data</small>
                )}
              </div>
            </div>
            {circuitLayout ? (
              <div className="session-layout-card">
                <span>Track layout</span>
                <img
                  className="session-layout-image"
                  src={circuitLayout.url}
                  alt={circuitLayout.alt}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {hasActiveSession ? (
          <section className={`summary-grid ${isQualifying || isRace ? "summary-grid-expanded" : ""}`}>
          {isQualifying ? (
            <>
              <article className="metric-card">
                <span className="metric-label">Classified drivers</span>
                <strong>{leaderboard.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">Pole time</span>
                <strong>{formatLapTime(leader?.fastest_lap_seconds)}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">Pole sitter</span>
                <strong>{leader ? formatDriverLabel(leader) : "--"}</strong>
                <p className="metric-subtext">{leader?.team_name ?? "No team loaded"}</p>
              </article>
              <article className="metric-card">
                <span className="metric-label">Top 10 cutoff</span>
                <strong>{qualifyingCutoffGap}</strong>
                <p className="metric-subtext">
                  {qualifyingCutoffDriver ? formatDriverLabel(qualifyingCutoffDriver) : "No cutoff data"}
                </p>
              </article>
            </>
          ) : isRace ? (
            <>
              <article className="metric-card">
                <span className="metric-label">Winner</span>
                <strong>{raceWinner ? formatDriverLabel(raceWinner) : "--"}</strong>
                <p className="metric-subtext">{raceWinner?.team_name ?? "No result loaded"}</p>
              </article>
              <article className="metric-card">
                <span className="metric-label">Winning margin</span>
                <strong>{sessionResults[1] ? getResultGapDisplay(sessionResults[1]) : "Leader"}</strong>
                <p className="metric-subtext">
                  {sessionResults[1] ? `over ${formatDriverLabel(sessionResults[1])}` : "No runner-up loaded"}
                </p>
              </article>
              <article className="metric-card">
                <span className="metric-label">Fastest lap</span>
                <strong>{formatLapTime(leader?.fastest_lap_seconds)}</strong>
                <p className="metric-subtext">
                  {leader ? formatDriverLabel(leader) : "No fastest lap loaded"}
                </p>
              </article>
              <article className="metric-card">
                <span className="metric-label">Biggest gain</span>
                <strong>{biggestGainer ? formatPositionDelta(biggestGainer.position_delta) : "--"}</strong>
                <p className="metric-subtext">
                  {biggestGainer ? formatDriverLabel(biggestGainer) : "No grid delta data"}
                </p>
              </article>
            </>
          ) : (
            <>
              <article className="metric-card">
                <span className="metric-label">Drivers tracked</span>
                <strong>{drivers.length}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">Fastest lap</span>
                <strong>{formatLapTime(leaderboard[0]?.fastest_lap_seconds)}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">Leaderboard leader</span>
                <strong>{leader ? formatDriverLabel(leader) : "--"}</strong>
                <p className="metric-subtext">{leader?.team_name ?? "No team loaded"}</p>
              </article>
            </>
          )}
          </section>
        ) : null}

        {hasActiveSession ? (
          <section className="context-grid context-grid-single">
          <article className="panel collapsible-panel">
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setRaceControlOpen((value) => !value)}
            >
              <span className="collapse-copy">
                <h2>Race Control</h2>
                <small>{raceControlEvents.length} recent events</small>
              </span>
              <span className="collapse-icon">{raceControlOpen ? "Hide" : "Show"}</span>
            </button>
            {raceControlOpen ? (
              raceControlEvents.length > 0 ? (
                <div className="event-feed">
                  {raceControlEvents.map((event) => (
                    <article key={`${event.date}-${event.category}-${event.message}`} className="event-card">
                      <div className="event-card-header">
                        <strong>{event.category}</strong>
                        <span>{event.full_name ?? event.name_acronym ?? event.date}</span>
                      </div>
                      <p>{event.message}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact-state">No race control events available.</div>
              )
            ) : null}
          </article>
          </section>
        ) : null}

        {hasActiveSession ? (
          <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <h2>{isQualifying ? "Qualifying Order" : isRace ? "Race Classification" : "Leaderboard"}</h2>
              <span>
                {isLoading
                  ? "Refreshing"
                  : `${isRace ? sessionResults.length : leaderboard.length} drivers`}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  {isQualifying ? (
                    <tr>
                      <th>Pos</th>
                      <th>Driver</th>
                      <th>Q1</th>
                      <th>Q2</th>
                      <th>Q3</th>
                      <th>Gap</th>
                      <th>Runs</th>
                    </tr>
                  ) : isRace ? (
                    <tr>
                      <th>Pos</th>
                      <th>Driver</th>
                      <th>Grid</th>
                      <th>Delta</th>
                      <th>Result</th>
                      <th>Gap</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Rank</th>
                      <th>Driver</th>
                      <th>Fastest</th>
                      <th>Gap</th>
                      <th>Valid laps</th>
                      <th>Stints</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {(isRace ? sessionResults : leaderboard).map((row) => (
                    <tr
                      key={row.driver_number}
                      onClick={() => void handleDriverSelect(row.driver_number)}
                      className={
                        selectedDriver?.driver_number === row.driver_number ? "active-row" : ""
                      }
                      style={{
                        "--row-accent": formatTeamColor(
                          row.team_colour ??
                            drivers.find((driver) => driver.driver_number === row.driver_number)?.team_colour
                        )
                      }}
                    >
                      <td>{isRace ? row.finishing_position : row.lap_rank}</td>
                      <td>
                        <div className="driver-cell-name">{formatDriverLabel(row)}</div>
                        <small>{row.team_name ?? `#${row.driver_number}`}</small>
                      </td>
                      {isQualifying ? (
                        <>
                          <td>
                            {formatLapTime(
                              getQualifyingPhaseTime(
                                sessionResults.find((result) => result.driver_number === row.driver_number)
                                  ?.duration_value,
                                0
                              )
                            )}
                          </td>
                          <td>
                            {formatLapTime(
                              getQualifyingPhaseTime(
                                sessionResults.find((result) => result.driver_number === row.driver_number)
                                  ?.duration_value,
                                1
                              )
                            )}
                          </td>
                          <td>
                            {formatLapTime(
                              getQualifyingPhaseTime(
                                sessionResults.find((result) => result.driver_number === row.driver_number)
                                  ?.duration_value,
                                2
                              )
                            )}
                          </td>
                          <td>{formatGapFromLeader(row.fastest_lap_seconds, leader?.fastest_lap_seconds)}</td>
                          <td>{formatNumber(stintCountByDriver[row.driver_number])}</td>
                        </>
                      ) : isRace ? (
                        <>
                          <td>{formatNumber(row.grid_position)}</td>
                          <td>{formatPositionDelta(row.position_delta)}</td>
                          <td>{getRaceClassificationStatus(row)}</td>
                          <td>{getResultGapDisplay(row)}</td>
                        </>
                      ) : (
                        <>
                          <td>{formatLapTime(row.fastest_lap_seconds)}</td>
                          <td>{formatGapFromLeader(row.fastest_lap_seconds, leader?.fastest_lap_seconds)}</td>
                          <td>{row.valid_laps}</td>
                          <td>{formatNumber(stintCountByDriver[row.driver_number])}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel driver-panel">
            <div className="panel-heading">
              <h2>Driver focus</h2>
              <span>{selectedDriver ? selectedDriver.team_name : "Select a driver"}</span>
            </div>
            {selectedDriver ? (
              <div className="driver-stats">
                <div
                  className="driver-highlight"
                  style={{ "--driver-accent": selectedDriverColor }}
                >
                  <div className="driver-highlight-copy">
                    <span className="driver-highlight-team">
                      {selectedDriver.team_name ?? "Unknown team"}
                    </span>
                    <div className="driver-highlight-name">{selectedDriverName}</div>
                    <div className="driver-highlight-meta">
                      <span>#{selectedDriver.driver_number}</span>
                      <span>
                        {isRace ? getResultGapDisplay(selectedDriverResult) : `${selectedDriverGap} to session best`}
                      </span>
                      <span>{selectedDriverStintCount} {isQualifying ? "runs" : "stints"}</span>
                      {isQualifying ? <span>{selectedDriverPhaseStatus}</span> : null}
                    </div>
                  </div>
                  <span>Rank {isRace ? formatNumber(selectedDriverRaceRank) : formatNumber(selectedDriver.lap_rank)}</span>
                  {selectedDriver.headshot_url ? (
                    <img
                      className="driver-headshot"
                      src={selectedDriver.headshot_url}
                      alt={selectedDriverName}
                    />
                  ) : null}
                </div>
                <div className="driver-grid">
                  {isRace ? (
                    <div>
                      <span>Finish position</span>
                      <strong>{formatNumber(selectedDriverResult?.finishing_position)}</strong>
                    </div>
                  ) : null}
                  {isRace ? (
                    <div>
                      <span>Grid position</span>
                      <strong>{formatNumber(selectedDriverResult?.grid_position)}</strong>
                    </div>
                  ) : null}
                  {isQualifying ? (
                    <div>
                      <span>Q1</span>
                      <strong>
                        {formatLapTime(getQualifyingPhaseTime(selectedDriverResult?.duration_value, 0))}
                      </strong>
                    </div>
                  ) : null}
                  {isQualifying ? (
                    <div>
                      <span>Q2</span>
                      <strong>
                        {formatLapTime(getQualifyingPhaseTime(selectedDriverResult?.duration_value, 1))}
                      </strong>
                    </div>
                  ) : null}
                  {isQualifying ? (
                    <div>
                      <span>Q3</span>
                      <strong>
                        {formatLapTime(getQualifyingPhaseTime(selectedDriverResult?.duration_value, 2))}
                      </strong>
                    </div>
                  ) : null}
                  {isQualifying ? (
                    <div>
                      <span>Qualifying position</span>
                      <strong>{formatNumber(selectedDriver.lap_rank)}</strong>
                    </div>
                  ) : null}
                  {isQualifying ? (
                    <div>
                      <span>Gap to pole</span>
                      <strong>{selectedDriverGap}</strong>
                    </div>
                  ) : null}
                  <div>
                    <span>Fastest lap</span>
                    <strong>{formatLapTime(selectedDriver.fastest_lap_seconds)}</strong>
                  </div>
                  {!isRace && !isQualifying ? (
                    <div>
                      <span>Total laps</span>
                      <strong>{formatNumber(selectedDriver.total_laps)}</strong>
                    </div>
                  ) : null}
                  {!isRace && !isQualifying ? (
                    <div>
                      <span>Valid laps</span>
                      <strong>{formatNumber(selectedDriver.valid_laps)}</strong>
                    </div>
                  ) : null}
                  {!isQualifying ? (
                    <div>
                      <span>Pit-out laps</span>
                      <strong>{formatNumber(selectedDriver.total_pit_out_laps)}</strong>
                    </div>
                  ) : null}
                  {isQualifying ? (
                    <div>
                      <span>Run count</span>
                      <strong>{selectedDriverStintCount}</strong>
                    </div>
                  ) : null}
                  {isRace ? (
                    <div>
                      <span>Position delta</span>
                      <strong>{formatPositionDelta(selectedDriverResult?.position_delta)}</strong>
                    </div>
                  ) : null}
                </div>

                <div className="subpanel">
                  <div className="panel-heading">
                    <h2>{isQualifying ? "Run Progression" : "Lap Trend"}</h2>
                    <span>
                      {selectedStint
                        ? `${isQualifying ? "Run" : "Stint"} ${selectedStint.stint_number} - ${displayedLaps.length} laps`
                        : `${displayedLaps.length} laps loaded`}
                    </span>
                  </div>
                  {lapChart ? (
                    <div className="chart-shell">
                      <svg
                        className="lap-chart"
                        viewBox={`0 0 ${lapChart.width} ${lapChart.height}`}
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-label={`Lap duration trend for ${selectedDriverName}`}
                      >
                        <line
                          x1={lapChart.leftPadding}
                          y1={lapChart.topPadding + lapChart.chartHeight}
                          x2={lapChart.leftPadding + lapChart.chartWidth}
                          y2={lapChart.topPadding + lapChart.chartHeight}
                          className="chart-axis"
                        />
                        <path
                          d={lapChart.path}
                          fill="none"
                          stroke={selectedDriverColor}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {lapChart.points.map((point) => (
                          <g key={point.lapNumber}>
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="3.5"
                              fill={selectedDriverColor}
                            />
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="12"
                              fill="transparent"
                              className="chart-hit-area"
                              onMouseEnter={() => setHoveredLapPoint(point)}
                              onMouseLeave={() => setHoveredLapPoint((current) => {
                                return current?.lapNumber === point.lapNumber ? null : current;
                              })}
                            />
                          </g>
                        ))}
                      </svg>
                      {hoveredLapPoint ? (
                        <div
                          className="chart-tooltip chart-tooltip-floating"
                          style={{
                            left: `${(hoveredLapPoint.x / lapChart.width) * 100}%`,
                            top: `${(hoveredLapPoint.y / lapChart.height) * 100}%`
                          }}
                        >
                          <strong>{`Lap ${hoveredLapPoint.lapNumber}`}</strong>
                          <span>{formatLapTime(hoveredLapPoint.value)}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="empty-state compact-state">Not enough valid laps to draw a trend.</div>
                  )}
                </div>

                <div className="subpanel">
                  <div className="panel-heading">
                    <h2>{isQualifying ? "Runs" : "Stints"}</h2>
                    <span>
                      {selectedStint
                        ? `${isQualifying ? "Run" : "Stint"} ${selectedStint.stint_number} selected`
                        : `${selectedDriverStints.length} ${isQualifying ? "runs" : "stint groups"}`}
                    </span>
                  </div>
                  <div className="stint-grid">
                    {selectedDriverStints.map((stint) => (
                      <button
                        type="button"
                        key={`${stint.driver_number}-${stint.stint_number}`}
                        className={`stint-card ${
                          selectedStintNumber === stint.stint_number ? "active-stint-card" : ""
                        }`}
                        onClick={() => {
                          setSelectedStintNumber((current) => {
                            return current === stint.stint_number ? null : stint.stint_number;
                          });
                          setHoveredLapPoint(null);
                        }}
                        style={{
                          "--stint-accent": getTyreCompoundColor(stint.tyre_compound),
                          "--stint-accent-soft": getTyreCompoundShade(stint.tyre_compound)
                        }}
                      >
                        <span>{isQualifying ? "Run" : "Stint"} {stint.stint_number}</span>
                        <strong>{formatLapTime(stint.fastest_lap_seconds)}</strong>
                        <p>{formatTyreLabel(stint.tyre_compound)}</p>
                        <div className="stint-meta">
                          <span>Valid laps</span>
                          <strong>{formatLapCount(stint)}</strong>
                        </div>
                        <div className="stint-meta">
                          <span>Tyre age</span>
                          <strong>
                            {stint.tyre_age_at_start ?? 0}
                          </strong>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">No driver selected.</div>
            )}
          </article>
          </section>
        ) : null}
      </main>
    </div>
  );
}
