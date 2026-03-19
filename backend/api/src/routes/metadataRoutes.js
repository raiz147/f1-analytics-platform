import { Router } from "express";

import { fetchTrackMetadata } from "../services/metadataService.js";
import { asyncHandler, parseIntegerParam } from "../utils/http.js";

const router = Router();

router.get(
  "/tracks",
  asyncHandler(async (request, response) => {
    const year = request.query.year ? parseIntegerParam(request.query.year, "year") : null;
    const payload = await fetchTrackMetadata({ year });
    response.json(payload);
  })
);

export default router;
