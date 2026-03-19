import { buildTrackOptionsFromSessions } from "../data/tracks.js";
import { config } from "../config.js";
import { listSeasonSessions } from "../repositories/sessionRepository.js";
import { fetchSeasonSessions } from "./openf1Service.js";

const MIN_SUPPORTED_YEAR = 2023;

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];

  for (let year = MIN_SUPPORTED_YEAR; year <= currentYear; year += 1) {
    years.push(String(year));
  }

  return years;
}

export async function fetchTrackMetadata({ year = null } = {}) {
  const years = buildYearOptions();
  const capabilities = {
    sessionImportsEnabled: config.enableSessionImports
  };

  if (!year) {
    return {
      years,
      tracks: [],
      capabilities
    };
  }

  const localSessions = await listSeasonSessions(year);
  let remoteSessions = [];

  try {
    remoteSessions = await fetchSeasonSessions({ year });
  } catch {
    remoteSessions = [];
  }

  const tracks = buildTrackOptionsFromSessions([...localSessions, ...remoteSessions]);

  return {
    years,
    tracks,
    capabilities
  };
}
