const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

async function request(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error?.message ?? "Request failed";
    throw new Error(message);
  }

  return payload;
}

async function requestWithOptions(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error?.message ?? "Request failed";
    throw new Error(message);
  }

  return payload;
}

export function fetchHealth() {
  return request("/health");
}

export function fetchTrackMetadata(year = "") {
  const params = new URLSearchParams();
  if (year) {
    params.set("year", String(year));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request(`/metadata/tracks${suffix}`);
}

export function searchSessions(year, track, format = "") {
  const params = new URLSearchParams({
    year: String(year),
    track
  });

  if (format) {
    params.set("format", format);
  }

  return request(`/sessions/search?${params.toString()}`);
}

export function discoverSessions(year, track, format = "") {
  const params = new URLSearchParams({
    year: String(year),
    track
  });

  if (format) {
    params.set("format", format);
  }

  return request(`/sessions/discover?${params.toString()}`);
}

export function importSession(sessionKey) {
  return requestWithOptions(`/sessions/${sessionKey}/import`, {
    method: "POST"
  });
}

export function fetchSessionOverview(sessionKey) {
  return request(`/sessions/${sessionKey}/overview`);
}

export function fetchLeaderboard(sessionKey) {
  return request(`/sessions/${sessionKey}/leaderboard`);
}

export function fetchDrivers(sessionKey) {
  return request(`/sessions/${sessionKey}/drivers`);
}

export function fetchDriver(sessionKey, driverNumber) {
  return request(`/sessions/${sessionKey}/drivers/${driverNumber}`);
}

export function fetchSessionStints(sessionKey) {
  return request(`/sessions/${sessionKey}/stints`);
}

export function fetchSessionResults(sessionKey) {
  return request(`/sessions/${sessionKey}/results`);
}

export function fetchDriverLaps(sessionKey, driverNumber) {
  return request(`/sessions/${sessionKey}/drivers/${driverNumber}/laps`);
}

export function fetchLatestWeather(sessionKey) {
  return request(`/sessions/${sessionKey}/weather/latest`);
}

export function fetchRaceControl(sessionKey, limit = 8) {
  return request(`/sessions/${sessionKey}/race-control?limit=${limit}`);
}
