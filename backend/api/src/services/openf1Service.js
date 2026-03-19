import { config } from "../config.js";
import { findTrackMetadata } from "../data/tracks.js";

function buildSessionsUrl({ year, track, format }) {
  const params = new URLSearchParams({
    year: String(year)
  });

  if (format) {
    params.set("session_name", format);
  }

  return `${config.openf1BaseUrl}/sessions?${params.toString()}`;
}

export async function fetchSeasonSessions({ year, format = null }) {
  const response = await fetch(buildSessionsUrl({ year, track: null, format }));
  if (!response.ok) {
    throw new Error(`OpenF1 session lookup failed with status ${response.status}`);
  }

  return response.json();
}

async function fetchSessionsByCountry({ year, track, format }) {
  const response = await fetch(buildSessionsUrl({ year, track, format }));
  if (!response.ok) {
    throw new Error(`OpenF1 session lookup failed with status ${response.status}`);
  }

  return response.json();
}

export async function discoverSessions({ year, track, format }) {
  const metadata = findTrackMetadata(track);
  const countryMatches = await fetchSessionsByCountry({
    year,
    track: metadata?.countryName ?? track,
    format
  });
  const searchTerms = (metadata?.aliases ?? [track]).map((value) => value.toLowerCase());

  const filtered = countryMatches.filter((session) => {
    const haystacks = [
      session.country_name,
      session.circuit_short_name,
      session.location,
      session.session_name
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return searchTerms.some((term) => haystacks.some((value) => value.includes(term)));
  });

  return filtered
    .sort((left, right) => String(right.date_start).localeCompare(String(left.date_start)))
    .map((session) => ({
      ...session,
      source: "remote"
    }));
}
