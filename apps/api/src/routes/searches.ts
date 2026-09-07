import { Router } from "express";

import {
  listRecentSearches,
  recordRecentSearch,
} from "../services/recentSearches";

export const searchesRouter = Router();

searchesRouter.get("/recent", async (_req, res, next) => {
  try {
    const searches = await listRecentSearches();
    res.status(200).json({ searches });
  } catch (error) {
    next(error);
  }
});

searchesRouter.post("/recent", async (req, res, next) => {
  try {
    const search = await recordRecentSearch(req.body?.query);
    res.status(200).json({ search });
  } catch (error) {
    next(error);
  }
});
