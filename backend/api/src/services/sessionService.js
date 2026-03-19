import {
  getDriverSessionPerformance,
  getDriverLapDetails,
  getLatestSessionWeather,
  getRecentRaceControl,
  searchSessions,
  getSessionDrivers,
  getSessionLeaderboard,
  getSessionOverview,
  getSessionResults,
  getSessionStints
} from "../repositories/sessionRepository.js";
import { discoverSessions } from "./openf1Service.js";

function createNotFoundError(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

export async function fetchSessionLeaderboard(sessionKey) {
  const rows = await getSessionLeaderboard(sessionKey);
  if (rows.length === 0) {
    throw createNotFoundError(`No leaderboard data found for session ${sessionKey}`);
  }

  return {
    sessionKey,
    leaderboard: rows
  };
}

export async function findSessions({ year, track, format }) {
  const rows = await searchSessions({ year, track, format });
  return {
    sessions: rows.map((row) => ({
      ...row,
      source: "local"
    }))
  };
}

export async function discoverRemoteSessions({ year, track, format }) {
  const rows = await discoverSessions({ year, track, format });
  if (rows.length === 0) {
    throw createNotFoundError(
      `No remote sessions found for year ${year}, track ${track}${format ? `, format ${format}` : ""}`
    );
  }

  return {
    sessions: rows
  };
}

export async function fetchSessionOverview(sessionKey) {
  const row = await getSessionOverview(sessionKey);
  if (!row) {
    throw createNotFoundError(`No overview data found for session ${sessionKey}`);
  }

  return row;
}

export async function fetchSessionDrivers(sessionKey) {
  const rows = await getSessionDrivers(sessionKey);
  if (rows.length === 0) {
    throw createNotFoundError(`No driver summary data found for session ${sessionKey}`);
  }

  return {
    sessionKey,
    drivers: rows
  };
}

export async function fetchDriverSessionPerformance(sessionKey, driverNumber) {
  const row = await getDriverSessionPerformance(sessionKey, driverNumber);
  if (!row) {
    throw createNotFoundError(
      `No performance data found for session ${sessionKey} and driver ${driverNumber}`
    );
  }

  return row;
}

export async function fetchSessionStints(sessionKey) {
  const rows = await getSessionStints(sessionKey);
  if (rows.length === 0) {
    throw createNotFoundError(`No stint data found for session ${sessionKey}`);
  }

  return {
    sessionKey,
    stints: rows
  };
}

export async function fetchSessionResults(sessionKey) {
  const rows = await getSessionResults(sessionKey);
  if (rows.length === 0) {
    throw createNotFoundError(`No classification data found for session ${sessionKey}`);
  }

  return {
    sessionKey,
    results: rows
  };
}

export async function fetchDriverLapDetails(sessionKey, driverNumber) {
  const rows = await getDriverLapDetails(sessionKey, driverNumber);
  if (rows.length === 0) {
    throw createNotFoundError(
      `No lap detail found for session ${sessionKey} and driver ${driverNumber}`
    );
  }

  return {
    sessionKey,
    driverNumber,
    laps: rows
  };
}

export async function fetchLatestSessionWeather(sessionKey) {
  const row = await getLatestSessionWeather(sessionKey);
  if (!row) {
    throw createNotFoundError(`No weather data found for session ${sessionKey}`);
  }

  return row;
}

export async function fetchRecentRaceControl(sessionKey, limit) {
  const rows = await getRecentRaceControl(sessionKey, limit);
  if (rows.length === 0) {
    throw createNotFoundError(`No race control data found for session ${sessionKey}`);
  }

  return {
    sessionKey,
    events: rows
  };
}
