import { Router } from "express";

import { getDemoUser } from "../services/demoUser";

export const userRouter = Router();

userRouter.get("/", async (_req, res, next) => {
  try {
    const user = await getDemoUser();
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});
