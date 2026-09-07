import express, { Router } from "express";

import { AppError } from "../errors/AppError";
import { handleStripeWebhook } from "../services/stripeWebhooks";

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        throw new AppError(
          400,
          "STRIPE_SIGNATURE_INVALID",
          "Invalid Stripe webhook signature.",
        );
      }

      const result = await handleStripeWebhook({
        rawBody: req.body,
        signature: req.headers["stripe-signature"],
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
);
