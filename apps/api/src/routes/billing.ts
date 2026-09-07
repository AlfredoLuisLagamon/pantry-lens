import { Router } from "express";

import { createCheckoutSession } from "../services/billing";

export const billingRouter = Router();

billingRouter.post("/checkout", async (_req, res, next) => {
  try {
    const session = await createCheckoutSession();
    res.status(200).json(session);
  } catch (error) {
    next(error);
  }
});
