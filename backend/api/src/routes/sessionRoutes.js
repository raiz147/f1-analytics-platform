import { Router } from "express";

import {
  discoverRemoteSessions,
  fetchDriverLapDetails,
  fetchDriverSessionPerformance,
  fetchLatestSessionWeather,
  fetchRecentRaceControl,
  findSessions,
  fetchSessionDrivers,
  fetchSessionLeaderboard,
  fetchSessionOverview,
  fetchSessionResults,
  fetchSessionStints
} from "../services/sessionService.js";
import { importSessionData } from "../services/ingestionService.js";
import { asyncHandler, parseIntegerParam } from "../utils/http.js";

const router = Router();

router.get(
  "/search",
  asyncHandler(async (request, response) => {
    const year = parseIntegerParam(request.query.year, "year");
    const track = String(request.query.track ?? "").trim();
    const format = request.query.format ? String(request.query.format).trim() : "";

    if (!track) {
      const error = new Error("track is required");
      error.statusCode = 400;
      throw error;
    }

    const payload = await findSessions({
      year,
      track,
      format: format || null
    });
    response.json(payload);
  })
);

router.get(
  "/discover",
  asyncHandler(async (request, response) => {
    const year = parseIntegerParam(request.query.year, "year");
    const track = String(request.query.track ?? "").trim();
    const format = request.query.format ? String(request.query.format).trim() : "";

    if (!track) {
      const error = new Error("track is required");
      error.statusCode = 400;
      throw error;
    }

    const payload = await discoverRemoteSessions({
      year,
      track,
      format: format || null
    });
    response.json(payload);
  })
);

router.post(
  "/:sessionKey/import",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const payload = await importSessionData(sessionKey);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/overview",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const payload = await fetchSessionOverview(sessionKey);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/leaderboard",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const payload = await fetchSessionLeaderboard(sessionKey);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/weather/latest",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const payload = await fetchLatestSessionWeather(sessionKey);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/drivers",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const payload = await fetchSessionDrivers(sessionKey);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/race-control",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const limit = request.query.limit ? parseIntegerParam(request.query.limit, "limit") : 8;
    const payload = await fetchRecentRaceControl(sessionKey, limit);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/stints",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const payload = await fetchSessionStints(sessionKey);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/results",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const payload = await fetchSessionResults(sessionKey);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/drivers/:driverNumber",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const driverNumber = parseIntegerParam(request.params.driverNumber, "driverNumber");
    const payload = await fetchDriverSessionPerformance(sessionKey, driverNumber);
    response.json(payload);
  })
);

router.get(
  "/:sessionKey/drivers/:driverNumber/laps",
  asyncHandler(async (request, response) => {
    const sessionKey = parseIntegerParam(request.params.sessionKey, "sessionKey");
    const driverNumber = parseIntegerParam(request.params.driverNumber, "driverNumber");
    const payload = await fetchDriverLapDetails(sessionKey, driverNumber);
    response.json(payload);
  })
);

export default router;
